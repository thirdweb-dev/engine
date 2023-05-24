import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static, Type } from "@sinclair/typebox";
import { getSDK, queueTransaction } from "../../../../../helpers/index";
import {
  contractParamSchema,
  standardResponseSchema,
  baseReplyErrorSchema,
} from "../../../../../helpers/sharedApiSchemas";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  token_id: Type.String({
    description: "The token ID to burn",
  }),
  amount: Type.String({
    description: "The amount of tokens to burn",
  }),
});

requestBodySchema.examples = [
  {
    token_id: "0",
    amount: "1",
  },
];

// OUTPUT
const responseSchema = Type.Object({
  queuedId: Type.Optional(Type.String()),
  error: Type.Optional(baseReplyErrorSchema),
});

export async function erc1155burn(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain_name_or_id/:contract_address/erc1155/burn",
    schema: {
      description: "Burn an NFT.",
      tags: ["ERC1155"],
      operationId: "burn",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { token_id, amount } = request.body;
      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);
      const tx = await contract.erc1155.burn.prepare(token_id, amount);
      const queuedId = await queueTransaction(
        request,
        tx,
        chain_name_or_id,
        "erc1155",
      );
      reply.status(StatusCodes.OK).send({
        queuedId,
      });
    },
  });
}
