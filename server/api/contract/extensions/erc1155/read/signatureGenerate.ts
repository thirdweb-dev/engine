import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  createCustomError,
  getContractInstace,
} from "../../../../../../core/index";
import {
  erc721ContractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";
import {
  signature1155InputSchema,
  signature1155OutputSchema,
} from "../../../../../schemas/nft";
import { timestampValidator } from "../../../../../utilities/validator";

// INPUTS
const requestSchema = erc721ContractParamSchema;
const requestBodySchema = signature1155InputSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Object({
    payload: signature1155OutputSchema,
    signature: Type.String(),
  }),
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
    url: "/contract/:chain_name_or_id/:contract_address/erc1155/signature/generate",
    schema: {
      description: `Generate a signature that a wallet address can use to mint the specified number of NFTs.
        This is typically an admin operation, where the owner of the contract generates a signature that 
        allows another wallet to mint tokens.`,
      tags: ["ERC1155"],
      operationId: "erc1155_signature_generate",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
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
      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );

      if (!timestampValidator(mintStartTime)) {
        throw createCustomError(
          "Invalid mintStartTime. Must be a valid timestamp",
          StatusCodes.BAD_REQUEST,
          "INVALID_TIMESTAMP_ERROR",
        );
      }

      if (!timestampValidator(mintEndTime)) {
        throw createCustomError(
          "Invalid mintEndTime. Must be a valid timestamp",
          StatusCodes.BAD_REQUEST,
          "INVALID_TIMESTAMP_ERROR",
        );
      }

      const payload = {
        to,
        currencyAddress,
        metadata,
        mintEndTime: mintEndTime ? new Date(mintEndTime) : undefined,
        mintStartTime: mintStartTime ? new Date(mintStartTime) : undefined,
        price,
        primarySaleRecipient,
        quantity,
        royaltyBps,
        royaltyRecipient,
        uid,
      };
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
