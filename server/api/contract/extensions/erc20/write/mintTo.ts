import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../../core/index";
import { queueTransaction } from "../../../../../helpers";
import {
  erc20ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { web3APIOverridesForWriteRequest } from "../../../../../schemas/web3api-overrides";

// INPUTS
const requestSchema = erc20ContractParamSchema;
const requestBodySchema = Type.Object({
  to_address: Type.String({
    description: "Address of the wallet to mint the NFT to",
  }),
  amount: Type.String({
    description: "The amount of tokens you want to send",
  }),
  ...web3APIOverridesForWriteRequest.properties,
});

// Example for the Request Body
requestBodySchema.examples = [
  {
    to_address: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    amount: "0.1",
    web3api_overrides: {
      from: "0x...",
    },
  },
];

export async function erc20mintTo(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:network/:contract_address/erc20/mintTo",
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
      const { network, contract_address } = request.params;
      const { to_address, amount, web3api_overrides } = request.body;

      const contract = await getContractInstance(
        network,
        contract_address,
        web3api_overrides?.from,
      );
      const tx = await contract.erc20.mintTo.prepare(to_address, amount);
      const queuedId = await queueTransaction(request, tx, network, "erc20");
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
