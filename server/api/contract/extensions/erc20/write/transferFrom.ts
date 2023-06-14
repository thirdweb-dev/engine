import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Type, Static } from "@sinclair/typebox";
import {
  erc20ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { queueTransaction } from "../../../../../helpers";
import { getContractInstance } from "core";

// INPUTS
const requestSchema = erc20ContractParamSchema;
const requestBodySchema = Type.Object({
  from_address: Type.String({
    description: "Address of the wallet sending the tokens",
  }),
  to_address: Type.String({
    description: "Address of the wallet you want to send the tokens to",
  }),
  amount: Type.String({
    description: "The amount of tokens you want to send",
  }),
});

// Example for the Request Body
requestBodySchema.examples = [
  {
    from_address: "0x....",
    to_address: "0x...",
    amount: "0.1",
  },
];

// OUTPUTS

export async function erc20TransferFrom(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:network/:contract_address/erc20/transferFrom",
    schema: {
      description:
        "Transfer tokens from the connected wallet to another wallet.",
      tags: ["ERC20"],
      operationId: "erc20_transferFrom",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { from_address, to_address, amount } = request.body;
      const contract = await getContractInstance(network, contract_address);

      const tx = await contract.erc20.transferFrom.prepare(
        from_address,
        to_address,
        amount,
      );

      const queuedId = await queueTransaction(request, tx, network, "erc20");

      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
