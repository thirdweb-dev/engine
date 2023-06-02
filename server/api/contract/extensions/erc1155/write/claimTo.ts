import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static, Type } from "@sinclair/typebox";
import { getContractInstace } from "../../../../../../core";
import {
  erc1155ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { queueTransaction } from "../../../../../helpers";

// INPUTS
const requestSchema = erc1155ContractParamSchema;
const requestBodySchema = Type.Object({
  receiver: Type.String({
    description: "Address of the wallet to claim the NFT to",
  }),
  token_id: Type.String({
    description: "Token ID of the NFT to claim",
  }),
  quantity: Type.String({
    description: "Quantity of NFTs to mint",
  }),
});

requestBodySchema.examples = [
  {
    receiver: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    token_id: "0",
    quantity: "1",
  },
];

export async function erc1155claimTo(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain_name_or_id/:contract_address/erc1155/claimTo",
    schema: {
      description: "Claim an NFT to a specific wallet.",
      tags: ["ERC1155"],
      operationId: "erc1155_claimTo",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { receiver, token_id, quantity } = request.body;
      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const tx = await contract.erc1155.claimTo.prepare(
        receiver,
        token_id,
        quantity,
      );
      const queuedId = await queueTransaction(
        request,
        tx,
        chain_name_or_id,
        "erc1155",
      );
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
