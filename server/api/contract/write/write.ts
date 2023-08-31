import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../core";

import { queueTransaction } from "../../../helpers";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../helpers/sharedApiSchemas";
import { web3APIOverridesForWriteRequest } from "../../../schemas/web3api-overrides";

// INPUT
const writeRequestBodySchema = Type.Object({
  function_name: Type.String({
    description: "Name of the function to call on Contract",
  }),
  args: Type.Array(
    Type.String({
      description: "Arguments for the function. Comma Separated",
    }),
  ),
  ...web3APIOverridesForWriteRequest.properties,
});

// Adding example for Swagger File
writeRequestBodySchema.examples = [
  {
    function_name: "transferFrom",
    args: [
      "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
      "0x3EcDBF3B911d0e9052b64850693888b008e18373",
      "0",
    ],
  },
];

// LOGIC
export async function writeToContract(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof writeRequestBodySchema>;
    Params: Static<typeof contractParamSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
  }>({
    method: "POST",
    url: "/contract/:network/:contract_address/write",
    schema: {
      description: "Write to Contract",
      tags: ["Contract"],
      operationId: "write",
      params: contractParamSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
      body: writeRequestBodySchema,
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { function_name, args, web3api_overrides } = request.body;

      const contract = await getContractInstance(
        network,
        contract_address,
        web3api_overrides?.from,
      );
      const tx = await contract.prepare(function_name, args);

      const queuedId = await queueTransaction(
        request,
        tx,
        network,
        "non-extension",
      );

      reply.status(StatusCodes.OK).send({
        result: queuedId!,
      });
    },
  });
}
