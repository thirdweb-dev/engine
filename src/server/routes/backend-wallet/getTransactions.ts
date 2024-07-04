import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { TransactionSchema } from "../../schemas/transaction";
import { walletParamSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const ParamsSchema = walletParamSchema;

const responseBodySchema = Type.Object({
  result: Type.Object({
    transactions: Type.Array(TransactionSchema),
  }),
});

export async function getAllTransactions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Reply: Static<typeof responseBodySchema>;
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
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const { chain, walletAddress } = req.params;
      const chainId = await getChainIdFromChain(chain);

      // @TODO: implement
      const transactions: Static<typeof TransactionSchema>[] = [];

      res.status(StatusCodes.OK).send({
        result: {
          transactions,
        },
      });
    },
  });
}
