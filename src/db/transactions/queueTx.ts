import type { DeployTransaction, Transaction } from "@thirdweb-dev/sdk";
import { ERC4337EthersSigner } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/erc4337-signer";
import { BigNumber } from "ethers";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import type { ContractExtension } from "../../schema/extension";
import { PrismaTransaction } from "../../schema/prisma";
import { rawRequestQueue } from "../client";
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

const RedisTxQueueParams = (() =>
  z.object({
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
    chain: z.string().describe("Chain ID or name"),
    contractAddress: z.string().describe("Contract address on the chain"),
    walletAddress: z.string().describe("Wallet address"),
    accountAddress: z.string().optional(),
    extension: z.string(),
  }))();
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

export const queueTxToRedis = async (tx: RedisTxInput): Promise<string> => {
  const uuid = uuidv4();
  rawRequestQueue.add(uuid, { ...tx, uuid });

  const redisClient = await rawRequestQueue.client;
  await redisClient.hmset(uuid, tx);
  return uuid;
};
