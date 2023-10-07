import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../src/db/transactions/queueTx";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../helpers/sharedApiSchemas";
import { RoyaltySchema } from "../../../../schemas/contract";
import { walletAuthSchema } from "../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../utilities/chain";
import { getContract } from "../../../../utils/cache/getContract";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  ...RoyaltySchema.properties,
  tokenId: Type.String({
    description: "The token ID to set the royalty info for.",
  }),
});

// OUTPUT
const responseSchema = transactionWritesResponseSchema;

export async function setTokenRoyaltyInfo(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contract_address/royalty/set-token-royalty-info",
    schema: {
      summary: "Set Token Royalty Info",
      description:
        "Set the royalty recipient and fee for a particular token in the contract.",
      tags: ["Contract-Royalty"],
      operationId: "royalty_setTokenRoyaltyInfo",
      headers: walletAuthSchema,
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const { seller_fee_basis_points, fee_recipient, tokenId } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.royalties.setTokenRoyaltyInfo.prepare(tokenId, {
        seller_fee_basis_points,
        fee_recipient,
      });
      const queueId = await queueTx({ tx, chainId, extension: "none" });
      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
