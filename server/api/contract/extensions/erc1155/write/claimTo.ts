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
  receiver: Type.String({
    description: "Address of the wallet to claim the NFT to",
  }),
  token_id: Type.String({
    description: "Token ID of the NFT to claim",
  }),
  quantity: Type.String({
    description: "Quantity of NFTs to mint",
  }),
  ...web3APIOverridesForWriteRequest.properties,
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
    url: "/contract/:network/:contract_address/erc1155/claimTo",
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
      const { network, contract_address } = request.params;
      const { receiver, token_id, quantity, web3api_overrides } = request.body;

      const contract = await getContractInstance(
        network,
        contract_address,
        web3api_overrides?.from,
      );
      const tx = await contract.erc1155.claimTo.prepare(
        receiver,
        token_id,
        quantity,
      );
      const queuedId = await queueTransaction(request, tx, network, "erc1155");
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
