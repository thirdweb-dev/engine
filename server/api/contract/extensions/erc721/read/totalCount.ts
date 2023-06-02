import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstace } from "../../../../../../core/index";
import {
  standardResponseSchema,
  contractParamSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";

// INPUT
const requestSchema = contractParamSchema;

// OUPUT
const responseSchema = Type.Object({
  result: Type.Optional(Type.String()),
});

responseSchema.example = [
  {
    result: "1",
  },
];

// LOGIC
export async function erc721TotalCount(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain_name_or_id/:contract_address/erc721/totalCount",
    schema: {
      description: "Get the total number of NFTs minted.",
      tags: ["ERC721"],
      operationId: "erc721_totalCount",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const returnData = await contract.erc721.totalCount();
      reply.status(StatusCodes.OK).send({
        result: returnData.toString(),
      });
    },
  });
}
