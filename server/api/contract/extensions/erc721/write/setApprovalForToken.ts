import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../src/db/transactions/queueTx";
import {
  contractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { walletAuthSchema } from "../../../../../schemas/wallet";
import { txOverridesForWriteRequest } from "../../../../../schemas/web3api-overrides";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  operator: Type.String({
    description: "Address of the operator to give approval to",
  }),
  token_id: Type.String({
    description: "the tokenId to give approval for",
  }),
  ...txOverridesForWriteRequest.properties,
});

requestBodySchema.examples = [
  {
    operator: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    token_id: "0",
  },
];

export async function erc721SetApprovalForToken(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contract_address/erc721/set-approval-for-token",
    schema: {
      summary: "Set approval for token",
      description:
        "Approve an operator for the NFT owner. Operators can call transferFrom or safeTransferFrom for the specific token.",
      tags: ["ERC721"],
      operationId: "erc721_setApprovalForToken",
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
      const { operator, token_id } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.erc721.setApprovalForToken.prepare(
        operator,
        token_id,
      );
      const queueId = await queueTx({ tx, chainId, extension: "erc721" });
      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
