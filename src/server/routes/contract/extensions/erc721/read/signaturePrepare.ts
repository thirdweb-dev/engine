import { Static, Type } from "@sinclair/typebox";
import type {
  ISignatureMintERC721,
  ITokenERC721,
} from "@thirdweb-dev/contracts-js";
import {
  MintRequest721,
  MintRequest721withQuantity,
  PayloadWithUri721withQuantity,
  Signature721WithQuantityInput,
  SmartContract,
  detectFeatures,
  isExtensionEnabled,
} from "@thirdweb-dev/sdk";
import ethers, { BigNumber, utils } from "ethers";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { v4 as uuid } from "uuid";
import { getContract } from "../../../../../../utils/cache/getContract";
import {
  newErcNFTResponseType,
  newSignature721InputSchema,
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
  ...newSignature721InputSchema.properties,
});

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Object({
    mintPayload: Type.Any(),
    domain: Type.Object({
      name: Type.String(),
      version: Type.String(),
      chainId: Type.Number(),
      verifyingContract: Type.String(),
    }),
    types: Type.Any(),
    message: Type.Any(),
  }),
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
        name: "test tokenII",
        description: "test token",
      },
      currencyAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      price: "0",
      mintStartTime: "1686169938",
      mintEndTime: "2001529938",
    },
    signature:
      "0xe6f2e29f32f7da65385effa2ed4f39b8d3caf08b025eb0004fd4695b42ee145f2c7afdf2764f0097c9ed5d88b50e97c4c638f91289408fa7d7a0834cd707c4a41b",
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
        uri,
      } = request.body;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
      });

      const payload = checkAndReturnNFTSignaturePayload<
        Static<typeof newSignature721InputSchema>,
        newErcNFTResponseType
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
        uri,
      });

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
          domain,
          types,
          message: sanitizedMessage,
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
