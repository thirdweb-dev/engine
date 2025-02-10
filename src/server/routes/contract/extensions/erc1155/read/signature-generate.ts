import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract, type Address, type Hex } from "thirdweb";
// import type { NFTInput } from "thirdweb/dist/types/utils/nft/parseNft.d.ts";
import { getAccount } from "../../../../../../shared/utils/account.js";
import { getContract as getContractV4 } from "../../../../../../shared/utils/cache/get-contract.js";
import { getChain } from "../../../../../../shared/utils/chain.js";
import { maybeBigInt } from "../../../../../../shared/utils/primitive-types.js";
import { thirdwebClient } from "../../../../../../shared/utils/sdk.js";
import { createCustomError } from "../../../../../middleware/error.js";
import { thirdwebSdkVersionSchema } from "../../../../../schemas/http-headers/thirdweb-sdk-version.js";
import {
  nftInputSchema,
  signature1155InputSchema,
  signature1155OutputSchema,
  type ercNFTResponseType,
} from "../../../../../schemas/nft/index.js";
import {
  TokenAmountStringSchema,
  WeiAmountStringSchema,
} from "../../../../../schemas/number.js";
import {
  erc1155ContractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/shared-api-schemas.js";
import { walletWithAAHeaderSchema } from "../../../../../schemas/wallet/index.js";
import { getChainIdFromChain } from "../../../../../utils/chain.js";
import { checkAndReturnNFTSignaturePayload } from "../../../../../utils/validator.js";
import type { NFTInput } from "thirdweb/utils";
import { generateMintSignature } from "thirdweb/extensions/erc1155";

// v4 sdk
const requestBodySchemaV4 = signature1155InputSchema;
const responseSchemaV4 = Type.Object({
  payload: signature1155OutputSchema,
  signature: Type.String(),
});

// v5 sdk
const requestBodySchemaV5 = Type.Intersect([
  Type.Object({
    contractType: Type.Optional(
      Type.Union([
        Type.Literal("TokenERC1155"),
        Type.Literal("SignatureMintERC1155"),
      ]),
    ),
    to: Type.String(),
    quantity: Type.String(),
    royaltyRecipient: Type.Optional(Type.String()),
    royaltyBps: Type.Optional(Type.Integer({ minimum: 0, maximum: 10_000 })),
    primarySaleRecipient: Type.Optional(Type.String()),
    pricePerToken: Type.Optional(TokenAmountStringSchema),
    pricePerTokenWei: Type.Optional(WeiAmountStringSchema),
    currency: Type.Optional(Type.String()),
    validityStartTimestamp: Type.Integer({ minimum: 0 }),
    validityEndTimestamp: Type.Optional(Type.Integer({ minimum: 0 })),
    uid: Type.Optional(Type.String()),
  }),
  Type.Union([
    Type.Object({ metadata: Type.Union([nftInputSchema, Type.String()]) }),
    Type.Object({ tokenId: Type.String() }),
  ]),
]);
const responseSchemaV5 = Type.Object({
  payload: Type.Object({
    to: Type.String(),
    royaltyRecipient: Type.String(),
    royaltyBps: Type.String(),
    primarySaleRecipient: Type.String(),
    tokenId: Type.String(),
    uri: Type.String(),
    quantity: Type.String(),
    pricePerToken: Type.String(),
    currency: Type.String(),
    validityStartTimestamp: Type.Integer(),
    validityEndTimestamp: Type.Integer(),
    uid: Type.String(),
  }),
  signature: Type.String(),
});

const requestSchema = erc1155ContractParamSchema;
const requestBodySchema = Type.Union([
  requestBodySchemaV4,
  requestBodySchemaV5,
]);
const responseSchema = Type.Object({
  result: Type.Union([responseSchemaV4, responseSchemaV5]),
});

responseSchema.example = {
  result: "1",
};

// LOGIC
export async function erc1155SignatureGenerate(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc1155/signature/generate",
    schema: {
      summary: "Generate signature",
      description:
        "Generate a signature granting access for another wallet to mint tokens from this ERC-1155 contract. This method is typically called by the token contract owner.",
      tags: ["ERC1155"],
      operationId: "erc1155-signatureGenerate",
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
          contractType,
          to,
          quantity,
          royaltyRecipient,
          royaltyBps,
          primarySaleRecipient,
          pricePerToken,
          pricePerTokenWei,
          currency,
          validityStartTimestamp,
          validityEndTimestamp,
          uid,
        } = args;

        let nftInput: { metadata: NFTInput | string } | { tokenId: bigint };
        if ("metadata" in args) {
          nftInput = { metadata: args.metadata };
        } else if ("tokenId" in args) {
          nftInput = { tokenId: BigInt(args.tokenId) };
        } else {
          throw createCustomError(
            `Missing "metadata" or "tokenId".`,
            StatusCodes.BAD_REQUEST,
            "MISSING_PARAMETERS",
          );
        }

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
          contractType,
          mintRequest: {
            to,
            quantity: BigInt(quantity),
            royaltyRecipient,
            royaltyBps,
            primarySaleRecipient,
            pricePerToken,
            pricePerTokenWei: maybeBigInt(pricePerTokenWei),
            currency,
            validityStartTimestamp: new Date(validityStartTimestamp * 1000),
            validityEndTimestamp: validityEndTimestamp
              ? new Date(validityEndTimestamp * 1000)
              : undefined,
            uid: uid as Hex | undefined,
            ...nftInput,
          },
        });

        return reply.status(StatusCodes.OK).send({
          result: {
            payload: {
              ...payload,
              royaltyBps: payload.royaltyBps.toString(),
              tokenId: payload.tokenId.toString(),
              quantity: payload.quantity.toString(),
              pricePerToken: payload.pricePerToken.toString(),
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
        Static<typeof signature1155InputSchema>,
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

      const signedPayload = await contract.erc1155.signature.generate(payload);
      reply.status(StatusCodes.OK).send({
        result: {
          ...signedPayload,
          payload: {
            ...signedPayload.payload,
            quantity: signedPayload.payload.quantity.toString(),
            royaltyBps: signedPayload.payload.royaltyBps.toString(),
            mintStartTime: signedPayload.payload.mintStartTime.toNumber(),
            mintEndTime: signedPayload.payload.mintEndTime.toNumber(),
            tokenId: signedPayload.payload.tokenId.toString(),
          },
        },
      });
    },
  });
}
