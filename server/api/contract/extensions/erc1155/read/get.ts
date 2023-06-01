import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstace } from "../../../../../../core";
import {
  Static,
  Type
} from "@sinclair/typebox";
import {
  erc1155ContractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { nftSchema } from "../../../../../schemas/nft";

// INPUT
const requestSchema = erc1155ContractParamSchema;

// QUERY
const querystringSchema = Type.Object({
  token_id: Type.String({
    description: "The tokenId of the NFT to retrieve",
    examples: ["0"],
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: nftSchema,
});

responseSchema.examples = [{
  "result": {
    "metadata": {
      "id": "0",
      "uri": "ipfs://QmciR3WLJsf2BgzTSjbG5zCxsrEQ8PqsHK7JWGWsDSNo46/nft.png",
      "name": "TJ-Origin",
      "description": "Origin",
      "external_url": "",
      "attributes": [
        {
          "trait_type": "Mode",
          "value": "GOD"
        }
      ]
    },
    "owner": "0x0000000000000000000000000000000000000000",
    "type": "ERC1155",
    "supply": "600000150000000000000000000000000000000000009000000000000000000000712"
  }
}];

// LOGIC
export async function erc1155Get(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain_name_or_id/:contract_address/erc1155/get",
    schema: {
      description: "Get the metadata of a single NFT.",
      tags: ["ERC1155"],
      operationId: "erc1155_get",
      params: requestSchema,
      querystring: querystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { token_id } = request.query;
      const contract = await getContractInstace(chain_name_or_id, contract_address);
      const result = await contract.erc1155.get(token_id);
      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}
