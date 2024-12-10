import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract, type Hex } from "thirdweb";
import { safeTransferFrom } from "thirdweb/extensions/erc1155";
import { getChain } from "../../../../../../shared/utils/chain";
import { getChecksumAddress } from "../../../../../../shared/utils/primitive-types";
import { thirdwebClient } from "../../../../../../shared/utils/sdk";
import { queueTransaction } from "../../../../../../shared/utils/transaction/queue-transation";
import { AddressSchema, HexSchema } from "../../../../../schemas/address";
import { NumberStringSchema } from "../../../../../schemas/number";
import {
  erc1155ContractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../../../schemas/txOverrides";
import { walletWithAAHeaderSchema } from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUTS
const requestSchema = erc1155ContractParamSchema;
const requestBodySchema = Type.Object({
  to: {
    ...AddressSchema,
    description: "The recipient address.",
  },
  tokenId: Type.String({
    ...NumberStringSchema,
    description: "The token ID to transfer.",
  }),
  amount: Type.String({
    ...NumberStringSchema,
    description: "The amount of tokens to transfer.",
  }),
  data: Type.Optional(HexSchema),
  ...txOverridesWithValueSchema.properties,
});

requestBodySchema.examples = [
  {
    to: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    tokenId: "0",
    amount: "1",
  },
];

export async function erc1155transfer(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc1155/transfer",
    schema: {
      summary: "Transfer token",
      description: "Transfer an ERC-1155 token from the caller wallet.",
      tags: ["ERC1155"],
      operationId: "erc1155-transfer",
      params: requestSchema,
      headers: walletWithAAHeaderSchema,
      body: requestBodySchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const { to, tokenId, amount, data, txOverrides } = request.body;
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

      const transaction = safeTransferFrom({
        contract,
        from: getChecksumAddress(walletAddress),
        to: getChecksumAddress(to),
        tokenId: BigInt(tokenId),
        value: BigInt(amount),
        data: (data as Hex | undefined) ?? "0x",
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
        functionName: "safeTransferFrom",
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
