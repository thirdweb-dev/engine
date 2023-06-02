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

responseSchema.examples = [
  {
    result: {
      metadata: {
        id: "2",
        uri: "ipfs://QmWDdRcLqVMzFeawADAPr2EFCzdqCzx373VpWK3Kfx25GJ/0",
        name: "My NFT",
        description: "My NFT description",
        image: "ipfs://QmciR3WLJsf2BgzTSjbG5zCxsrEQ8PqsHK7JWGWsDSNo46/nft.png",
      },
      owner: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
      type: "ERC721",
      supply: "1",
    },
  },
];

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
      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const result = await contract.erc721.get(token_id);
      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}
