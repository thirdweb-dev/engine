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
  wallet_address: Type.String({
    description: "Address of the wallet to get NFTs for",
    examples: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  }),
});

// OUPUT
const responseSchema = Type.Object({
  result: Type.Array(nftSchema),
});

responseSchema.examples = [{
  result: [{
    "metadata": {
      "id": "1",
      "uri": "ipfs://QmciR3WLJsf2BgzTSjbG5zCxsrEQ8PqsHK7JWGWsDSNo46/nft.png",
      "name": "ERC20-Test Token II",
      "description": "ERC20-Test Token II",
      "external_url": "",
      "attributes": [
        {
          "trait_type": "type",
          "value": "<value>"
        }
      ]
    },
    "owner": "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
    "type": "ERC721",
    "supply": "1"
  }]
}];

// LOGIC
export async function erc721GetOwned(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain_name_or_id/:contract_address/erc721/getOwned",
    schema: {
      description:
        "Get all NFTs owned by a specific wallet from a given contract.",
      tags: ["ERC721"],
      operationId: "erc721_getOwned",
      params: requestSchema,
      querystring: querystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { wallet_address } = request.query;
      const contract = await getContractInstace(chain_name_or_id, contract_address);
      const result = await contract.erc721.getOwned(wallet_address);
      reply.status(StatusCodes.OK).send({
        result
      });
    },
  });
}
