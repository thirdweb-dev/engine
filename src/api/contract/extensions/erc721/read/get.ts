import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstace } from "../../../../../../core/index";
import { Static, Type } from "@sinclair/typebox";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { nftSchema } from "../../../../../schemas/nft";

// INPUT
const requestSchema = contractParamSchema;
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
  result: {
    "metadata": {
      "id": "0",
      "uri": "<ipfs_url_if_any>",
      "name": "ERC2721-Test I",
      "description": "ERC721 Test Description",
      "external_url": "",
      "attributes": [
        {
          "trait_type": "type",
          "value": "<value>"
        }
      ]
    },
    "owner": "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    "type": "ERC721",
    "supply": "1"
  }
}];

// LOGIC
export async function erc721Get(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain_name_or_id/:contract_address/erc721/get",
    schema: {
      description: "Get the metadata of a single NFT.",
      tags: ["ERC721"],
      operationId: "erc721_get",
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
      const result = await contract.erc721.get(token_id);
      reply.status(StatusCodes.OK).send({
        result
      });
    },
  });
}
