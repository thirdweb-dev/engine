import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../core";
import { walletAuthSchema } from "../../../../core/schema";

import { queueTx } from "../../../../src/db/transactions/queueTx";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../helpers/sharedApiSchemas";
import { txOverridesForWriteRequest } from "../../../schemas/web3api-overrides";
import { getChainIdFromChain } from "../../../utilities/chain";

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
  ...txOverridesForWriteRequest.properties,
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
    tx_overrides: {
      value: "0.0001",
    },
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
      headers: walletAuthSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
      body: writeRequestBodySchema,
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { function_name, args, tx_overrides } = request.body;
      const walletAddress = request.headers["x-wallet-address"] as string;
      const chainId = getChainIdFromChain(network);

      const contract = await getContractInstance(
        network,
        contract_address,
        walletAddress,
      );
      const tx = await contract.prepare(function_name, args, {
        value: tx_overrides?.value,
        from: walletAddress,
      });

      const queuedId = await queueTx({ tx, chainId, extension: "none" });

      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
