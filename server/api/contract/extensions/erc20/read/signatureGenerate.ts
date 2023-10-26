import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import {
  erc721ContractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import {
  erc20ResponseType,
  signature20InputSchema,
  signature20OutputSchema,
} from "../../../../../schemas/erc20";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { checkAndReturnERC20SignaturePayload } from "../../../../../utilities/validator";
import { getContract } from "../../../../../utils/cache/getContract";

// INPUTS
const requestSchema = erc721ContractParamSchema;
const requestBodySchema = signature20InputSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Object({
    payload: signature20OutputSchema,
    signature: Type.String(),
  }),
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
    url: "/contract/:chain/:contract_address/erc20/signature/generate",
    schema: {
      summary: "Generate signature",
      description:
        "Generate a signature granting access for another wallet to mint tokens from this ERC-20 contract. This method is typically called by the token contract owner.",
      tags: ["ERC20"],
      operationId: "signatureGenerate",
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
        mintEndTime,
        mintStartTime,
        price,
        primarySaleRecipient,
        quantity,
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
