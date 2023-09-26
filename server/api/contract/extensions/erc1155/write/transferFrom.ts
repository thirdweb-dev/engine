import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { walletAuthSchema } from "../../../../../../core/schema";
import { queueTx } from "../../../../../../src/db/transactions/queueTx";
import {
  erc1155ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { txOverridesForWriteRequest } from "../../../../../schemas/web3api-overrides";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

// INPUTS
const requestSchema = erc1155ContractParamSchema;
const requestBodySchema = Type.Object({
  from: Type.String({
    description: "Address of the token owner",
  }),
  to: Type.String({
    description: "Address of the wallet to transferFrom to",
  }),
  token_id: Type.String({
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
    token_id: "0",
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
    url: "/contract/:chain/:contract_address/erc1155/transfer-from",
    schema: {
      description: "Transfer an NFT from a specific wallet to another wallet.",
      tags: ["ERC1155"],
      operationId: "erc1155_transferFrom",
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
      const { from, to, token_id, amount } = request.body;
      const walletAddress = request.headers["x-wallet-address"] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.erc1155.transferFrom.prepare(
        from,
        to,
        token_id,
        amount,
      );
      const queuedId = await queueTx({ tx, chainId, extension: "erc1155" });
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
