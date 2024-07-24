import {
  Address,
  Hex,
  getContract,
  prepareContractCall,
  readContract,
  resolveMethod,
} from "thirdweb";
import { resolvePromisedValue } from "thirdweb/utils";
import {
  UserOperation,
  createUnsignedUserOp,
  getPaymasterAndData,
  signUserOp,
} from "thirdweb/wallets/smart";
import { getAccount } from "../account";
import { getSmartWalletV5 } from "../cache/getSmartWalletV5";
import { getChain } from "../chain";
import { thirdwebClient } from "../sdk";
import { QueuedTransaction } from "./types";

export const generateSignedUserOperation = async (
  queuedTransaction: QueuedTransaction,
): Promise<UserOperation> => {
  const {
    chainId,
    functionName,
    functionArgs,
    value,
    gas,
    signerAddress,
    accountAddress,
    target,
    from,
    data,
  } = queuedTransaction;

  if (!from || !accountAddress || !signerAddress || !target) {
    throw new Error("Invalid UserOperation parameters");
  }

  const chain = await getChain(chainId);

  // Resolve Target Contract
  const targetContract = getContract({
    client: thirdwebClient,
    chain,
    address: target as Address,
  });

  // Resolve Smart-Account Contract
  const smartAccountContract = getContract({
    client: thirdwebClient,
    chain,
    address: accountAddress as Address,
  });

  // Resolve Factory Contract Address from Smart-Account Contract
  const accountFactoryAddress = await readContract({
    contract: smartAccountContract,
    method: "function factory() view returns (address)",
    params: [],
  });

  // Resolve Factory Contract
  const accountFactoryContract = getContract({
    client: thirdwebClient,
    chain,
    address: accountFactoryAddress as Address,
  });

  // Prepare Transaction
  let preparedTransaction:
    | Awaited<ReturnType<typeof prepareContractCall>>
    | undefined;

  let toAddress: string | undefined;
  let txValue: bigint | undefined;
  let txData: Hex | undefined;

  // Handle UserOp Requests with FunctionName & Args
  if (functionName && functionArgs) {
    preparedTransaction = prepareContractCall({
      contract: targetContract,
      method: resolveMethod(functionName),
      params: functionArgs,
      value,
    });
    toAddress = await resolvePromisedValue(preparedTransaction.to);
    txValue = await resolvePromisedValue(preparedTransaction.value);
    txData = await resolvePromisedValue(preparedTransaction.data);
  } // Handle UserOp Requests with Data & Target
  else if (data && target) {
    toAddress = target;
    txValue = value || 0n;
    txData = data;
  } else {
    throw new Error("Invalid UserOperation parameters");
  }

  // Prepare UserOperation Call
  const userOpCall = prepareContractCall({
    contract: smartAccountContract,
    method: "function execute(address, uint256, bytes)",
    params: [toAddress || "", txValue || 0n, txData || "0x"],
  });

  // Get Smart Wallet
  const smartWallet = await getSmartWalletV5({
    from,
    chain,
    accountAddress,
  });

  // Create Unsigned UserOperation
  // Todo: Future expose a way to skip paymaster
  let unsignedOp = await createUnsignedUserOp({
    transaction: userOpCall,
    accountContract: smartAccountContract,
    sponsorGas: true,
    factoryContract: accountFactoryContract,
    adminAddress: signerAddress,
  });

  // Pass custom gas limit for UserOperation
  if (gas) {
    unsignedOp.callGasLimit = gas;
    unsignedOp.paymasterAndData = "0x";
    const DUMMY_SIGNATURE =
      "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
    unsignedOp.signature = DUMMY_SIGNATURE;
    const paymasterResult = await getPaymasterAndData({
      userOp: unsignedOp,
      chain,
      client: thirdwebClient,
    });

    const paymasterAndData = paymasterResult.paymasterAndData;
    if (paymasterAndData && paymasterAndData !== "0x") {
      unsignedOp.paymasterAndData = paymasterAndData as Hex;
    }
  }

  // Resolve Admin-Account for UserOperation Signer
  const adminAccount = await getAccount({
    chainId,
    from,
  });

  // Sign UserOperation
  const signedUserOp = await signUserOp({
    userOp: unsignedOp,
    adminAccount,
    chain,
  });

  // Return Signed UserOperation
  return signedUserOp;
};
