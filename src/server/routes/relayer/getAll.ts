import { Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../db/client";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";

const responseBodySchema = Type.Object({
  result: Type.Array(
    Type.Object({
      id: Type.String(),
      name: Type.Union([Type.String(), Type.Null()]),
      chainId: Type.String(),
      backendWalletAddress: Type.String(),
      allowedContracts: Type.Union([Type.Array(Type.String()), Type.Null()]),
      allowedForwarders: Type.Union([Type.Array(Type.String()), Type.Null()]),
    }),
  ),
});

export async function getAllRelayers(fastify: FastifyInstance) {
  fastify.route({
    method: "GET",
    url: "/relayer/get-all",
    schema: {
      summary: "Get all meta-transaction relayers",
      description: "Get all meta-transaction relayers",
      tags: ["Relayer"],
      operationId: "getAll",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const relayers = await prisma.relayers.findMany();

      return res.status(200).send({
        result: relayers.map((relayer) => ({
          ...relayer,
          allowedContracts: relayer.allowedContracts
            ? JSON.parse(relayer.allowedContracts)
            : null,
          allowedForwarders: relayer.allowedForwarders
            ? JSON.parse(relayer.allowedForwarders)
            : null,
        })),
      });
    },
  });
}
