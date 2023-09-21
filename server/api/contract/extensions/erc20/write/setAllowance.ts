import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { walletAuthSchema } from "../../../../../../core/schema";
import { queueTx } from "../../../../../../src/db/transactions/queueTx";
import {
  erc20ContractParamSchema,
  standardResponseSchema,
  transactionWritesResponseSchema,
} from "../../../../../helpers/sharedApiSchemas";
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
      description:
        "Grant allowance to another wallet address to spend the connected (Admin) wallet's funds (of this token).",
      tags: ["ERC20"],
      operationId: "erc20_setAllowance",
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
      const walletAddress = request.headers["x-wallet-address"] as string;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
        walletAddress,
      });

      const tx = await contract.erc20.setAllowance.prepare(
        spender_address,
        amount,
      );
      const queuedId = await queueTx({ tx, chainId, extension: "erc20" });
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
