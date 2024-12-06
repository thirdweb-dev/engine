import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../db/client";
import { AddressSchema } from "../../schemas/address";
import { chainIdOrSlugSchema } from "../../schemas/chain";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../utils/chain";

const requestBodySchema = Type.Object({
  id: Type.String(),
  name: Type.Optional(Type.String()),
  chain: Type.Optional(chainIdOrSlugSchema),
  backendWalletAddress: Type.Optional(AddressSchema),
  allowedContracts: Type.Optional(Type.Array(Type.String())),
  allowedForwarders: Type.Optional(Type.Array(Type.String())),
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    success: Type.Boolean(),
  }),
});

export async function updateRelayer(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "POST",
    url: "/relayer/update",
    schema: {
      summary: "Update a relayer",
      description: "Update a relayer",
      tags: ["Relayer"],
      operationId: "updateRelayer",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
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

      res.status(StatusCodes.OK).send({
        result: {
          success: true,
        },
      });
    },
  });
}
