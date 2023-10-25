import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { queueTx } from "../../../../../../src/db/transactions/queueTx";
import {
  erc20ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
import { walletAuthSchema } from "../../../../../schemas/wallet";
import { txOverridesForWriteRequest } from "../../../../../schemas/web3api-overrides";
import { getChainIdFromChain } from "../../../../../utilities/chain";
import { getContract } from "../../../../../utils/cache/getContract";

// INPUTS
const requestSchema = erc20ContractParamSchema;
const requestBodySchema = Type.Object({
  spender_address: Type.String({
    description: "Address of the wallet to allow transfers from",
  }),
  amount: Type.String({
    description: "The number of tokens to give as allowance",
  }),
  ...txOverridesForWriteRequest.properties,
});

requestBodySchema.examples = [
  {
    spender_address: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
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
    url: "/contract/:chain/:contract_address/erc20/set-allowance",
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
      const { chain, contract_address } = request.params;
      const { spender_address, amount } = request.body;
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

      const tx = await contract.erc20.setAllowance.prepare(
        spender_address,
        amount,
      );
      const queueId = await queueTx({ tx, chainId, extension: "erc20" });
      reply.status(StatusCodes.OK).send({
        result: {
          queueId,
        },
      });
    },
  });
}
