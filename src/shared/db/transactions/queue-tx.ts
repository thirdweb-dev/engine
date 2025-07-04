import type { DeployTransaction, Transaction } from "@thirdweb-dev/sdk";
import type { ERC4337EthersSigner } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/erc4337-signer";
import { ZERO_ADDRESS, type Address } from "thirdweb";
import type { ContractExtension } from "../../schemas/extension";
import { maybeBigInt, normalizeAddress } from "../../utils/primitive-types";
import { insertTransaction } from "../../utils/transaction/insert-transaction";
import type { AnyTransaction, InsertedTransaction } from "../../utils/transaction/types";
import { parseTransactionOverrides } from "../../../server/utils/transaction-overrides";

interface QueueTxParams {
  // we should move away from Transaction type (v4 SDK)
  tx: Transaction<unknown> | DeployTransaction;
  chainId: number;
  extension: ContractExtension;
  // TODO: These shouldn't be in here
  deployedContractAddress?: Address;
  deployedContractType?: string;
  simulateTx?: boolean;
  idempotencyKey?: string;
  accountFactoryAddress?: Address;
  transactionMode?: AnyTransaction["transactionMode"];
  txOverrides?: {
    gas?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    gasFeeCeiling?: string;
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
  transactionMode
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
    ...parseTransactionOverrides(txOverrides),
  } satisfies Partial<InsertedTransaction>;

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
        transactionMode: undefined,
      },
      idempotencyKey,
      shouldSimulate: simulateTx,
    });
  }

  const isPublishedContractDeploy =
    tx.getTarget() === ZERO_ADDRESS &&
    functionName === "deploy" &&
    extension === "deploy-published";

  return await insertTransaction({
    insertedTransaction: {
      ...baseTransaction,
      isUserOp: false,
      // NOTE: v4 endpoints don't all support sponsored mode
      transactionMode,
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
};
