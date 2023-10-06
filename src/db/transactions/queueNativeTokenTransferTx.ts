import type { ContractExtension } from "../../schema/extension";
import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface QueueNativeTokenTransferTxParams {
  pgtx?: PrismaTransaction;
  chainId: number;
  extension: ContractExtension;
  transferParams: TransferParams;
}

interface TransferParams {
  toAddress: string;
  fromAddress: string;
  value: string;
  currencyAddress?: string;
}

export const queueNativeTokenTransferTx = async ({
  pgtx,
  chainId,
  extension,
  transferParams,
}: QueueNativeTokenTransferTxParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const { id: queueId } = await prisma.transactions.create({
    data: {
      chainId,
      functionName: "transfer",
      functionArgs: JSON.stringify([
        transferParams.toAddress,
        transferParams.value,
        transferParams.currencyAddress,
      ]),
      extension,
      fromAddress: transferParams.fromAddress,
      toAddress: transferParams.toAddress,
      value: transferParams.value,
      data: "0x",
    },
  });

  return queueId;
};
