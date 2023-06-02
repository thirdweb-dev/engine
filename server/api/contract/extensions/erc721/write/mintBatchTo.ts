import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static, Type } from "@sinclair/typebox";
import { getContractInstace } from "../../../../../../core/index";
import {
  contractParamSchema,
  standardResponseSchema,
  baseReplyErrorSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { nftOrInputSchema } from "../../../../../schemas/nft";
import { queueTransaction } from "../../../../../helpers";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  receiver: Type.String({
    description: "Address of the wallet to mint the NFT to",
  }),
  metadatas: Type.Array(nftOrInputSchema),
});

requestBodySchema.examples = [
  {
    receiver: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    metadata: [
      {
        name: "My NFT #1",
        description: "My NFT #1 description",
        image: "ipfs://QmciR3WLJsf2BgzTSjbG5zCxsrEQ8PqsHK7JWGWsDSNo46/nft.png",
      },
      {
        name: "My NFT #2",
        description: "My NFT #2 description",
        image: "ipfs://QmciR3WLJsf2BgzTSjbG5zCxsrEQ8PqsHK7JWGWsDSNo46/nft.png",
      },
    ],
  },
];

export async function erc721mintBatchTo(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain_name_or_id/:contract_address/erc721/mintBatchTo",
    schema: {
      description: "Mint multiple NFTs to a specific wallet.",
      tags: ["ERC721"],
      operationId: "erc721_mintBatchTo",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain_name_or_id, contract_address } = request.params;
      const { receiver, metadatas } = request.body;
      const contract = await getContractInstace(
        chain_name_or_id,
        contract_address,
      );
      const tx = await contract.erc721.mintBatchTo.prepare(receiver, metadatas);
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
