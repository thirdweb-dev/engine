import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../utils/cache/getContract";
import { rolesResponseSchema } from "../../../../schemas/contract";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../utils/chain";

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
    url: "/contract/:chain/:contractAddress/roles/get-all",
    schema: {
      summary: "Get wallets for all roles",
      description: "Get all wallets in each role for a contract.",
      tags: ["Contract-Roles"],
      operationId: "listContractRoles",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });

      const returnData = (await contract.roles.getAll()) as Static<
        typeof responseSchema
      >["result"];

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
