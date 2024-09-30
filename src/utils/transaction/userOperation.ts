import {
  getAddress,
  getContract,
  prepareContractCall,
  readContract,
  type Address,
  type Hex,
} from "thirdweb";
import {
  createUnsignedUserOp,
  getPaymasterAndData,
  signUserOp,
  type UserOperation,
} from "thirdweb/wallets/smart";
import { getAccount } from "../account";
import { getChain } from "../chain";
import { thirdwebClient } from "../sdk";
import type { PopulatedTransaction, QueuedTransaction } from "./types";

export const generateSignedUserOperation = async (
  queuedTransaction: QueuedTransaction,
  populatedTransaction: PopulatedTransaction,
): Promise<UserOperation> => {
  const {
    chainId,
    gas,
    signerAddress,
    accountAddress,
    accountFactoryAddress: userProvidedAccountFactoryAddress,
    target,
    from,
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

  // use the user provided factory address if available
  let accountFactoryAddress = userProvidedAccountFactoryAddress;

  if (!accountFactoryAddress) {
    // Resolve Factory Contract Address from Smart-Account Contract
    try {
      const onchainAccountFactoryAddress = await readContract({
        contract: smartAccountContract,
        method: "function factory() view returns (address)",
        params: [],
      });

      accountFactoryAddress = getAddress(onchainAccountFactoryAddress);
    } catch {
      // if no factory address is found, throw an error
      throw new Error(
        `Failed to find factory address for account '${accountAddress}' on chain '${chainId}'`,
      );
    }
  }

  // Resolve Factory Contract
  const accountFactoryContract = getContract({
    client: thirdwebClient,
    chain,
    address: accountFactoryAddress as Address,
  });

  // Prepare UserOperation Call
  const userOpCall = prepareContractCall({
    contract: smartAccountContract,
    method: "function execute(address, uint256, bytes)",
    params: [
      populatedTransaction.to || "",
      populatedTransaction.value || 0n,
      populatedTransaction.data,
    ],
  });

  // Create Unsigned UserOperation
  // Todo: Future expose a way to skip paymaster
  const unsignedOp = (await createUnsignedUserOp({
    transaction: userOpCall,
    accountContract: smartAccountContract,
    sponsorGas: true,
    factoryContract: accountFactoryContract,
    adminAddress: signerAddress,
  })) as UserOperation; // TODO support entrypoint v0.7 accounts

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

    const paymasterAndData =
      "paymasterAndData" in paymasterResult
        ? paymasterResult.paymasterAndData
        : "0x";
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
  const signedUserOp = (await signUserOp({
    client: thirdwebClient,
    userOp: unsignedOp,
    adminAccount,
    chain,
  })) as UserOperation; // TODO support entrypoint v0.7 accounts

  // Return Signed UserOperation
  return signedUserOp;
};
