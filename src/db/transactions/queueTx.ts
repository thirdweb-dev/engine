import type { DeployTransaction, Transaction } from "@thirdweb-dev/sdk";
import { ERC4337EthersSigner } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/erc4337-signer";
import { Address, ZERO_ADDRESS } from "thirdweb";
import type { ContractExtension } from "../../schema/extension";
import { maybeBigInt, normalizeAddress } from "../../utils/primitiveTypes";
import { insertTransaction } from "../../utils/transaction/insertTransaction";

interface QueueTxParams {
  // we should move away from Transaction type (v4 SDK)
  tx: Transaction<any> | DeployTransaction;
  chainId: number;
  extension: ContractExtension;
  // TODO: These shouldn't be in here
  deployedContractAddress?: Address;
  deployedContractType?: string;
  simulateTx?: boolean;
  idempotencyKey?: string;
  accountFactoryAddress?: Address;
  txOverrides?: {
    gas?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    value?: string;
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
  accountFactoryAddress,
}: QueueTxParams) => {
  // Transaction Details
  const functionName = tx.getMethod();
  const encodedData = tx.encode();
  const value = maybeBigInt(
    txOverrides?.value ?? (await tx.getValue().toString()),
  );
  const functionArgs = tx.getArgs();
  const baseTransaction = {
    chainId,
    value,
    data: encodedData as unknown as `0x${string}`,
    functionName,
    functionArgs,
    extension,
    gas: maybeBigInt(txOverrides?.gas),
    maxFeePerGas: maybeBigInt(txOverrides?.maxFeePerGas),
    maxPriorityFeePerGas: maybeBigInt(txOverrides?.maxPriorityFeePerGas),
  };

  // TODO: We need a much safer way of detecting if the transaction should be a user operation
  const isUserOp = !!(tx.getSigner as ERC4337EthersSigner).erc4337provider;

  if (isUserOp) {
    const signer = (tx.getSigner as ERC4337EthersSigner).originalSigner;
    const signerAddress = normalizeAddress(await signer.getAddress());

    return await insertTransaction({
      insertedTransaction: {
        ...baseTransaction,
        isUserOp: true,
        deployedContractAddress,
        deployedContractType,
        from: signerAddress,
        signerAddress,
        accountAddress: normalizeAddress(await tx.getSignerAddress()),
        target: normalizeAddress(tx.getTarget()),
        accountFactoryAddress,
      },
      idempotencyKey,
      shouldSimulate: simulateTx,
    });
  } else {
    const isPublishedContractDeploy =
      tx.getTarget() === ZERO_ADDRESS &&
      functionName === "deploy" &&
      extension === "deploy-published";

    const queueId = await insertTransaction({
      insertedTransaction: {
        ...baseTransaction,
        isUserOp: false,
        deployedContractAddress,
        deployedContractType,
        from: normalizeAddress(await tx.getSignerAddress()),
        to: normalizeAddress(
          isPublishedContractDeploy ? undefined : tx.getTarget(),
        ),
      },
      idempotencyKey,
      shouldSimulate: simulateTx,
    });

    return queueId;
  }
};
