import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Hex, toSerializableTransaction } from "thirdweb";
import { getAccount } from "../../../utils/account";
import { getChain } from "../../../utils/chain";
import { getChecksumAddress } from "../../../utils/primitiveTypes";
import { thirdwebClient } from "../../../utils/sdk";
import { AddressSchema, TransactionHashSchema } from "../../schemas/address";
import {
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseBodySchema,
} from "../../schemas/sharedApiSchemas";
import { txOverridesSchema } from "../../schemas/txOverrides";
import { walletWithAddressParamSchema } from "../../schemas/wallet";
import { parseTransactionOverrides } from "../../utils/transactionOverrides";

const requestSchema = Type.Omit(walletWithAddressParamSchema, [
  "walletAddress",
]);
const requestBodySchema = Type.Object({
  chainId: Type.Number({ description: "The chain ID." }),
  walletAddress: {
    ...AddressSchema,
    description: "The backend wallet address.",
  },
  fromNonce: Type.Number(),
  toNonce: Type.Optional(Type.Number()),
  ...txOverridesSchema.properties,
});

const responseBodySchema = Type.Object({
  result: Type.Array(
    Type.Object({
      nonce: Type.Number(),
      transactionHash: TransactionHashSchema,
    }),
  ),
});

responseBodySchema.example = {
  result: [
    {
      nonce: 10,
      transactionHash:
        "0x1f31b57601a6f90312fd5e57a2924bc8333477de579ee37b197a0681ab438431",
    },
  ],
};

export async function cancelNoncesRoute(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseBodySchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/admin/cancel-nonces",
    schema: {
      summary: "Cancel nonces",
      description:
        "Send no-op transactions to cancel nonces for a backend wallet.",
      tags: ["Admin"],
      operationId: "cancelNonces",
      params: requestSchema,
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
      hide: true,
    },
    handler: async (request, reply) => {
      const {
        chainId,
        walletAddress,
        fromNonce,
        // If not provided, only cancel `fromNonce`.
        toNonce = fromNonce,
        txOverrides,
      } = request.body;

      const from = getChecksumAddress(walletAddress);
      const chain = await getChain(chainId);
      const account = await getAccount({ chainId, from });

      const result: { nonce: number; transactionHash: Hex }[] = [];
      for (let nonce = fromNonce; nonce <= toNonce; nonce++) {
        const populatedTransaction = await toSerializableTransaction({
          from,
          transaction: {
            client: thirdwebClient,
            chain,
            to: from,
            data: "0x",
            value: 0n,
            nonce,
            ...parseTransactionOverrides(txOverrides),
          },
        });

        const { transactionHash } =
          await account.sendTransaction(populatedTransaction);
        result.push({ nonce, transactionHash });
      }

      reply.status(StatusCodes.OK).send({
        result,
      });
    },
  });
}
