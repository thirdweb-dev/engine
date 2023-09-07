import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../../core/index";
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
  operator: Type.String({
    description: "Address of the operator to give approval to",
  }),
  approved: Type.Boolean({
    description: "wheter to approve or revoke approval",
  }),
  ...web3APIOverridesForWriteRequest.properties,
});

requestBodySchema.examples = [
  {
    operator: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    approved: "true",
    web3api_overrides: {
      from: "0x...",
    },
  },
];

// OUTPUT

export async function erc1155SetApprovalForAll(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:network/:contract_address/erc1155/setApprovalForAll",
    schema: {
      description:
        "Approve or remove operator as an operator for the caller. Operators can call transferFrom or safeTransferFrom for any token in the specified contract owned by the caller.",
      tags: ["ERC1155"],
      operationId: "erc1155_setApprovalForAll",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { operator, approved, web3api_overrides } = request.body;

      const contract = await getContractInstance(
        network,
        contract_address,
        web3api_overrides?.from,
      );
      const tx = await contract.erc1155.setApprovalForAll.prepare(
        operator,
        approved,
      );
      const queuedId = await queueTransaction(request, tx, network, "erc1155");
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
