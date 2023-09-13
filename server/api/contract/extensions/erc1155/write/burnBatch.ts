import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getContractInstance } from "../../../../../../core";
import { walletAuthSchema } from "../../../../../../core/schema";
import { queueTx } from "../../../../../../src/db/transactions/queueTx";
import {
  erc1155ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { txOverridesForWriteRequest } from "../../../../../schemas/web3api-overrides";
import { getChainIdFromChain } from "../../../../../utilities/chain";

// INPUTS
const requestSchema = erc1155ContractParamSchema;
const requestBodySchema = Type.Object({
  token_ids: Type.Array(
    Type.String({
      description: "The token IDs to burn",
    }),
  ),
  amounts: Type.Array(
    Type.String({
      description: "The amounts of tokens to burn",
    }),
  ),
  ...txOverridesForWriteRequest.properties,
});

requestBodySchema.examples = [
  {
    token_ids: ["0", "1"],
    amounts: ["1", "1"],
  },
];

// OUTPUT

export async function erc1155burnBatch(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:network/:contract_address/erc1155/burnBatch",
    schema: {
      description: "Burn multiple NFTs.",
      tags: ["ERC1155"],
      operationId: "erc1155_burnBatch",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletAuthSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { network, contract_address } = request.params;
      const { token_ids, amounts, tx_overrides } = request.body;
      const walletAddress = request.headers["x-wallet-address"] as string;
      const chainId = getChainIdFromChain(network);

      const contract = await getContractInstance(
        network,
        contract_address,
        walletAddress,
      );
      const tx = await contract.erc1155.burnBatch.prepare(token_ids, amounts);
      const queuedId = await queueTx({ tx, chainId, extension: "erc1155" });
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
