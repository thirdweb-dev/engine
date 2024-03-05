import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";

import { Static, Type } from "@sinclair/typebox";
import { balanceOf } from "thirdweb/extensions/erc1155";
import { getContractV5 } from "../../../../../../utils/cache/getContractV5";
import {
  erc1155ContractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUTS
const requestSchema = erc1155ContractParamSchema;
const querystringSchema = Type.Object({
  walletAddress: Type.String({
    description: "Address of the wallet to check NFT balance",
    examples: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  }),
  tokenId: Type.String({
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
    url: "/contract/:chain/:contractAddress/erc1155/balance-of",
    schema: {
      summary: "Get balance",
      description:
        "Get the balance of a specific wallet address for this ERC-1155 contract.",
      tags: ["ERC1155"],
      operationId: "balanceOf",
      params: requestSchema,
      querystring: querystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { walletAddress, tokenId } = request.query;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContractV5({
        chainId,
        contractAddress,
      });

      const balance = await balanceOf({
        contract,
        owner: walletAddress,
        id: BigInt(tokenId),
      });
      reply.status(StatusCodes.OK).send({
        result: balance.toString(),
      });
    },
  });
}
