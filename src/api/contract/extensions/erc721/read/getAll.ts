import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getSDK } from "../../../../../../core/index";
import { Static, Type } from "@sinclair/typebox";
import {
  contractParamSchema,
  baseReplyErrorSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { nftSchema } from "../../../../../schemas/nft";

// INPUT
const requestSchema = contractParamSchema;
const querystringSchema = Type.Object({
  start: Type.Optional(
    Type.Number({
      description: "The start token id for paginated results. Defaults to 0.",
      examples: ["0"],
    }),
  ),
  count: Type.Optional(
    Type.Number({
      description: "The page count for paginated results. Defaults to 100.",
      examples: ["20"],
    }),
  ),
});

// OUPUT
const responseSchema = Type.Object({
  result: Type.Array(nftSchema),
  error: Type.Optional(baseReplyErrorSchema),
});

// LOGIC
export async function erc721GetAll(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain_name_or_id/:contract_address/erc721/getAll",
    schema: {
      description: "Get all NFTs from a given contract.",
      tags: ["ERC721"],
      operationId: "erc721_getAll",
      params: requestSchema,
      querystring: querystringSchema,
      response: {
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { start, count } = request.query;
      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);
      const result = await contract.erc721.getAll({
        start,
        count,
      });
      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}
