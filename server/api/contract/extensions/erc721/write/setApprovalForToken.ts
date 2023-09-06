import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../../core/index";
import { queueTransaction } from "../../../../../helpers";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { web3APIOverridesForWriteRequest } from "../../../../../schemas/web3api-overrides";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  operator: Type.String({
    description: "Address of the operator to give approval to",
  }),
  token_id: Type.String({
    description: "the tokenId to give approval for",
  }),
  ...web3APIOverridesForWriteRequest.properties,
});

requestBodySchema.examples = [
  {
    operator: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    token_id: "0",
    web3api_overrides: {
      from: "0x...",
    },
  },
];

export async function erc721SetApprovalForToken(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:network/:contract_address/erc721/setApprovalForToken",
    schema: {
      description:
        "Approve or remove operator as an operator for the caller. Operators can call transferFrom or safeTransferFrom for any token in the specified contract owned by the caller.",
      tags: ["ERC721"],
      operationId: "erc721_setApprovalForToken",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { operator, token_id, web3api_overrides } = request.body;

      const contract = await getContractInstance(
        network,
        contract_address,
        web3api_overrides?.from,
      );
      const tx = await contract.erc721.setApprovalForToken.prepare(
        operator,
        token_id,
      );
      const queuedId = await queueTransaction(request, tx, network, "erc721");
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
