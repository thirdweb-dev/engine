import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Address, Hex, getContract } from "thirdweb";
import { generateMintSignature } from "thirdweb/extensions/erc721";
import { getAccount } from "../../../../../../utils/account";
import { getContract as getContractV4 } from "../../../../../../utils/cache/getContract";
import { getChain } from "../../../../../../utils/chain";
import { thirdwebClient } from "../../../../../../utils/sdk";
import { thirdwebSdkVersionSchema } from "../../../../../schemas/httpHeaders/thirdwebSdkVersion";
import {
  ercNFTResponseType,
  nftInputSchema,
  signature721InputSchema,
  signature721OutputSchema,
} from "../../../../../schemas/nft";
import {
  erc721ContractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { walletWithAAHeaderSchema } from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";
import { checkAndReturnNFTSignaturePayload } from "../../../../../utils/validator";

// v4 sdk
const requestBodySchemaV4 = signature721InputSchema;
const responseSchemaV4 = Type.Object({
  payload: signature721OutputSchema,
  signature: Type.String(),
});

// v5 sdk
const requestBodySchemaV5 = Type.Intersect([
  Type.Object({
    to: Type.String(),
    metadata: Type.Union([nftInputSchema, Type.String()]),
    royaltyRecipient: Type.Optional(Type.String()),
    royaltyBps: Type.Optional(Type.Number()),
    primarySaleRecipient: Type.Optional(Type.String()),
    price: Type.Optional(Type.String()),
    priceInWei: Type.Optional(Type.String()),
    currency: Type.Optional(Type.String()),
    validityStartTimestamp: Type.Integer(),
    validityEndTimestamp: Type.Optional(Type.Integer()),
    uid: Type.Optional(Type.String()),
  }),
]);
const responseSchemaV5 = Type.Object({
  payload: Type.Object({
    to: Type.String(),
    royaltyRecipient: Type.String(),
    royaltyBps: Type.String(),
    primarySaleRecipient: Type.String(),
    uri: Type.String(),
    price: Type.String(),
    currency: Type.String(),
    validityStartTimestamp: Type.Integer(),
    validityEndTimestamp: Type.Integer(),
    uid: Type.String(),
  }),
  signature: Type.String(),
});

const requestSchema = erc721ContractParamSchema;
const requestBodySchema = Type.Union([
  requestBodySchemaV4,
  requestBodySchemaV5,
]);
const responseSchema = Type.Object({
  result: Type.Union([responseSchemaV4, responseSchemaV5]),
});

responseSchema.example = {
  result: {
    payload: {
      uri: "ipfs://QmP1i29T534877ptz8bazU1eYiYLzQ1GRK4cnZWngsz9ud/0",
      to: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
      royaltyRecipient: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
      quantity: "1",
      royaltyBps: "0",
      primarySaleRecipient: "0x0000000000000000000000000000000000000000",
      uid: "0x3862386334363135326230303461303939626136653361643131343836373563",
      metadata: {
        name: "test token",
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
};

// LOGIC
export async function erc721SignatureGenerate(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc721/signature/generate",
    schema: {
      summary: "Generate signature",
      description:
        "Generate a signature granting access for another wallet to mint tokens from this ERC-721 contract. This method is typically called by the token contract owner.",
      tags: ["ERC721"],
      operationId: "signatureGenerate",
      params: requestSchema,
      body: requestBodySchema,
      headers: {
        ...walletWithAAHeaderSchema.properties,
        ...thirdwebSdkVersionSchema.properties,
      },
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;
      const { "x-thirdweb-sdk-version": sdkVersion } =
        request.headers as Static<typeof thirdwebSdkVersionSchema>;

      const chainId = await getChainIdFromChain(chain);

      // Use v5 SDK if "x-thirdweb-sdk-version" header is set.
      if (sdkVersion === "5") {
        const args = request.body as Static<typeof requestBodySchemaV5>;
        const {
          to,
          metadata,
          royaltyRecipient,
          royaltyBps,
          primarySaleRecipient,
          price,
          priceInWei,
          currency,
          validityStartTimestamp,
          validityEndTimestamp,
          uid,
        } = args;

        const contract = getContract({
          client: thirdwebClient,
          chain: await getChain(chainId),
          address: contractAddress,
        });
        const account = await getAccount({
          chainId,
          from: walletAddress as Address,
          accountAddress: accountAddress as Address,
        });

        const { payload, signature } = await generateMintSignature({
          contract,
          account,
          mintRequest: {
            to,
            metadata,
            royaltyRecipient,
            royaltyBps,
            primarySaleRecipient,
            price,
            priceInWei: priceInWei ? BigInt(priceInWei) : undefined,
            currency: currency as Address | undefined,
            validityStartTimestamp: new Date(validityStartTimestamp * 1000),
            validityEndTimestamp: validityEndTimestamp
              ? new Date(validityEndTimestamp * 1000)
              : undefined,
            uid: uid as Hex | undefined,
          },
        });

        return reply.status(StatusCodes.OK).send({
          result: {
            payload: {
              ...payload,
              royaltyBps: payload.royaltyBps.toString(),
              price: payload.price.toString(),
              validityStartTimestamp: Number(payload.validityStartTimestamp),
              validityEndTimestamp: Number(payload.validityEndTimestamp),
            },
            signature,
          },
        });
      }

      // Use v4 SDK.
      const {
        to,
        currencyAddress,
        metadata,
        mintEndTime,
        mintStartTime,
        price = "0",
        primarySaleRecipient,
        quantity,
        royaltyBps,
        royaltyRecipient,
        uid,
      } = request.body as Static<typeof requestBodySchemaV4>;

      const contract = await getContractV4({
        chainId,
        contractAddress,
        walletAddress,
        accountAddress,
      });

      const payload = checkAndReturnNFTSignaturePayload<
        Static<typeof signature721InputSchema>,
        ercNFTResponseType
      >({
        to,
        currencyAddress,
        metadata,
        mintEndTime,
        mintStartTime,
        price,
        primarySaleRecipient,
        quantity,
        royaltyBps,
        royaltyRecipient,
        uid,
      });

      const signedPayload = await contract.erc721.signature.generate(payload);

      reply.status(StatusCodes.OK).send({
        result: {
          ...signedPayload,
          payload: {
            ...signedPayload.payload,
            quantity: signedPayload.payload.quantity.toString(),
            royaltyBps: signedPayload.payload.royaltyBps.toString(),
            mintStartTime: signedPayload.payload.mintStartTime.toNumber(),
            mintEndTime: signedPayload.payload.mintEndTime.toNumber(),
          },
        },
      });
    },
  });
}
