import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../db/transactions/queueTx";
import { getContract } from "../../../../../../utils/cache/getContract";
import {
  erc20ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../schemas/sharedApiSchemas";
import { walletAuthSchema } from "../../../../../schemas/wallet";
import { txOverridesForWriteRequest } from "../../../../../schemas/web3api-overrides";
import { getChainIdFromChain } from "../../../../../utils/chain";

// INPUTS
const requestSchema = erc20ContractParamSchema;
const requestBodySchema = Type.Object({
  spenderAddress: Type.String({
    description: "Address of the wallet to allow transfers from",
  }),
  amount: Type.String({
    description: "The number of tokens to give as allowance",
  }),
  ...txOverridesForWriteRequest.properties,
});

requestBodySchema.examples = [
  {
    spenderAddress: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
    amount: "100",
  },
];

export async function erc20SetAlowance(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contractAddress/erc20/set-allowance",
    schema: {
      summary: "Set allowance",
      description:
        "Grant a specific wallet address to transfer ERC-20 tokens from the caller wallet.",
      tags: ["ERC20"],
      operationId: "setAllowance",
      params: requestSchema,
      body: requestBodySchema,
      headers: walletAuthSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: transactionWritesResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { chain, contractAddress, simulateTx } = request.params;
      const { spenderAddress, amount } = request.body;
      const walletAddress = request.headers[
        "x-backend-wallet-address"
      ] as string;
      const accountAddress = request.headers["x-account-address"] as string;
      const chainId = await getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress,
        walletAddress,
        accountAddress,
      });

      const tx = await contract.erc20.setAllowance.prepare(
        spenderAddress,
        amount,
      );
      const queueId = await queueTx({
        tx,
        chainId,
        simulateTx,
        extension: "erc20",
      });
      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
