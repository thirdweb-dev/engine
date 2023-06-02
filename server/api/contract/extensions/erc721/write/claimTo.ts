import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static, Type } from "@sinclair/typebox";
import { getContractInstace } from "../../../../../../core/index";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { queueTransaction } from "../../../../../helpers";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  receiver: Type.String({
    description: "Address of the wallet to claim the NFT to",
  }),
  quantity: Type.String({
    description: "Quantity of NFTs to mint",
  }),
});

requestBodySchema.examples = [
  {
    receiver: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    quantity: "1",
  },
];

export async function erc721claimTo(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain_name_or_id/:contract_address/erc721/claimTo",
    schema: {
      description: "Claim an NFT to a specific wallet.",
      tags: ["ERC721"],
      operationId: "erc721_claimTo",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { receiver, quantity } = request.body;
      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const tx = await contract.erc721.claimTo.prepare(receiver, quantity);
      const queuedId = await queueTransaction(
        request,
        tx,
        chain_name_or_id,
        "erc721",
      );
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
