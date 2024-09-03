import {
  Address,
  Hex,
  getAddress,
  getContract,
  prepareContractCall,
  readContract,
} from "thirdweb";
import {
  UserOperation,
  createUnsignedUserOp,
  getPaymasterAndData,
  signUserOp,
} from "thirdweb/wallets/smart";
import { getAccount } from "../account";
import { getChain } from "../chain";
import { redis } from "../redis/redis";
import { thirdwebClient } from "../sdk";
import { QueuedTransaction } from "./types";

export const generateSignedUserOperation = async (
  queuedTransaction: QueuedTransaction,
): Promise<UserOperation> => {
  const {
    chainId,
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

  // Resolve Smart-Account Contract
  const smartAccountContract = getContract({
    client: thirdwebClient,
    chain,
    address: accountAddress as Address,
  });

  let accountFactoryAddress: Address | undefined;

  try {
    const cachedFactoryAddress = await redis.get(
      `account-factory:${accountAddress.toLowerCase()}`,
    );
    accountFactoryAddress = getAddress(cachedFactoryAddress ?? "");
  } catch {}

  // Resolve Factory Contract Address from Smart-Account Contract

  if (!accountFactoryAddress) {
    const onchainFactoryResult = (await readContract({
      contract: smartAccountContract,
      method: "function factory() view returns (address)",
      params: [],
    })) as Address;
    accountFactoryAddress = onchainFactoryResult;
  }

  if (!accountFactoryAddress) {
    throw new Error(
      `Account Factory for ${accountAddress} on chain:${chainId} not found`,
    );
  }

  // Resolve Factory Contract
  const accountFactoryContract = getContract({
    client: thirdwebClient,
    chain,
    address: accountFactoryAddress as Address,
  });

  let toAddress: string | undefined;
  let txValue: bigint | undefined;
  let txData: Hex | undefined;

  // Handle UserOp Requests
  if (data && target) {
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
