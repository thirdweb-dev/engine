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
  to_address: Type.String({
    description: "Address of the wallet to mint the NFT to",
  }),
  amount: Type.String({
    description: "The amount of tokens you want to send",
  }),
});

// Example for the Request Body
requestBodySchema.examples = [
  {
    to_address: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    amount: "0.1",
  },
];

export async function erc20mintTo(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain_name_or_id/:contract_address/erc20/mintTo",
    schema: {
      description: "Mint tokens to the connected wallet.",
      tags: ["ERC20"],
      operationId: "erc20_mintTo",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { to_address, amount } = request.body;
      const contract = await getContractInstance(
        chain_name_or_id,
        contract_address,
      );
      const tx = await contract.erc20.mintTo.prepare(to_address, amount);
      const queuedId = await queueTransaction(
        request,
        tx,
        chain_name_or_id,
        "erc20",
      );
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
