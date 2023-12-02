import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getAllTxsByWallet } from "../../../db/transactions/getAllTxsByWallet";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { transactionResponseSchema } from "../../schemas/transaction";
import { walletParamSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const ParamsSchema = walletParamSchema;

const ReplySchema = Type.Object({
  result: Type.Object({
    transactions: Type.Array(transactionResponseSchema),
  }),
});

export async function getAllTransactions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/backend-wallet/:chain/:walletAddress/get-all-transactions",
    schema: {
      summary: "Get all transactions",
      description: "Get all transactions for a backend wallet.",
      tags: ["Backend Wallet"],
      operationId: "getAllTransactions",
      params: ParamsSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { chain, walletAddress } = req.params;
      const chainId = await getChainIdFromChain(chain);
      const transactions = await getAllTxsByWallet({ walletAddress, chainId });

      res.status(StatusCodes.OK).send({
        result: {
          transactions,
        },
      });
    },
  });
}
