import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static, Type } from "@sinclair/typebox";
import { getSDK } from "../../../../../../core/index";
import {
  contractParamSchema,
  standardResponseSchema,
  baseReplyErrorSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { queueTransaction } from "../../../../../helpers";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  from: Type.String({
    description: "Address of the token owner",
  }),
  to: Type.String({
    description: "Address of the wallet to transferFrom to",
  }),
  token_id: Type.String({
    description: "the tokenId to transferFrom",
  }),
  amount: Type.String({
    description: "the amount of tokens to transfer",
  }),
});

requestBodySchema.examples = [
  {
    from: "0xE79ee09bD47F4F5381dbbACaCff2040f2FbC5803",
    to: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    token_id: "0",
    amount: "1",
  },
];

// OUTPUT
const responseSchema = Type.Object({
  queuedId: Type.Optional(Type.String()),
  error: Type.Optional(baseReplyErrorSchema),
});

export async function erc1155transferFrom(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain_name_or_id/:contract_address/erc1155/transferFrom",
    schema: {
      description: "Transfer an NFT from a specific wallet to another wallet.",
      tags: ["ERC1155"],
      operationId: "erc1155_transferFrom",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { from, to, token_id, amount } = request.body;
      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);
      //@ts-ignore
      const tx = await contract.erc1155.transferFrom.prepare(
        from,
        to,
        token_id,
        amount,
      );
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
