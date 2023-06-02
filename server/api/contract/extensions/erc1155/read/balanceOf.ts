import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";

import { getContractInstace } from "../../../../../../core";
import {
  erc1155ContractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";

// INPUTS
const requestSchema = erc1155ContractParamSchema;
const querystringSchema = Type.Object({
  wallet_address: Type.String({
    description: "Address of the wallet to check NFT balance",
    examples: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  }),
  token_id: Type.String({
    description: "The tokenId of the NFT to check balance of",
    examples: ["0"],
  }),
});

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Optional(Type.String()),
});

responseSchema.examples = [
  {
    result: "1",
  },
];

// LOGIC
export async function erc1155BalanceOf(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain_name_or_id/:contract_address/erc1155/balanceOf",
    schema: {
      description: "Check the balance Of the wallet address",
      tags: ["ERC1155"],
      operationId: "erc1155_balanceOf",
      params: requestSchema,
      querystring: querystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { wallet_address, token_id } = request.query;
      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const returnData = await contract.erc1155.balanceOf(
        wallet_address,
        token_id,
      );
      reply.status(StatusCodes.OK).send({
        result: returnData.toString(),
      });
    },
  });
}
