import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../db/client";

const ReplySchema = Type.Object({
  result: Type.Array(
    Type.Object({
      id: Type.String(),
      name: Type.Union([Type.String(), Type.Null()]),
      chainId: Type.String(),
      backendWalletAddress: Type.String(),
      entrypointAddress: Type.String(),
    }),
  ),
});

export async function getAllBundlers(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/bundler/get-all",
    schema: {
      summary: "Get all bundlers",
      description: "Get all bundlers",
      tags: ["Bundler"],
      operationId: "getAll",
      response: {
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const bundlers = await prisma.bundlers.findMany();

      return res.status(200).send({
        result: bundlers,
      });
    },
  });
}
