import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../src/db/transactions/queueTx";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { walletAuthSchema } from "../../../../../schemas/wallet";
import { txOverridesForWriteRequest } from "../../../../../schemas/web3api-overrides";
import { getContract } from "../../../../../utils/cache/getContract";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  to: Type.String({
    description: "Address of the wallet to transfer to",
  }),
  token_id: Type.String({
    description: "The tokenId to transfer",
  }),
  ...txOverridesForWriteRequest.properties,
});

requestBodySchema.examples = [
  {
    to: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    token_id: "0",
  },
];

export async function erc721transfer(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contract_address/erc721/transfer",
    schema: {
      summary: "Transfer token",
      description: "Transfer an ERC-721 token from the caller wallet.",
      tags: ["ERC721"],
      operationId: "transfer",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletAuthSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contract_address } = request.params;
      const { to, token_id } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-addressaddress"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.erc721.transfer.prepare(to, token_id);
      const queueId = await queueTx({ tx, chainId, extension: "erc721" });
      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
