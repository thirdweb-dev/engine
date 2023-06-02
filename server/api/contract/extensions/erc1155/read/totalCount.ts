import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstace } from "../../../../../../core";
import {
  erc1155ContractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";

// INPUT
const requestSchema = erc1155ContractParamSchema;

// OUPUT
const responseSchema = Type.Object({
  result: Type.Optional(Type.String()),
});

responseSchema.examples = [
  {
    result: "1",
  },
];

// LOGIC
export async function erc1155TotalCount(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain_name_or_id/:contract_address/erc1155/totalCount",
    schema: {
      description: "Get the total number of NFTs minted.",
      tags: ["ERC1155"],
      operationId: "erc1155_totalCount",
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
      const returnData = await contract.erc1155.totalCount();
      reply.status(StatusCodes.OK).send({
        result: returnData.toString(),
      });
    },
  });
}
