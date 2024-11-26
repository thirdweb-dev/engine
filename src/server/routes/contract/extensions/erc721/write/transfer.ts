import { type Static, Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract } from "thirdweb";
import { transferFrom } from "thirdweb/extensions/erc721";
import { getChain } from "../../../../../../utils/chain";
import { getChecksumAddress } from "../../../../../../utils/primitiveTypes";
import { thirdwebClient } from "../../../../../../utils/sdk";
import { queueTransaction } from "../../../../../../utils/transaction/queueTransation";
import { AddressSchema } from "../../../../../schemas/address";
import { NumberStringSchema } from "../../../../../schemas/number";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../../../schemas/txOverrides";
import { walletWithAAHeaderSchema } from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";

const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  to: {
    ...AddressSchema,
    description: "The recipient address.",
  },
  tokenId: {
    ...NumberStringSchema,
    description: "The token ID to transfer.",
  },
  ...txOverridesWithValueSchema.properties,
});

requestBodySchema.examples = [
  {
    to: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    tokenId: "0",
  },
];

export async function erc721transfer(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc721/transfer",
    schema: {
      summary: "Transfer token",
      description: "Transfer an ERC-721 token from the caller wallet.",
      tags: ["ERC721"],
      operationId: "erc721-transfer",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletWithAAHeaderSchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const { to, tokenId, txOverrides } = request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
        "x-account-factory-address": accountFactoryAddress,
        "x-account-salt": accountSalt,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        client: thirdwebClient,
        chain: await getChain(chainId),
        address: contractAddress,
      });

      const transaction = transferFrom({
        contract,
        from: getChecksumAddress(walletAddress),
        to: getChecksumAddress(to),
        tokenId: BigInt(tokenId),
      });

      const queueId = await queueTransaction({
        transaction,
        fromAddress: getChecksumAddress(walletAddress),
        toAddress: getChecksumAddress(contractAddress),
        accountAddress: getChecksumAddress(accountAddress),
        accountFactoryAddress: getChecksumAddress(accountFactoryAddress),
        accountSalt,
        txOverrides,
        idempotencyKey,
        shouldSimulate: simulateTx,
        functionName: "transferFrom",
        extension: "erc721",
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
