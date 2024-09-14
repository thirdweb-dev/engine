import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Address, Hex, encode } from "thirdweb";
import { claimTo } from "thirdweb/extensions/erc721";
import { getContractV5 } from "../../../../../../utils/cache/getContractv5";
import { maybeBigInt } from "../../../../../../utils/primitiveTypes";
import { insertTransaction } from "../../../../../../utils/transaction/insertTransaction";
import { createCustomError } from "../../../../../middleware/error";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../../../schemas/txOverrides";
import { walletWithAAHeaderSchema } from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  receiver: Type.String({
    description: "Address of the wallet to claim the NFT to",
  }),
  quantity: Type.String({
    description: "Quantity of NFTs to mint",
  }),
  ...txOverridesWithValueSchema.properties,
});

requestBodySchema.examples = [
  {
    receiver: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    quantity: "1",
  },
];

export async function erc721claimTo(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc721/claim-to",
    schema: {
      summary: "Claim tokens to wallet",
      description: "Claim ERC-721 tokens to a specific wallet.",
      tags: ["ERC721"],
      operationId: "claimTo",
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
      const { receiver, quantity, txOverrides } = request.body;
      const {
        "x-backend-wallet-address": fromAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContractV5({
        chainId,
        contractAddress,
      });
      const transaction = claimTo({
        contract,
        from: fromAddress as Address,
        to: receiver,
        quantity: BigInt(quantity),
      });

      let data: Hex;
      try {
        data = await encode(transaction);
      } catch (e) {
        throw createCustomError(`${e}`, StatusCodes.BAD_REQUEST, "BAD_REQUEST");
      }

      let queueId: string;
      const insertedTransaction = {
        chainId,
        from: fromAddress as Address,
        to: contractAddress as Address | undefined,
        data,
        value: maybeBigInt(txOverrides?.value),
        gas: maybeBigInt(txOverrides?.gas),
        maxFeePerGas: maybeBigInt(txOverrides?.maxFeePerGas),
        maxPriorityFeePerGas: maybeBigInt(txOverrides?.maxPriorityFeePerGas),
      };

      if (accountAddress) {
        queueId = await insertTransaction({
          insertedTransaction: {
            ...insertedTransaction,
            isUserOp: true,
            accountAddress: accountAddress as Address,
            signerAddress: fromAddress as Address,
            target: contractAddress as Address | undefined,
          },
          shouldSimulate: simulateTx,
          idempotencyKey,
        });
      } else {
        queueId = await insertTransaction({
          insertedTransaction: {
            ...insertedTransaction,
            isUserOp: false,
          },
          shouldSimulate: simulateTx,
          idempotencyKey,
        });
      }

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
