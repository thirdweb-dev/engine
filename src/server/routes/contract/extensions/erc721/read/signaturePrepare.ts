import { Static, Type } from "@sinclair/typebox";
import { MintRequest721 } from "@thirdweb-dev/sdk";
import { randomBytes } from "crypto";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Hex, ZERO_ADDRESS, defineChain, getContract } from "thirdweb";
import { GenerateMintSignatureOptions } from "thirdweb/extensions/erc721";
import { upload } from "thirdweb/storage";
import { maybeBigInt } from "../../../../../../utils/primitiveTypes";
import { thirdwebClient } from "../../../../../../utils/sdk";
import {
  signature721InputSchemaV5,
  signature721OutputSchemaV5,
} from "../../../../../schemas/nft/v5";
import {
  erc721ContractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";

const requestSchema = erc721ContractParamSchema;
const requestBodySchema = signature721InputSchemaV5;

const responseSchema = Type.Object({
  result: Type.Object({
    mintPayload: signature721OutputSchemaV5,
    typedDataPayload: Type.Object({
      domain: Type.Object({
        name: Type.String(),
        version: Type.String(),
        chainId: Type.Number(),
        verifyingContract: Type.String(),
      }),
      types: Type.Object({
        MintRequest: Type.Array(
          Type.Object({
            name: Type.String(),
            type: Type.String(),
          }),
        ),
      }),
      message: signature721OutputSchemaV5,
      primaryType: Type.Literal("MintRequest"),
    }),
  }),
});

responseSchema.example = {
  result: {
    result: {
      mintPayload: {
        uri: "ipfs://...",
        currency: "0x0000000000000000000000000000000000000000",
        uid: "0x3862386334363135326230303461303939626136653361643131343836373563",
        to: "0x...",
        royaltyRecipient: "0x...",
        primarySaleRecipient: "0x...",
      },
      typedDataPayload: {
        domain: {
          name: "TokenERC721",
          version: "1",
          chainId: 84532,
          verifyingContract: "0x5002e3bF97F376Fe0480109e26c0208786bCDDd4",
        },
        types: {
          MintRequest: [
            {
              name: "to",
              type: "address",
            },
            {
              name: "royaltyRecipient",
              type: "address",
            },
            {
              name: "royaltyBps",
              type: "uint256",
            },
            {
              name: "primarySaleRecipient",
              type: "address",
            },
            {
              name: "uri",
              type: "string",
            },
            {
              name: "price",
              type: "uint256",
            },
            {
              name: "currency",
              type: "address",
            },
            {
              name: "validityStartTimestamp",
              type: "uint128",
            },
            {
              name: "validityEndTimestamp",
              type: "uint128",
            },
            {
              name: "uid",
              type: "bytes32",
            },
          ],
        },
        message: {
          uri: "ipfs://test",
          currency: "0x0000000000000000000000000000000000000000",
          uid: "0xmyuid",
          to: "0x4Ff9aa707AE1eAeb40E581DF2cf4e14AffcC553d",
          royaltyRecipient: "0x4Ff9aa707AE1eAeb40E581DF2cf4e14AffcC553d",
          primarySaleRecipient: "0x4Ff9aa707AE1eAeb40E581DF2cf4e14AffcC553d",
        },
        primaryType: "MintRequest",
      },
    },
  },
};

export async function erc721SignaturePrepare(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc721/signature/prepare",
    schema: {
      summary: "Prepare signature",
      description: "Prepares a payload for a wallet to generate a signature.",
      tags: ["ERC721"],
      operationId: "signaturePrepare",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const {
        metadata,
        to,
        price,
        priceInWei,
        currency,
        primarySaleRecipient,
        royaltyRecipient,
        royaltyBps,
        validityStartTimestamp,
        validityEndTimestamp,
        uid,
      } = request.body;

      const chainId = await getChainIdFromChain(chain);
      // @TODO: update to v2 getChain
      const contract = await getContract({
        client: thirdwebClient,
        chain: defineChain(chainId),
        address: contractAddress,
      });

      // @TODO: Update to use primitiveTypes helpers.
      const mintPayload = await generateMintSignaturePayload({
        metadata,
        to,
        price,
        priceInWei: maybeBigInt(priceInWei),
        currency,
        primarySaleRecipient,
        royaltyRecipient,
        royaltyBps,
        validityStartTimestamp: validityStartTimestamp
          ? new Date(validityStartTimestamp * 1000)
          : undefined,
        validityEndTimestamp: validityEndTimestamp
          ? new Date(validityEndTimestamp * 1000)
          : undefined,
        // @TODO: Verify if uid must be hex.
        uid: uid as Hex,
      });
      const sanitizedMintPayload: Static<typeof signature721OutputSchemaV5> = {
        ...mintPayload,
        price: mintPayload.price.toString(),
        royaltyBps: mintPayload.royaltyBps.toString(),
        validityStartTimestamp: mintPayload.validityStartTimestamp.toString(),
        validityEndTimestamp: mintPayload.validityEndTimestamp.toString(),
      };

      reply.status(StatusCodes.OK).send({
        result: {
          mintPayload: sanitizedMintPayload,
          typedDataPayload: {
            domain: {
              name: "TokenERC721",
              version: "1",
              chainId: contract.chain.id,
              verifyingContract: contract.address,
            },
            types: { MintRequest: MintRequest721 },
            message: sanitizedMintPayload,
            primaryType: "MintRequest",
          },
        },
      });
    },
  });
}

/**
 * Helper functions copied from v5 SDK.
 * The logic to generate a mint signature is not exported.
 */
export async function generateMintSignaturePayload(
  mintRequest: GenerateMintSignatureOptions["mintRequest"],
) {
  const currency = mintRequest.currency || ZERO_ADDRESS;
  const [price, uri, uid] = await Promise.all([
    // price
    (async () => {
      if (mintRequest.priceInWei) {
        return mintRequest.priceInWei;
      }
      if (mintRequest.price) {
        return mintRequest.price;
      }
      return 0n;
    })(),
    // uri
    (async () => {
      if (mintRequest.metadata) {
        if (typeof mintRequest.metadata === "object") {
          return await upload({
            client: thirdwebClient,
            files: [mintRequest.metadata],
          });
        }
        return mintRequest.metadata;
      }
      return "";
    })(),
    // uid
    mintRequest.uid || (await randomBytesHex()),
  ]);

  const startTime = mintRequest.validityStartTimestamp || new Date(0);
  const endTime = mintRequest.validityEndTimestamp || tenYearsFromNow();

  const saleRecipient = mintRequest.primarySaleRecipient;
  if (!saleRecipient) {
    throw new Error("@UNIMPLEMENTED");
  }

  const royaltyRecipient = mintRequest.royaltyRecipient;
  if (!royaltyRecipient) {
    throw new Error("@UNIMPLEMENTED");
  }

  return {
    uri,
    currency,
    uid,
    price,
    to: mintRequest.to,
    royaltyRecipient: royaltyRecipient,
    royaltyBps: BigInt(mintRequest.royaltyBps || 0),
    primarySaleRecipient: saleRecipient,
    validityStartTimestamp: dateToSeconds(startTime),
    validityEndTimestamp: dateToSeconds(endTime),
  };
}

const randomBytesHex = (length = 32) => randomBytes(length).toString("hex");

const tenYearsFromNow = () =>
  new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10);

const dateToSeconds = (date: Date) => {
  return BigInt(Math.floor(date.getTime() / 1000));
};
