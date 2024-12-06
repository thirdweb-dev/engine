import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../utils/cache/getContract";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../utils/chain";

const requestSchema = contractParamSchema;
const querystringSchema = Type.Object({
  role: Type.String({
    description: "The role to list wallet members",
  }),
});

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(Type.String()),
});

responseSchema.examples = [
  {
    result: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  },
];

export async function getRoles(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/roles/get",
    schema: {
      summary: "Get wallets for role",
      description: "Get all wallets with a specific role for a contract.",
      tags: ["Contract-Roles"],
      operationId: "getContractRole",
      params: requestSchema,
      querystring: querystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { role } = request.query;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });

      let returnData = await contract.roles.get(role);

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
