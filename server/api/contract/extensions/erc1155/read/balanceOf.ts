import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";

import { Static, Type } from "@sinclair/typebox";
import {
  erc1155ContractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

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
    url: "/contract/:network/:contract_address/erc1155/balance-of",
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
      const { network, contract_address } = request.params;
      const { wallet_address, token_id } = request.query;
      const chainId = getChainIdFromChain(network);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
      });
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
