import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../db/client";
import { getChainIdFromChain } from "../../utils/chain";

const BodySchema = Type.Object({
  id: Type.String(),
  name: Type.Optional(Type.String()),
  chain: Type.Optional(Type.String()),
  backendWalletAddress: Type.Optional(Type.String()),
  allowedContracts: Type.Optional(Type.Array(Type.String())),
  allowedForwarders: Type.Optional(Type.Array(Type.String())),
});

const ReplySchema = Type.Object({
  result: Type.Object({
    success: Type.Boolean(),
  }),
});

export async function updateRelayer(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/relayer/update",
    schema: {
      summary: "Update a relayer",
      description: "Update a relayer",
      tags: ["Relayer"],
      operationId: "update",
      body: BodySchema,
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const {
        id,
        name,
        chain,
        backendWalletAddress,
        allowedContracts,
        allowedForwarders,
      } = req.body;

      const chainId = chain
        ? (await getChainIdFromChain(chain)).toString()
        : undefined;
      await prisma.relayers.update({
        where: {
          id,
        },
        data: {
          name,
          chainId,
          backendWalletAddress,
          allowedContracts: allowedContracts
            ? JSON.stringify(
                allowedContracts.map((address) => address.toLowerCase()),
              )
            : null,
          allowedForwarders: allowedForwarders
            ? JSON.stringify(
                allowedForwarders.map((address) => address.toLowerCase()),
              )
            : null,
        },
      });

      res.status(200).send({
        result: {
          success: true,
        },
      });
    },
  });
}
