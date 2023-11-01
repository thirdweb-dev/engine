import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../utils/cache/getContract";
import {
  erc1155ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { walletAuthSchema } from "../../../../../schemas/wallet";
import { txOverridesForWriteRequest } from "../../../../../schemas/web3api-overrides";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUTS
const requestSchema = erc1155ContractParamSchema;
const requestBodySchema = Type.Object({
  from: Type.String({
    description: "Address of the token owner",
  }),
  to: Type.String({
    description: "Address of the wallet to transferFrom to",
  }),
  tokenId: Type.String({
    description: "the tokenId to transferFrom",
  }),
  amount: Type.String({
    description: "the amount of tokens to transfer",
  }),
  ...txOverridesForWriteRequest.properties,
});

requestBodySchema.examples = [
  {
    from: "0xE79ee09bD47F4F5381dbbACaCff2040f2FbC5803",
    to: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    tokenId: "0",
    amount: "1",
  },
];

// OUTPUT

export async function erc1155transferFrom(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc1155/transfer-from",
    schema: {
      summary: "Transfer token from wallet",
      description:
        "Transfer an ERC-1155 token from the connected wallet to another wallet. Requires allowance.",
      tags: ["ERC1155"],
      operationId: "transferFrom",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletAuthSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { from, to, tokenId, amount } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.erc1155.transferFrom.prepare(
        from,
        to,
        tokenId,
        amount,
      );
      const queueId = await queueTx({ tx, chainId, extension: "erc1155" });
      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
