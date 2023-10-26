import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  erc721ContractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import {
  ercNFTResponseType,
  signature721InputSchema,
  signature721OutputSchema,
} from "../../../../../schemas/nft";
import { walletAuthSchema } from "../../../../../schemas/wallet";
import { txOverridesForWriteRequest } from "../../../../../schemas/web3api-overrides";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { checkAndReturnNFTSignaturePayload } from "../../../../../utilities/validator";
import { getContract } from "../../../../../utils/cache/getContract";

// INPUTS
const requestSchema = erc721ContractParamSchema;
const requestBodySchema = Type.Object({
  ...signature721InputSchema.properties,
  ...txOverridesForWriteRequest.properties,
});

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Object({
    payload: signature721OutputSchema,
    signature: Type.String(),
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
    url: "/contract/:chain/:contract_address/erc721/signature/generate",
    schema: {
      summary: "Generate signature",
      description:
        "Generate a signature granting access for another wallet to mint tokens from this ERC-721 contract. This method is typically called by the token contract owner.",
      tags: ["ERC721"],
      operationId: "signatureGenerate",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletAuthSchema,
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
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
        walletAddress,
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
