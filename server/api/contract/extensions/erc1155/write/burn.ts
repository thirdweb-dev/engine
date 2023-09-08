import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../../core";
import { queueTransaction } from "../../../../../helpers";
import {
  erc1155ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { web3APIOverridesForWriteRequest } from "../../../../../schemas/web3api-overrides";

// INPUTS
const requestSchema = erc1155ContractParamSchema;
const requestBodySchema = Type.Object({
  token_id: Type.String({
    description: "The token ID to burn",
  }),
  amount: Type.String({
    description: "The amount of tokens to burn",
  }),
  ...web3APIOverridesForWriteRequest.properties,
});

requestBodySchema.examples = [
  {
    token_id: "0",
    amount: "1",
    web3api_overrides: {
      from: "0x...",
    },
  },
];

export async function erc1155burn(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:network/:contract_address/erc1155/burn",
    schema: {
      description: "Burn an NFT.",
      tags: ["ERC1155"],
      operationId: "erc1155_burn",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { token_id, amount, web3api_overrides } = request.body;
      const contract = await getContractInstance(
        network,
        contract_address,
        web3api_overrides?.from,
      );
      const tx = await contract.erc1155.burn.prepare(token_id, amount);
      const queuedId = await queueTransaction(request, tx, network, "erc1155");
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
