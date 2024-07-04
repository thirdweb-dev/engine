import type { DeployTransaction, Transaction } from "@thirdweb-dev/sdk";
import type { ContractExtension } from "../../schema/extension";
import { PrismaTransaction } from "../../schema/prisma";

interface QueueTxParams {
  pgtx?: PrismaTransaction;
  tx: Transaction<any> | DeployTransaction;
  chainId: number;
  extension: ContractExtension;
  // TODO: These shouldn't be in here
  deployedContractAddress?: string;
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
  pgtx,
  tx,
  chainId,
  extension,
  deployedContractAddress,
  deployedContractType,
  simulateTx,
  idempotencyKey,
  txOverrides,
}: QueueTxParams) => {
  throw new Error("@TODO: Unimplemented.");

  // TODO: We need a much safer way of detecting if the transaction should be a user operation
  // const isUserOp = !!(tx.getSigner as ERC4337EthersSigner).erc4337provider;
  // const txData = {
  //   chainId: chainId.toString(),
  //   functionName: tx.getMethod(),
  //   functionArgs: JSON.stringify(tx.getArgs()),
  //   extension,
  //   deployedContractAddress: deployedContractAddress,
  //   deployedContractType: deployedContractType,
  //   data: tx.encode(),
  //   value: BigNumber.from(await tx.getValue()).toHexString(),
  //   ...txOverrides,
  // };

  // if (isUserOp) {
  //   const signerAddress = await (
  //     tx.getSigner as ERC4337EthersSigner
  //   ).originalSigner.getAddress();
  //   const accountAddress = await tx.getSignerAddress();
  //   const target = tx.getTarget();

  //   const { queueId } = await queueTxRaw({
  //     pgtx,
  //     ...txData,
  //     signerAddress,
  //     accountAddress,
  //     target,
  //     simulateTx,
  //     idempotencyKey,
  //   });

  //   return queueId;
  // } else {
  //   const fromAddress = await tx.getSignerAddress();
  //   const toAddress =
  //     tx.getTarget() === "0x0000000000000000000000000000000000000000" &&
  //     txData.functionName === "deploy" &&
  //     extension === "deploy-published"
  //       ? null
  //       : tx.getTarget();

  //   const { queueId } = await queueTxRaw({
  //     pgtx,
  //     ...txData,
  //     fromAddress,
  //     toAddress,
  //     simulateTx,
  //     idempotencyKey,
  //   });

  //   return queueId;
  // }
};
