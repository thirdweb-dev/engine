import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";

import { getContractInstance } from "../../../../../../core/index";
import {
  erc721ContractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";

// INPUTS
const requestSchema = erc721ContractParamSchema;
const querystringSchema = Type.Object({
  wallet_address: Type.String({
    description: "Address of the wallet to check NFT balance",
    examples: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  }),
});

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Optional(Type.String()),
});

responseSchema.example = {
  result: "1",
};

// LOGIC
export async function erc721BalanceOf(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain_name_or_id/:contract_address/erc721/balanceOf",
    schema: {
      description: "Check the balance Of the wallet address",
      tags: ["ERC721"],
      operationId: "erc721_balanceOf",
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
      const contract = await getContractInstance(
        chain_name_or_id,
        contract_address,
      );
      const returnData = await contract.erc721.balanceOf(wallet_address);
      reply.status(StatusCodes.OK).send({
        result: returnData.toString(),
      });
    },
  });
}
