import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  erc721ContractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import {
  ercNFTResponseType,
  signature1155InputSchema,
  signature1155OutputSchema,
} from "../../../../../schemas/nft";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { checkAndReturnNFTSignaturePayload } from "../../../../../utilities/validator";
import { getContract } from "../../../../../utils/cache/getContract";

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
    url: "/contract/:chain/:contract_address/erc1155/signature/generate",
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
      const { chain, contract_address } = request.params;
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
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
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
