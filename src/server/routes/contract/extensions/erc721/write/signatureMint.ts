import { type Static, Type } from "@sinclair/typebox";
import type { SignedPayload721WithQuantitySignature } from "@thirdweb-dev/sdk";
import { BigNumber } from "ethers";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { Address, Hex } from "thirdweb";
import { mintWithSignature } from "thirdweb/extensions/erc721";
import { resolvePromisedValue } from "thirdweb/utils";
import { queueTx } from "../../../../../../shared/db/transactions/queue-tx";
import { getContract } from "../../../../../../shared/utils/cache/get-contract";
import { getContractV5 } from "../../../../../../shared/utils/cache/get-contractv5";
import { insertTransaction } from "../../../../../../shared/utils/transaction/insert-transaction";
import type { thirdwebSdkVersionSchema } from "../../../../../schemas/httpHeaders/thirdwebSdkVersion";
import { signature721OutputSchema } from "../../../../../schemas/nft";
import { signature721OutputSchemaV5 } from "../../../../../schemas/nft/v5";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../../../schemas/txOverrides";
import { walletWithAAHeaderSchema } from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";
import { parseTransactionOverrides } from "../../../../../utils/transactionOverrides";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  payload: Type.Union([signature721OutputSchema, signature721OutputSchemaV5]),
  signature: Type.String(),
  ...txOverridesWithValueSchema.properties,
});

requestBodySchema.examples = [
  {
    payload: {
      uri: "ipfs://QmP1i29T534877ptz8bazU1eYiYLzQ1GRK4cnZWngsz9ud/0",
      to: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
      royaltyRecipient: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
      quantity: "1",
      royaltyBps: "0",
      primarySaleRecipient: "0x0000000000000000000000000000000000000000",
      uid: "0x3862386334363135326230303461303939626136653361643131343836373563",
      metadata: {
        name: "test tokenII",
        description: "test token",
      },
      currencyAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      price: "0",
      mintStartTime: 1686169938,
      mintEndTime: 2001529938,
    },
    signature:
      "0xe6f2e29f32f7da65385effa2ed4f39b8d3caf08b025eb0004fd4695b42ee145f2c7afdf2764f0097c9ed5d88b50e97c4c638f91289408fa7d7a0834cd707c4a41b",
  },
];

export async function erc721SignatureMint(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc721/signature/mint",
    schema: {
      summary: "Signature mint",
      description: "Mint ERC-721 tokens from a generated signature.",
      tags: ["ERC721"],
      operationId: "erc721-signatureMint",
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
      const { payload, signature, txOverrides } = request.body;
      const {
        "x-backend-wallet-address": fromAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;
      const { "x-thirdweb-sdk-version": sdkVersion } =
        request.headers as Static<typeof thirdwebSdkVersionSchema>;

      const chainId = await getChainIdFromChain(chain);

      let queueId: string;
      if (sdkVersion === "5") {
        const payloadV5 = payload as Static<typeof signature721OutputSchemaV5>;
        const contract = await getContractV5({
          chainId,
          contractAddress,
        });
        const transaction = mintWithSignature({
          contract,
          payload: {
            uri: payloadV5.uri,
            to: payloadV5.to,
            price: BigInt(payloadV5.price),
            currency: payloadV5.currency,
            primarySaleRecipient: payloadV5.primarySaleRecipient,
            royaltyRecipient: payloadV5.royaltyRecipient,
            royaltyBps: BigInt(payloadV5.royaltyBps),
            validityStartTimestamp: BigInt(payloadV5.validityStartTimestamp),
            validityEndTimestamp: BigInt(payloadV5.validityEndTimestamp),
            uid: payloadV5.uid as Hex,
          },
          signature: signature as Hex,
        });

        const insertedTransaction = {
          chainId,
          from: fromAddress as Address,
          to: contractAddress as Address | undefined,
          data: (await resolvePromisedValue(transaction.data)) as Hex,
          ...parseTransactionOverrides(txOverrides),
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
      } else {
        const payloadV4 = payload as Static<typeof signature721OutputSchema>;
        const contract = await getContract({
          chainId,
          contractAddress,
          walletAddress: fromAddress,
          accountAddress,
        });
        const signedPayload: SignedPayload721WithQuantitySignature = {
          payload: {
            ...payloadV4,
            price: payloadV4.price ?? "0",
            royaltyBps: BigNumber.from(payloadV4.royaltyBps),
            quantity: BigNumber.from(payloadV4.quantity),
            mintStartTime: BigNumber.from(payloadV4.mintStartTime),
            mintEndTime: BigNumber.from(payloadV4.mintEndTime),
          },
          signature,
        };
        const tx = await contract.erc721.signature.mint.prepare(signedPayload);

        queueId = await queueTx({
          tx,
          chainId,
          simulateTx,
          extension: "erc721",
          idempotencyKey,
          txOverrides,
        });
      }

      reply.status(StatusCodes.OK).send({
        result: { queueId },
      });
    },
  });
}
