import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../../core/index";
import { queueTx } from "../../../../../../src/db/transactions/queueTx";
import {
  erc20ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { web3APIOverridesForWriteRequest } from "../../../../../schemas/web3api-overrides";
import { getChainIdFromChain } from "../../../../../utilities/chain";

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
  ...web3APIOverridesForWriteRequest.properties,
});

// Example for the Request Body
requestBodySchema.examples = [
  {
    from_address: "0x....",
    to_address: "0x...",
    amount: "0.1",
    web3api_overrides: {
      from: "0x...",
    },
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
      const { from_address, to_address, amount, web3api_overrides } =
        request.body;
      const chainId = getChainIdFromChain(network);

      const contract = await getContractInstance(
        network,
        contract_address,
        web3api_overrides?.from,
      );

      const tx = await contract.erc20.transferFrom.prepare(
        from_address,
        to_address,
        amount,
      );

      const queuedId = await queueTx({ tx, chainId, extension: "erc20" });

      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
