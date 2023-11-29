import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../db/client";
import { getChainIdFromChain } from "../../utils/chain";

const BodySchema = Type.Object({
  id: Type.String(),
  name: Type.Optional(Type.String()),
  chain: Type.String(),
  backendWalletAddress: Type.String(),
  entrypointAddress: Type.String(),
});

const ReplySchema = Type.Object({
  result: Type.Object({
    success: Type.Boolean(),
  }),
});

export async function updateBundler(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof BodySchema>;
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "POST",
    url: "/bundler/update",
    schema: {
      summary: "Update a bundler",
      description: "Update a bundler",
      tags: ["Bundler"],
      operationId: "update",
      body: BodySchema,
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { id, name, chain, backendWalletAddress, entrypointAddress } =
        req.body;

      const chainId = (await getChainIdFromChain(chain)).toString();
      await prisma.bundlers.update({
        where: {
          id,
        },
        data: {
          name,
          chainId,
          backendWalletAddress,
          entrypointAddress,
        },
      });

      res.send({
        result: {
          success: true,
        },
      });
    },
  });
}
