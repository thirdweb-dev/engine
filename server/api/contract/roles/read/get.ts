import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../helpers/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../utilities/chain";
import { getContract } from "../../../../utils/cache/getContract";

const requestSchema = contractParamSchema;
const querystringSchema = Type.Object({
  role: Type.String({
    description: "The Role to to get a memberlist for.",
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
    url: "/contract/:chain/:contract_address/roles/get",
    schema: {
      description: "Get all members of a specific role",
      tags: ["Contract-Roles"],
      operationId: "roles_getRole",
      params: requestSchema,
      querystring: querystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const { role } = request.query;

      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });

      let returnData = await contract.roles.get(role);

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
