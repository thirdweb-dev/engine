import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../shared/db/transactions/queue-tx";
import { getContract } from "../../../../../../shared/utils/cache/getContract";
import { AddressSchema } from "../../../../../schemas/address";
import {
  erc20ContractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../../../schemas/txOverrides";
import { walletWithAAHeaderSchema } from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUTS
const requestSchema = erc20ContractParamSchema;
const requestBodySchema = Type.Object({
  data: Type.Array(
    Type.Object({
      toAddress: {
        ...AddressSchema,
        description: "The address to mint tokens to",
      },
      amount: Type.String({
        description: "The number of tokens to mint to the specific address.",
      }),
    }),
  ),
  ...txOverridesWithValueSchema.properties,
});

requestBodySchema.examples = [
  {
    data: [
      {
        toAddress: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
        amount: "0.1",
      },
      {
        toAddress: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473",
        amount: "0.1",
      },
    ],
  },
];

export async function erc20mintBatchTo(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc20/mint-batch-to",
    schema: {
      summary: "Mint tokens (batch)",
      description: "Mint ERC-20 tokens to multiple wallets in one transaction.",
      tags: ["ERC20"],
      operationId: "erc20-mintBatchTo",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletWithAAHeaderSchema,
      querystring: requestQuerystringSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress } = request.params;
      const { simulateTx } = request.query;
      const { data, txOverrides } = request.body;
      const {
        "x-backend-wallet-address": walletAddress,
        "x-account-address": accountAddress,
        "x-idempotency-key": idempotencyKey,
      } = request.headers as Static<typeof walletWithAAHeaderSchema>;

      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
        walletAddress,
        accountAddress,
      });
      const tx = await contract.erc20.mintBatchTo.prepare(data);

      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "erc20",
        idempotencyKey,
        txOverrides,
      });

      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
