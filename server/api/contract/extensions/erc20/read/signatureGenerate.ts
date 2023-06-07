import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstace } from "../../../../../../core/index";
import {
  erc721ContractParamSchema,
  standardResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { Static, Type } from "@sinclair/typebox";
import { signature20InputSchema } from "../../../../../schemas/erc20";

// INPUTS
const requestSchema = erc721ContractParamSchema;
const requestBodySche = signature20InputSchema;

// OUTPUT
const responseSchema = Type.Object({
  result: Type.Object({
    payload: signature20InputSchema,
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
    Body: Static<typeof requestBodySche>;
  }>({
    method: "POST",
    url: "/contract/:chain_name_or_id/:contract_address/erc20/signature/generate",
    schema: {
      description: `Generate a signature that a wallet address can use to mint the specified number of NFTs.
        This is typically an admin operation, where the owner of the contract generates a signature that 
        allows another wallet to mint tokens.`,
      tags: ["ERC20"],
      operationId: "erc20_signature_generate",
      params: requestSchema,
      body: requestBodySche,
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
        mintEndTime,
        mintStartTime,
        price,
        primarySaleRecipient,
        quantity,
        uid,
      } = request.body;
      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const payload = {
        to,
        currencyAddress,
        mintEndTime,
        mintStartTime,
        price,
        primarySaleRecipient,
        quantity,
        uid,
      };
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
