import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../helpers/sharedApiSchemas";
import { rolesResponseSchema } from "../../../../schemas/contract";
import { getChainIdFromChain } from "../../../../utilities/chain";
import { getContract } from "../../../../utils/cache/getContract";

const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: rolesResponseSchema,
});

requestSchema.examples = [
  {
    result: {
      admin: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
      transfer: [
        "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
        "0x0000000000000000000000000000000000000000",
      ],
      minter: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
      pauser: [],
      lister: [],
      asset: [],
      unwrap: [],
      factory: [],
      signer: [],
    },
  },
];

export async function getAllRoles(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:network/:contract_address/roles/get-all",
    schema: {
      description: "Get all members of all roles",
      tags: ["Contract-Roles"],
      operationId: "roles_getAll",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;

      const chainId = getChainIdFromChain(network);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });

      let returnData = (await contract.roles.getAll()) as Static<
        typeof responseSchema
      >["result"];

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
