import { DeployTransaction, Transaction } from "@thirdweb-dev/sdk";
import { ERC4337EthersSigner } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/erc4337-signer";
import { BigNumber } from "ethers";
import { z } from "zod";
import type { ContractExtension } from "../../schema/extension";
import { PrismaTransaction } from "../../schema/prisma";
import { createCustomError } from "../../server/middleware/error";
import { queueTxRaw } from "./queueTxRaw";

interface QueueTxParams {
  pgtx?: PrismaTransaction;
  tx: Transaction<any> | DeployTransaction;
  chainId: number;
  extension: ContractExtension;
  // TODO: These shouldn't be in here
  deployedContractAddress?: string;
  deployedContractType?: string;
  simulateTx?: boolean;
}

const RedisTxQueueParams = z.object({
  rawRequest: z.object({
    functionName: z
      .string()
      .describe("Name of the function to call on Contract"),
    args: z.array(
      z.union([
        z.string().describe("Arguments for the function. Comma Separated"),
        z.tuple([z.string(), z.string()]),
        z.object({}),
        z.array(z.any()),
        z.any(),
      ]),
    ),
    chainId: z.number().describe("Chain ID"),
    contractAddress: z.string().describe("Contract address on the chain"),
    walletAddress: z.string().describe("Wallet address"),
    accountAddress: z.string().optional(),
    extension: z.string(),
    deployedContractAddress: z.string().optional(),
    deployedContractType: z.string().optional(),
  }),
  shouldSimulate: z.boolean().default(false),
  preparedTx: z.custom<DeployTransaction | Transaction<any>>((value) => {
    if (value instanceof DeployTransaction || value instanceof Transaction) {
      return value;
    }
    throw createCustomError("Invalid transaction type", 400, "BAD_REQUEST");
  }),
});
export type RedisTxInput = z.input<typeof RedisTxQueueParams>;

export const queueTx = async ({
  pgtx,
  tx,
  chainId,
  extension,
  deployedContractAddress,
  deployedContractType,
  simulateTx,
}: QueueTxParams) => {
  // TODO: We need a much safer way of detecting if the transaction should be a user operation
  const isUserOp = !!(tx.getSigner as ERC4337EthersSigner).erc4337provider;
  const txData = {
    chainId: chainId.toString(),
    functionName: tx.getMethod(),
    functionArgs: JSON.stringify(tx.getArgs()),
    extension,
    deployedContractAddress: deployedContractAddress,
    deployedContractType: deployedContractType,
    data: tx.encode(),
    value: BigNumber.from(await tx.getValue()).toHexString(),
  };

  if (isUserOp) {
    const signerAddress = await (
      tx.getSigner as ERC4337EthersSigner
    ).originalSigner.getAddress();
    const accountAddress = await tx.getSignerAddress();
    const target = tx.getTarget();

    const { id: queueId } = await queueTxRaw({
      pgtx,
      ...txData,
      signerAddress,
      accountAddress,
      target,
      simulateTx,
    });

    return queueId;
  } else {
    const fromAddress = await tx.getSignerAddress();
    const toAddress = tx.getTarget();

    const { id: queueId } = await queueTxRaw({
      pgtx,
      ...txData,
      fromAddress,
      toAddress,
      simulateTx,
    });

    return queueId;
  }
};

export const queueTxToRedis = async ({
  preparedTx,
  shouldSimulate,
  rawRequest,
}: RedisTxInput): Promise<string> => {
  const isUserOp = !!(preparedTx.getSigner as ERC4337EthersSigner)
    .erc4337provider;
  const txData = {
    chainId: rawRequest.chainId.toString(),
    functionName: preparedTx.getMethod(),
    functionArgs: JSON.stringify(preparedTx.getArgs()),
    extension: rawRequest.extension,
    deployedContractAddress: rawRequest.deployedContractAddress,
    deployedContractType: rawRequest.deployedContractType,
    data: preparedTx.encode(),
    value: BigNumber.from(await preparedTx.getValue()).toHexString(),
  };

  if (isUserOp) {
    const signerAddress = await (
      preparedTx.getSigner as ERC4337EthersSigner
    ).originalSigner.getAddress();
    const accountAddress = await preparedTx.getSignerAddress();
    const target = preparedTx.getTarget();

    const { id: queueId } = await queueTxRaw({
      ...txData,
      signerAddress,
      accountAddress,
      target,
      simulateTx: shouldSimulate,
    });
    return queueId;
  } else {
    const fromAddress = await preparedTx.getSignerAddress();
    const toAddress = preparedTx.getTarget();

    const { id: queueId } = await queueTxRaw({
      ...txData,
      fromAddress,
      toAddress,
      simulateTx: shouldSimulate,
    });

    return queueId;
  }
};
