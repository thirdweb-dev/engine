import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../db/client";
import {
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../schemas/sharedApiSchemas";
import { walletAuthSchema, walletParamSchema } from "../../schemas/wallet";
import { getChainIdFromChain } from "../../utils/chain";

const ParamsSchema = Type.Omit(walletParamSchema, ["walletAddress"]);

const BodySchema = Type.Object({
  toAddress: Type.String({
    description: "Address to withdraw all funds to",
  }),
});

export async function withdraw(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof ParamsSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof BodySchema>;
  }>({
    method: "POST",
    url: "/backend-wallet/:chain/withdraw",
    schema: {
      summary: "Withdraw all funds",
      description: "Withdraw all funds from this wallet to another wallet",
      tags: ["Backend Wallet"],
      operationId: "withdraw",
      params: ParamsSchema,
      body: BodySchema,
      headers: Type.Omit(walletAuthSchema, ["x-account-address"]),
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (req, res) => {
      const { chain } = req.params;
      const { toAddress } = req.body;
      const walletAddress = req.headers["x-backend-wallet-address"] as string;

      const chainId = await getChainIdFromChain(chain);

      const { id: queueId } = await prisma.transactions.create({
        data: {
          chainId: chainId.toString(),
          extension: "withdraw",
          functionName: "transfer",
          fromAddress: walletAddress,
          toAddress,
          data: "0x",
        },
      });

      res.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
