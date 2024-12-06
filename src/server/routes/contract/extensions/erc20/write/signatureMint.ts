import { Type, type Static } from "@sinclair/typebox";
import type { SignedPayload20 } from "@thirdweb-dev/sdk";
import { BigNumber } from "ethers";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../utils/cache/getContract";
import { signature20OutputSchema } from "../../../../../schemas/erc20";
import {
  contractParamSchema,
  requestQuerystringSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { txOverridesWithValueSchema } from "../../../../../schemas/txOverrides";
import { walletWithAAHeaderSchema } from "../../../../../schemas/wallet";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUTS
const requestSchema = contractParamSchema;
const requestBodySchema = Type.Object({
  payload: signature20OutputSchema,
  signature: Type.String(),
  ...txOverridesWithValueSchema.properties,
});

requestBodySchema.examples = [
  {
    payload: {},
    signature: "",
  },
];

export async function erc20SignatureMint(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
    Querystring: Static<typeof requestQuerystringSchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc20/signature/mint",
    schema: {
      summary: "Signature mint",
      description: "Mint ERC-20 tokens from a generated signature.",
      tags: ["ERC20"],
      operationId: "erc20-signatureMint",
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
      const { payload, signature, txOverrides } = request.body;
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

      const signedPayload: SignedPayload20 = {
        payload: {
          ...payload,
          quantity: BigNumber.from(payload.quantity).toString(),
          mintStartTime: BigNumber.from(payload.mintStartTime),
          mintEndTime: BigNumber.from(payload.mintEndTime),
        },
        signature,
      };
      const tx = await contract.erc20.signature.mint.prepare(signedPayload);

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
