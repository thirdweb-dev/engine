import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static, Type } from "@sinclair/typebox";
import { getContractInstance } from "../../../../../../core";
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
    description: "Address of the wallet to mint the NFT to",
  }),
  token_id: Type.String({
    description: "Token ID to mint additional supply to",
  }),
  additional_supply: Type.String({
    description: "The amount of supply to mint",
  }),
});

requestBodySchema.examples = [
  {
    receiver: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    token_id: "1",
    additional_supply: "10",
  },
];

export async function erc1155mintAdditionalSupplyTo(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain_name_or_id/:contract_address/erc1155/mintAdditionalSupplyTo",
    schema: {
      description: "Mint additional supply of an NFT to a specific wallet.",
      tags: ["ERC1155"],
      operationId: "mintAdditionalSupplyTo",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { receiver, additional_supply, token_id } = request.body;
      const contract = await getContractInstance(
        chain_name_or_id,
        contract_address,
      );
      const tx = await contract.erc1155.mintAdditionalSupplyTo.prepare(
        receiver,
        token_id,
        additional_supply,
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
