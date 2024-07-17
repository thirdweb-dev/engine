import {
  Address,
  Hex,
  defineChain,
  getContract,
  prepareContractCall,
  readContract,
  resolveMethod,
} from "thirdweb";
import {
  UserOperation,
  createUnsignedUserOp,
  getPaymasterAndData,
  signUserOp,
} from "thirdweb/wallets/smart";
import { getAccount } from "../account";
import { getSmartWalletV5 } from "../cache/getSmartWalletV5";
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
  } = queuedTransaction;

  if (
    !from ||
    !accountAddress ||
    !signerAddress ||
    !target ||
    !functionName ||
    !functionArgs
  ) {
    throw new Error("Invalid UserOperation parameters");
  }

  const chain = defineChain(chainId);

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
  const preparedTransaction = prepareContractCall({
    contract: targetContract,
    method: resolveMethod(functionName),
    params: functionArgs,
    value,
  });

  // Change this with resolvePromisedValue
  const toAddress =
    typeof preparedTransaction.to === "function"
      ? await preparedTransaction.to()
      : preparedTransaction.to;
  const txValue =
    typeof preparedTransaction.value === "function"
      ? await preparedTransaction.value()
      : preparedTransaction.value;
  const txData =
    typeof preparedTransaction.data === "function"
      ? await preparedTransaction.data()
      : preparedTransaction.data;

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

export const isUserOperation = (
  queuedTransaction: QueuedTransaction,
): boolean => {
  const { from, accountAddress, signerAddress, target, functionName } =
    queuedTransaction;

  return Boolean(
    from && accountAddress && signerAddress && target && functionName,
  );
};
