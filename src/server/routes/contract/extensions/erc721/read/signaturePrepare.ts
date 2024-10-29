import { Type, type Static } from "@sinclair/typebox";
import { MintRequest721 } from "@thirdweb-dev/sdk";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createHash, getRandomValues } from "node:crypto";
import {
  ZERO_ADDRESS,
  getContract,
  isHex,
  uint8ArrayToHex,
  type Hex,
} from "thirdweb";
import {
  primarySaleRecipient as getDefaultPrimarySaleRecipient,
  getDefaultRoyaltyInfo,
} from "thirdweb/extensions/common";
import { decimals } from "thirdweb/extensions/erc20";
import { upload } from "thirdweb/storage";
import { checksumAddress } from "thirdweb/utils";
import { getChain } from "../../../../../../utils/chain";
import { prettifyError } from "../../../../../../utils/error";
import { thirdwebClient } from "../../../../../../utils/sdk";
import { createCustomError } from "../../../../../middleware/error";
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
    typedDataPayload: Type.Object(
      {
        domain: Type.Object(
          {
            name: Type.String(),
            version: Type.String(),
            chainId: Type.Number(),
            verifyingContract: Type.String(),
          },
          {
            description:
              "Specifies the contextual information used to prevent signature reuse across different contexts.",
          },
        ),
        types: Type.Object(
          {
            EIP712Domain: Type.Array(
              Type.Object({
                name: Type.String(),
                type: Type.String(),
              }),
            ),
            MintRequest: Type.Array(
              Type.Object({
                name: Type.String(),
                type: Type.String(),
              }),
            ),
          },
          {
            description:
              "Defines the structure of the data types used in the message.",
          },
        ),
        message: {
          ...signature721OutputSchemaV5,
          description: "The structured data to be signed.",
        },
        primaryType: Type.Literal("MintRequest", {
          description:
            "The main type of the data in the message corresponding to a defined type in the `types` field.",
        }),
      },
      {
        description:
          "The payload to sign with a wallet's `signTypedData` method.",
      },
    ),
  }),
});

responseSchema.example = {
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
      operationId: "erc721-signaturePrepare",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain: chainSlug, contractAddress } = request.params;
      const {
        metadata,
        to,
        price,
        priceInWei,
        currency,
        validityStartTimestamp,
        validityEndTimestamp,
        uid,
      } = request.body;

      const chainId = await getChainIdFromChain(chainSlug);
      const chain = await getChain(chainId);
      const contract = await getContract({
        client: thirdwebClient,
        chain,
        address: contractAddress,
      });

      let royaltyRecipient = request.body.royaltyRecipient;
      let royaltyBps = request.body.royaltyBps;
      if (!royaltyRecipient || !royaltyBps) {
        try {
          const [defaultRoyaltyRecipient, defaultRoyaltyBps] =
            await getDefaultRoyaltyInfo({
              contract,
            });

          royaltyRecipient = royaltyRecipient ?? defaultRoyaltyRecipient;
          royaltyBps = royaltyBps ?? defaultRoyaltyBps;
        } catch (e) {
          throw createCustomError(
            `Could not get default royalty info: ${prettifyError(e)}`,
            StatusCodes.BAD_REQUEST,
            "DEFAULT_ROYALTY_INFO",
          );
        }
      }

      let primarySaleRecipient = request.body.primarySaleRecipient;
      if (!primarySaleRecipient) {
        try {
          primarySaleRecipient = await getDefaultPrimarySaleRecipient({
            contract,
          });
        } catch (e) {
          throw createCustomError(
            `Could not get default primary sale recipient: ${prettifyError(e)}`,
            StatusCodes.BAD_REQUEST,
            "DEFAULT_PRIMARY_SALE_RECIPIENT",
          );
        }
      }

      const parsedCurrency = currency || ZERO_ADDRESS;

      let parsedPrice = 0n;
      if (priceInWei) {
        parsedPrice = BigInt(priceInWei);
      } else if (price) {
        let _decimals = 18;
        if (
          !(
            parsedCurrency === ZERO_ADDRESS ||
            parsedCurrency === "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
          )
        ) {
          const contract = getContract({
            chain,
            client: thirdwebClient,
            address: parsedCurrency,
          });
          _decimals = await decimals({ contract });
        }
        parsedPrice = BigInt(Number.parseFloat(price) * 10 ** _decimals);
      }

      let parsedUri = "";
      if (metadata) {
        parsedUri =
          typeof metadata === "string"
            ? metadata
            : await upload({
                client: thirdwebClient,
                files: [metadata],
              });
      }

      let parsedUid: Hex;
      if (uid) {
        if (isHex(uid)) {
          // 0x + 32-byte hex
          if (uid.length !== 66) {
            throw createCustomError(
              '"uid" must be a valid 32-byte hex string.',
              StatusCodes.BAD_REQUEST,
              "INVALID_UID",
            );
          }
          parsedUid = uid;
        } else {
          parsedUid = `0x${createHash("sha256").update(uid).digest("hex")}`;
        }
      } else {
        parsedUid = uint8ArrayToHex(getRandomValues(new Uint8Array(32)));
      }

      const mintPayload: Static<typeof signature721OutputSchemaV5> = {
        uri: parsedUri,
        uid: parsedUid,
        currency: parsedCurrency,
        price: parsedPrice.toString(),
        to: checksumAddress(to),
        royaltyRecipient,
        royaltyBps: royaltyBps.toString(),
        primarySaleRecipient,
        validityStartTimestamp:
          validityStartTimestamp ?? toSeconds(new Date(0)),
        validityEndTimestamp:
          validityEndTimestamp ?? toSeconds(tenYearsFromNow()),
      };

      reply.status(StatusCodes.OK).send({
        result: {
          mintPayload: mintPayload,
          typedDataPayload: {
            domain: {
              name: "TokenERC721",
              version: "1",
              chainId: contract.chain.id,
              verifyingContract: contract.address,
            },
            types: {
              // signTypedData on some wallets fail without this type.
              EIP712Domain: [
                { name: "name", type: "string" },
                { name: "version", type: "string" },
                { name: "chainId", type: "uint256" },
                { name: "verifyingContract", type: "address" },
              ],
              MintRequest: MintRequest721,
            },
            message: mintPayload,
            primaryType: "MintRequest",
          },
        },
      });
    },
  });
}

const tenYearsFromNow = () =>
  new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10);

const toSeconds = (date: Date) => {
  return Math.floor(date.getTime() / 1000);
};
