import type { DeployTransaction, Transaction } from "@thirdweb-dev/sdk";
import { ERC4337EthersSigner } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/erc4337-signer";
import { Address } from "thirdweb";
import type { ContractExtension } from "../../schema/extension";
import { maybeBigInt } from "../../utils/primitiveTypes";
import { insertTransaction } from "../../utils/transaction/insertTransaction";

interface QueueTxParams {
  tx: Transaction<any> | DeployTransaction;
  chainId: number;
  extension: ContractExtension;
  // TODO: These shouldn't be in here
  deployedContractAddress?: Address;
  deployedContractType?: string;
  simulateTx?: boolean;
  idempotencyKey?: string;
  txOverrides?: {
    gas?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };
}

export const queueTx = async ({
  tx,
  chainId,
  extension,
  deployedContractAddress,
  deployedContractType,
  simulateTx,
  idempotencyKey,
  txOverrides,
}: QueueTxParams) => {
  // Transaction Details
  const functionName = tx.getMethod();
  const encodedData = tx.encode();
  const value = BigInt(await tx.getValue().toString());
  const functionArgs = tx.getArgs();
  const baseTransaction = {
    chainId,
    value,
    data: encodedData as unknown as `0x${string}`,
    functionName,
    functionArgs,
    extension,
  };

  // TODO: We need a much safer way of detecting if the transaction should be a user operation
  const isUserOp = !!(tx.getSigner as ERC4337EthersSigner).erc4337provider;

  if (isUserOp) {
    const signerAddress = (
      await (tx.getSigner as ERC4337EthersSigner).originalSigner.getAddress()
    ).toLowerCase() as Address;
    const accountAddress = (
      await tx.getSignerAddress()
    ).toLowerCase() as Address;
    const target = tx.getTarget().toLowerCase() as Address;

    const queueId = await insertTransaction({
      insertedTransaction: {
        ...baseTransaction,
        isUserOp: true,
        deployedContractAddress,
        deployedContractType,
        signerAddress,
        accountAddress,
        target,
        gas: maybeBigInt(txOverrides?.gas),
        maxFeePerGas: maybeBigInt(txOverrides?.maxFeePerGas),
        maxPriorityFeePerGas: maybeBigInt(txOverrides?.maxPriorityFeePerGas),
        from: signerAddress,
      },
      idempotencyKey,
      shouldSimulate: simulateTx,
    });

    return queueId;
  } else {
    const fromAddress = await tx.getSignerAddress();
    const toAddress =
      tx.getTarget() === "0x0000000000000000000000000000000000000000" &&
      functionName === "deploy" &&
      extension === "deploy-published"
        ? null
        : tx.getTarget();

    const queueId = await insertTransaction({
      insertedTransaction: {
        ...baseTransaction,
        isUserOp: false,
        deployedContractAddress,
        deployedContractType,
        from: fromAddress.toLowerCase() as Address,
        to: toAddress?.toLowerCase() as Address,
        gas: maybeBigInt(txOverrides?.gas),
        maxFeePerGas: maybeBigInt(txOverrides?.maxFeePerGas),
        maxPriorityFeePerGas: maybeBigInt(txOverrides?.maxPriorityFeePerGas),
      },
      idempotencyKey,
      shouldSimulate: simulateTx,
    });

    return queueId;
  }
};
