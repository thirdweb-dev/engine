import { Static, Type } from "@sinclair/typebox";
import type {
  ISignatureMintERC721,
  ITokenERC721,
} from "@thirdweb-dev/contracts-js";
import {
  MintRequest721,
  MintRequest721withQuantity,
  NFTMetadataOrUri,
  PayloadWithUri721withQuantity,
  Signature721WithQuantityInput,
  SmartContract,
  detectFeatures,
  isExtensionEnabled,
} from "@thirdweb-dev/sdk";
import { ThirdwebStorage } from "@thirdweb-dev/storage";
import BN from "bn.js";
import ethers, { BigNumber, utils } from "ethers";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { getContract } from "../../../../../../utils/cache/getContract";
import { env } from "../../../../../../utils/env";
import {
  ercNFTResponseType,
  signature721InputSchema,
} from "../../../../../schemas/nft";
import {
  erc721ContractParamSchema,
  standardResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { getChainIdFromChain } from "../../../../../utils/chain";
import { checkAndReturnNFTSignaturePayload } from "../../../../../utils/validator";

// INPUTS
const requestSchema = erc721ContractParamSchema;
const requestBodySchema = Type.Object({
  ...signature721InputSchema.properties,
});

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Object({
    mintPayload: Type.Any(),
    typedDataPayload: Type.Object({
      domain: Type.Object({
        name: Type.String(),
        version: Type.String(),
        chainId: Type.Number(),
        verifyingContract: Type.String(),
      }),
      types: Type.Any(),
      message: Type.Any(),
    }),
  }),
});

responseSchema.example = {
  result: {
    mintPayload: {
      to: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
      price: "0",
      currencyAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      mintStartTime: "1704664293",
      mintEndTime: "1751925093",
      uid: "0x3732346162373763346432663433333462383134353662343761373166636239",
      primarySaleRecipient: "0x0000000000000000000000000000000000000000",
      metadata: {
        name: "test token",
        description: "test token",
      },
      royaltyRecipient: "0x0000000000000000000000000000000000000000",
      royaltyBps: "0",
      quantity: "1",
      uri: "ipfs://Qmaf55psrmeckXZ6yo4DTL7fUYeMR4t6XArY5NgMrKN9VA/0",
    },
    typedDataPayload: {
      domain: {
        name: "TokenERC721",
        version: "1",
        chainId: 84532,
        verifyingContract: "0x9ca57B9341dCB029a5b11163C9a47FB65BA6F4c3",
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
        to: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
        royaltyRecipient: "0x0000000000000000000000000000000000000000",
        royaltyBps: "0",
        primarySaleRecipient: "0x0000000000000000000000000000000000000000",
        price: "0",
        uri: "ipfs://Qmaf55psrmeckXZ6yo4DTL7fUYeMR4t6XArY5NgMrKN9VA/0",
        currency: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        validityEndTimestamp: "1751925093",
        validityStartTimestamp: "1704664293",
        uid: "0x3732346162373763346432663433333462383134353662343761373166636239",
      },
    },
  },
};

// LOGIC
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
      } = request.body;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });
      const storage = new ThirdwebStorage({
        secretKey: env.THIRDWEB_API_SECRET_KEY,
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

      const uri = await uploadOrExtractURI(metadata, storage);
      // Build the payload to be provided to the signature mint endpoint.
      const parsed = await Signature721WithQuantityInput.parseAsync(payload);
      const mintPayload = {
        ...parsed,
        uid: generateUid(),
        uri,
        royaltyBps: BigNumber.from(parsed.royaltyBps),
      };

      let sanitizedMessage: any;

      // Build the data fields needed to be signed by a minter wallet.
      let domain;
      let types;
      let message:
        | ISignatureMintERC721.MintRequestStructOutput
        | ITokenERC721.MintRequestStructOutput;

      if (isLegacyNFTContract(contract)) {
        domain = {
          name: "TokenERC721",
          version: "1",
          chainId,
          verifyingContract: contractAddress,
        };
        types = { MintRequest: MintRequest721 };
        message = mapLegacyPayloadToContractStruct(mintPayload);
        sanitizedMessage = {
          ...message,
          price: message.price.toString(),
          royaltyBps: message.royaltyBps.toString(),
          validityStartTimestamp: message.validityStartTimestamp.toString(),
          validityEndTimestamp: message.validityEndTimestamp.toString(),
        };
      } else {
        domain = {
          name: "SignatureMintERC721",
          version: "1",
          chainId,
          verifyingContract: contractAddress,
        };
        types = { MintRequest: MintRequest721withQuantity };
        message = mapPayloadToContractStruct(mintPayload);
        sanitizedMessage = {
          ...message,
          pricePerToken: message.pricePerToken.toString(),
          royaltyBps: message.royaltyBps.toString(),
          validityStartTimestamp: message.validityStartTimestamp.toString(),
          validityEndTimestamp: message.validityEndTimestamp.toString(),
          quantity: message.quantity.toString(),
        };
      }

      reply.status(StatusCodes.OK).send({
        result: {
          mintPayload: {
            ...mintPayload,
            royaltyBps: mintPayload.royaltyBps.toString(),
            mintEndTime: mintPayload.mintEndTime.toString(),
            mintStartTime: mintPayload.mintStartTime.toString(),
            quantity: mintPayload.quantity.toString(),
          },
          typedDataPayload: {
            domain,
            types,
            message: sanitizedMessage,
          },
        },
      });
    },
  });
}

/**
 * Helper functions
 */
const isLegacyNFTContract = (
  contract: SmartContract<ethers.ethers.BaseContract>,
) =>
  isExtensionEnabled(
    contract.abi,
    "ERC721SignatureMintV1",
    detectFeatures(contract.abi),
  );

const generateUid = () => {
  const buffer = Buffer.alloc(16);
  uuid({}, buffer);
  return utils.hexlify(utils.toUtf8Bytes(buffer.toString("hex")));
};

const mapPayloadToContractStruct = (
  mintRequest: PayloadWithUri721withQuantity,
): ISignatureMintERC721.MintRequestStructOutput => {
  return {
    to: mintRequest.to,
    royaltyRecipient: mintRequest.royaltyRecipient,
    royaltyBps: mintRequest.royaltyBps,
    primarySaleRecipient: mintRequest.primarySaleRecipient,
    uri: mintRequest.uri,
    quantity: mintRequest.quantity,
    pricePerToken: ethers.BigNumber.from(mintRequest.price),
    currency: mintRequest.currencyAddress,
    validityStartTimestamp: mintRequest.mintStartTime,
    validityEndTimestamp: mintRequest.mintEndTime,
    uid: mintRequest.uid,
  } as ISignatureMintERC721.MintRequestStructOutput;
};

const mapLegacyPayloadToContractStruct = (
  mintRequest: PayloadWithUri721withQuantity,
): ITokenERC721.MintRequestStructOutput => {
  return {
    to: mintRequest.to,
    royaltyRecipient: mintRequest.royaltyRecipient,
    royaltyBps: mintRequest.royaltyBps,
    primarySaleRecipient: mintRequest.primarySaleRecipient,
    price: ethers.BigNumber.from(mintRequest.price),
    uri: mintRequest.uri,
    currency: mintRequest.currencyAddress,
    validityEndTimestamp: mintRequest.mintEndTime,
    validityStartTimestamp: mintRequest.mintStartTime,
    uid: mintRequest.uid,
  } as ITokenERC721.MintRequestStructOutput;
};

const uploadOrExtractURI = async (
  metadata: NFTMetadataOrUri,
  storage: ThirdwebStorage,
): Promise<string> => {
  if (typeof metadata === "string") {
    return metadata;
  } else {
    return await storage.upload(CommonNFTInput.parse(metadata));
  }
};

const FileOrBufferUnionSchema = (() => z.instanceof(Buffer) as z.ZodTypeAny)();

const FileOrBufferSchema = (() =>
  z.union([
    FileOrBufferUnionSchema,
    z.object({
      data: z.union([FileOrBufferUnionSchema, z.string()]),
      name: z.string(),
    }),
  ]))();

const FileOrBufferOrStringSchema = (() =>
  z.union([FileOrBufferSchema, z.string()]))();

const HexColor = (() =>
  z.union([
    z.string().regex(/^([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color"),
    z
      .string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color")
      .transform((val) => val.replace("#", "")),
    z.string().length(0),
  ]))();

const BigNumberTransformSchema = (() =>
  z
    .union([
      z.bigint(),
      z.custom<BigNumber>((data) => {
        return BigNumber.isBigNumber(data);
      }),
      z.custom<BN>((data) => {
        return BN.isBN(data);
      }),
    ])
    .transform((arg) => {
      if (BN.isBN(arg)) {
        return new BN(arg).toString();
      }
      return BigNumber.from(arg).toString();
    }))();

const PropertiesInput = (() =>
  z.object({}).catchall(z.union([BigNumberTransformSchema, z.unknown()])))();

const OptionalPropertiesInput = (() =>
  z
    .union([z.array(PropertiesInput), PropertiesInput])
    .optional()
    .nullable())();

const BasicNFTInput = (() =>
  z.object({
    name: z.union([z.string(), z.number()]).optional().nullable(),
    description: z.string().nullable().optional().nullable(),
    image: FileOrBufferOrStringSchema.nullable().optional(),

    animation_url: FileOrBufferOrStringSchema.optional().nullable(),
  }))();

const CommonNFTInput = (() =>
  BasicNFTInput.extend({
    external_url: FileOrBufferOrStringSchema.nullable().optional(),
    background_color: HexColor.optional().nullable(),
    properties: OptionalPropertiesInput,
    attributes: OptionalPropertiesInput,
  }).catchall(z.union([BigNumberTransformSchema, z.unknown()])))();
