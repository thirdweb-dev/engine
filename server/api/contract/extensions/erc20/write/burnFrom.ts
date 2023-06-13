import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static, Type } from "@sinclair/typebox";
import { getContractInstance } from "../../../../../../core/index";
import {
  erc20ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { queueTransaction } from "../../../../../helpers";

// INPUTS
const requestSchema = erc20ContractParamSchema;
const requestBodySchema = Type.Object({
  holder_address: Type.String({
    description: "Address of the wallet sending the tokens",
  }),
  amount: Type.String({
    description: "The amount of this token you want to burn",
  }),
});

// Example for the Request Body
requestBodySchema.examples = [
  {
    holder_address: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    amount: "0.1",
  },
];

export async function erc20burnFrom(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:network/:contract_address/erc20/burnFrom",
    schema: {
      description:
        "Burn tokens held by a specified wallet (requires allowance).",
      tags: ["ERC20"],
      operationId: "erc20_burnFrom",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { holder_address, amount } = request.body;
      const contract = await getContractInstance(network, contract_address);
      const tx = await contract.erc20.burnFrom.prepare(holder_address, amount);
      const queuedId = await queueTransaction(request, tx, network, "erc20");
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
