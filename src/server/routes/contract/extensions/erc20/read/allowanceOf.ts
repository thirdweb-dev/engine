import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "../../../../../../utils/cache/getContract";
import { erc20MetadataSchema } from "../../../../../schemas/erc20";
import {
  erc20ContractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUTS
const requestSchema = erc20ContractParamSchema;
const querystringSchema = Type.Object({
  ownerWallet: Type.String({
    description: "Address of the wallet who owns the funds",
    examples: ["0x3EcDBF3B911d0e9052b64850693888b008e18373"],
  }),
  spenderWallet: Type.String({
    description: "Address of the wallet to check token allowance",
    examples: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  }),
});

// OUTPUT
const responseSchema = Type.Object({
  result: erc20MetadataSchema,
});

responseSchema.example = {
  result: {
    name: "ERC20",
    symbol: "",
    decimals: "18",
    value: "0",
    displayValue: "0.0",
  },
};

// LOGIC
export async function erc20AllowanceOf(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof querystringSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/erc20/allowance-of",
    schema: {
      summary: "Get token allowance",
      description:
        "Get the allowance of a specific wallet for an ERC-20 contract.",
      tags: ["ERC20"],
      operationId: "erc20-allowanceOf",
      params: requestSchema,
      querystring: querystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { spenderWallet, ownerWallet } = request.query;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const returnData: any = await contract.erc20.allowanceOf(
        ownerWallet ? ownerWallet : "",
        spenderWallet ? spenderWallet : "",
      );
      reply.status(StatusCodes.OK).send({
        result: {
          name: returnData.name,
          symbol: returnData.symbol,
          decimals: returnData.decimals.toString(),
          displayValue: returnData.displayValue,
          value: returnData.value.toString(),
        },
      });
    },
  });
}
