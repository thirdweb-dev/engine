import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../db/client";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../utils/chain";

const requestBodySchema = Type.Object({
  name: Type.Optional(Type.String()),
  chain: Type.String(),
  backendWalletAddress: Type.String({
    description:
      "The address of the backend wallet to use for relaying transactions.",
  }),
  allowedContracts: Type.Optional(
    Type.Array(
      Type.String({
        minLength: 42,
        maxLength: 42,
      }),
    ),
  ),
  allowedForwarders: Type.Optional(
    Type.Array(
      Type.String({
        minLength: 42,
        maxLength: 42,
      }),
    ),
  ),
});

requestBodySchema.examples = [
  {
    name: "My relayer",
    chain: "mainnet",
    backendWalletAddress: "0",
    allowedContracts: ["0x1234...."],
    allowedForwarders: ["0x1234..."],
  },
];

const responseBodySchema = Type.Object({
  result: Type.Object({
    relayerId: Type.String(),
  }),
});

export async function createRelayer(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/relayer/create",
    schema: {
      summary: "Create a new meta-transaction relayer",
      description: "Create a new meta-transaction relayer",
      tags: ["Relayer"],
      operationId: "create",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      const {
        name,
        chain,
        backendWalletAddress,
        allowedContracts,
        allowedForwarders,
      } = req.body;

      const chainId = (await getChainIdFromChain(chain)).toString();
      const relayer = await prisma.relayers.create({
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

      return res.status(200).send({
        result: {
          relayerId: relayer.id,
        },
      });
    },
  });
}
