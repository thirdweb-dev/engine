import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { resolveContractAbi } from "thirdweb/contract";
import { Abi, AbiFunction } from "thirdweb/utils";
import { getContractV5 } from "../../../../utils/cache/getContractv5";
import { AbiFunctionSchema } from "../../../schemas/contract/abi";
import {
  contractParamSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../utils/chain";

const requestSchema = contractParamSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Array(AbiFunctionSchema),
});

responseSchema.example = {
  result: [
    {
      name: "balanceOf",
      inputs: [
        {
          type: "address",
          name: "owner",
        },
      ],
      outputs: [
        {
          type: "uint256",
          name: "",
        },
      ],
      comment: "See {IERC721-balanceOf}.",
      signature:
        'contract.call("balanceOf", owner: string): Promise<BigNumber>',
      stateMutability: "view",
    },
    {
      name: "burn",
      inputs: [
        {
          type: "uint256",
          name: "tokenId",
        },
      ],
      outputs: [],
      comment: "Burns `tokenId`. See {ERC721-_burn}.",
      signature:
        'contract.call("burn", tokenId: BigNumberish): Promise<TransactionResult>',
      stateMutability: "nonpayable",
    },
  ],
};

export async function extractFunctions(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
  }>({
    method: "GET",
    url: "/contract/:chain/:contractAddress/metadata/functions",
    schema: {
      summary: "Get functions",
      description: "Get details of all functions implemented by the contract.",
      tags: ["Contract-Metadata"],
      operationId: "getFunctions",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContractV5({
        chainId,
        contractAddress,
      });

      const abi: Abi = await resolveContractAbi(contract);
      const functions = abi.filter(
        (abiItem): abiItem is AbiFunction => abiItem.type === "function",
      );

      reply.status(StatusCodes.OK).send({
        result: functions,
      });
    },
  });
}
