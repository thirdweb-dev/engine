import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../db/client";
import { getChainIdFromChain } from "../../utils/chain";

const BodySchema = Type.Object({
  name: Type.Optional(Type.String()),
  chain: Type.String(),
  backendWalletAddress: Type.String({
    description:
      "The address of the backend wallet to use for bundling user operations.",
  }),
  entrypointAddress: Type.String(),
});

const ReplySchema = Type.Object({
  result: Type.Object({
    bundlerId: Type.String(),
  }),
});

export async function createBundler(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
    Body: Static<typeof BodySchema>;
  }>({
    method: "POST",
    url: "/bundler/create",
    schema: {
      summary: "Create a new bundler",
      description: "Create a new bundler",
      tags: ["Bundler"],
      operationId: "create",
      body: BodySchema,
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const { name, chain, backendWalletAddress, entrypointAddress } = req.body;

      const chainId = (await getChainIdFromChain(chain)).toString();
      const bundler = await prisma.bundlers.create({
        data: {
          name,
          chainId,
          backendWalletAddress,
          entrypointAddress,
        },
      });

      res.send({
        result: {
          bundlerId: bundler.id,
        },
      });
    },
  });
}
