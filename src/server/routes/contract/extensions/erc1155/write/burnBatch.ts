import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../utils/cache/getContract";
import {
  erc1155ContractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { txOverrides } from "../../../../../schemas/txOverrides";
import { walletAuthSchema } from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUTS
const requestSchema = erc1155ContractParamSchema;
const requestBodySchema = Type.Object({
  tokenIds: Type.Array(
    Type.String({
      description: "The token IDs to burn",
    }),
  ),
  amounts: Type.Array(
    Type.String({
      description: "The amounts of tokens to burn",
    }),
  ),
  ...txOverrides.properties,
});

requestBodySchema.examples = [
  {
    tokenIds: ["0", "1"],
    amounts: ["1", "1"],
  },
];

// OUTPUT

export async function erc1155burnBatch(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc1155/burn-batch",
    schema: {
      summary: "Burn tokens (batch)",
      description: "Burn a batch of ERC-1155 tokens in the caller wallet.",
      tags: ["ERC1155"],
      operationId: "burnBatch",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletAuthSchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const { tokenIds, amounts } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.erc1155.burnBatch.prepare(tokenIds, amounts);
      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "erc1155",
      });
      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
