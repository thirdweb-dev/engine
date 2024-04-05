import { Static } from "@sinclair/typebox";
import { PrismaTransaction } from "../../schema/prisma";
import {
  toTransactionResponse,
  transactionResponseSchema,
} from "../../server/schemas/transaction";
import { getPrismaWithPostgresTx } from "../client";

interface GetTxByIdParams {
  queueId: string;
  pgtx?: PrismaTransaction;
}

/**
 * @deprecated - Call prisma directly.
 */
export const getTxById = async ({
  pgtx,
  queueId,
}: GetTxByIdParams): Promise<Static<
  typeof transactionResponseSchema
> | null> => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  const tx = await prisma.transactions.findUnique({
    where: {
      id: queueId,
    },
  });
  return tx ? toTransactionResponse(tx) : null;
};
