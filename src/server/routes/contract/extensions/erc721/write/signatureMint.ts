import { Static, Type } from "@sinclair/typebox";
import { SignedPayload721WithQuantitySignature } from "@thirdweb-dev/sdk";
import { BigNumber } from "ethers";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Hex, defineChain, getContract as getContractV5 } from "thirdweb";
import { mintWithSignature } from "thirdweb/extensions/erc721";
import { resolvePromisedValue } from "thirdweb/utils";
import { queueTx } from "../../../../../../db/transactions/queueTx";
import { queueTxRaw } from "../../../../../../db/transactions/queueTxRaw";
import { getContract } from "../../../../../../utils/cache/getContract";
import { thirdwebClient } from "../../../../../../utils/sdk";
import { thirdwebSdkVersionSchema } from "../../../../../schemas/httpHeaders/thirdwebSdkVersion";
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
      operationId: "signatureMint",
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
        const contract = getContractV5({
          client: thirdwebClient,
          chain: defineChain(chainId),
          address: contractAddress,
        });
        const transaction = mintWithSignature({
          contract,
          payload: {
            uri: payload.uri,
            to: payload.to,
            price: payload.price ? BigInt(payload.price) : 0n,
            currency: payloadV5.currency,
            primarySaleRecipient: payload.primarySaleRecipient,
            royaltyRecipient: payload.royaltyRecipient,
            royaltyBps: BigInt(payloadV5.royaltyBps),
            validityStartTimestamp: BigInt(payloadV5.validityStartTimestamp),
            validityEndTimestamp: BigInt(payloadV5.validityEndTimestamp),
            uid: payload.uid as Hex,
          },
          signature: signature as Hex,
        });

        const from = accountAddress
          ? { signerAddress: fromAddress, accountAddress }
          : { fromAddress };
        const { id } = await queueTxRaw({
          ...from,
          toAddress: contractAddress,
          chainId: chainId.toString(),
          data: (await resolvePromisedValue(transaction.data)) as Hex,
          value: txOverrides?.value,
          gas: txOverrides?.gas,
          maxFeePerGas: txOverrides?.maxFeePerGas,
          maxPriorityFeePerGas: txOverrides?.maxPriorityFeePerGas,
          simulateTx,
          idempotencyKey,
        });
        queueId = id;
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
