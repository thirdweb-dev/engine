import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContract, type Address, type Hex } from "thirdweb";
import { generateMintSignature } from "thirdweb/extensions/erc20";
import { getAccount } from "../../../../../../shared/utils/account.js";
import { getContract as getContractV4 } from "../../../../../../shared/utils/cache/get-contract.js";
import { getChain } from "../../../../../../shared/utils/chain.js";
import { maybeBigInt } from "../../../../../../shared/utils/primitive-types.js";
import { thirdwebClient } from "../../../../../../shared/utils/sdk.js";
import { createCustomError } from "../../../../../middleware/error.js";
import {
  signature20InputSchema,
  signature20OutputSchema,
  type erc20ResponseType,
} from "../../../../../schemas/erc20/index.js";
import { thirdwebSdkVersionSchema } from "../../../../../schemas/http-headers/thirdweb-sdk-version.js";
import {
  erc20ContractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/shared-api-schemas.js";
import { walletWithAAHeaderSchema } from "../../../../../schemas/wallet/index.js";
import { getChainIdFromChain } from "../../../../../utils/chain.js";
import { checkAndReturnERC20SignaturePayload } from "../../../../../utils/validator.js";

// v4 sdk
const requestBodySchemaV4 = signature20InputSchema;
const responseSchemaV4 = Type.Object({
  payload: signature20OutputSchema,
  signature: Type.String(),
});

// v5 sdk
const requestBodySchemaV5 = Type.Intersect([
  Type.Object({
    to: Type.String(),
    primarySaleRecipient: Type.Optional(Type.String()),
    price: Type.Optional(Type.String()),
    priceInWei: Type.Optional(Type.String()),
    currency: Type.Optional(Type.String()),
    validityStartTimestamp: Type.Integer({ minimum: 0 }),
    validityEndTimestamp: Type.Optional(Type.Integer({ minimum: 0 })),
    uid: Type.Optional(Type.String()),
  }),
  Type.Union([
    Type.Object({ quantity: Type.String() }),
    Type.Object({ quantityWei: Type.String() }),
  ]),
]);
const responseSchemaV5 = Type.Object({
  payload: Type.Object({
    to: Type.String(),
    primarySaleRecipient: Type.String(),
    quantity: Type.String(),
    price: Type.String(),
    currency: Type.String(),
    validityStartTimestamp: Type.Integer(),
    validityEndTimestamp: Type.Integer(),
    uid: Type.String(),
  }),
  signature: Type.String(),
});

const requestSchema = erc20ContractParamSchema;
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
export async function erc20SignatureGenerate(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc20/signature/generate",
    schema: {
      summary: "Generate signature",
      description:
        "Generate a signature granting access for another wallet to mint tokens from this ERC-20 contract. This method is typically called by the token contract owner.",
      tags: ["ERC20"],
      operationId: "erc20-signatureGenerate",
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
          primarySaleRecipient,
          price,
          priceInWei,
          currency,
          validityStartTimestamp,
          validityEndTimestamp,
          uid,
        } = args;

        let quantityInput: { quantity: string } | { quantityWei: bigint };
        if ("quantity" in args) {
          quantityInput = { quantity: args.quantity };
        } else if ("quantityWei" in args) {
          quantityInput = { quantityWei: BigInt(args.quantityWei) };
        } else {
          throw createCustomError(
            `Missing "quantity" or "quantityWei".`,
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
          mintRequest: {
            to,
            primarySaleRecipient,
            price,
            priceInWei: maybeBigInt(priceInWei),
            currency: currency as Address | undefined,
            validityStartTimestamp: new Date(validityStartTimestamp * 1000),
            validityEndTimestamp: validityEndTimestamp
              ? new Date(validityEndTimestamp * 1000)
              : undefined,
            uid: uid as Hex | undefined,
            ...quantityInput,
          },
        });

        return reply.status(StatusCodes.OK).send({
          result: {
            payload: {
              ...payload,
              quantity: payload.quantity.toString(),
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
        mintEndTime,
        mintStartTime,
        price = "0",
        primarySaleRecipient,
        quantity,
        uid,
      } = request.body as Static<typeof requestBodySchemaV4>;

      const contract = await getContractV4({
        chainId,
        contractAddress,
        walletAddress,
        accountAddress,
      });

      const payload = checkAndReturnERC20SignaturePayload<
        Static<typeof signature20InputSchema>,
        erc20ResponseType
      >({
        to,
        currencyAddress,
        mintEndTime,
        mintStartTime,
        price,
        primarySaleRecipient,
        quantity,
        uid,
      });
      const signedPayload = await contract.erc20.signature.generate(payload);

      reply.status(StatusCodes.OK).send({
        result: {
          ...signedPayload,
          payload: {
            ...signedPayload.payload,
            quantity: signedPayload.payload.quantity.toString(),
            mintStartTime: signedPayload.payload.mintStartTime.toNumber(),
            mintEndTime: signedPayload.payload.mintEndTime.toNumber(),
          },
        },
      });
    },
  });
}
