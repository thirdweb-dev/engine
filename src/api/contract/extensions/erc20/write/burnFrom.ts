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
    holder_address: Type.String({
        description: "Address of the wallet sending the tokens",
    }),
    amount: Type.String({
      description: 'The amount of this token you want to burn',
     }),
  });
  
  // Example for the Request Body
  requestBodySchema.examples = [
    {
      holder_address: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
      amount: "0.1",
    },
  ];

// OUTPUT
const responseSchema = Type.Object({
  queuedId: Type.Optional(Type.String()),
  error: Type.Optional(baseReplyErrorSchema),
});

export async function erc20burnFrom(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain_name_or_id/:contract_address/erc20/burnFrom",
    schema: {
      description: "Burn tokens held by a specified wallet (requires allowance).",
      tags: ["ERC20"],
      operationId: "erc20_burnFrom",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { holder_address, amount } = request.body;
      const sdk = await getSDK(chain_name_or_id);
      const contract = await sdk.getContract(contract_address);
      const tx = await contract.erc20.burnFrom.prepare(holder_address, amount);
      const queuedId = await queueTransaction(
        request,
        tx,
        chain_name_or_id,
        "erc20",
      );
      reply.status(StatusCodes.OK).send({
        queuedId,
      });
    },
  });
}
