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
  from_address: Type.String({
    description: "Address of the wallet sending the tokens",
  }),
  to_address: Type.String({
    description: "Address of the wallet you want to send the tokens to",
  }),
  amount: Type.String({
    description: "The amount of tokens you want to send",
  }),
  ...txOverridesForWriteRequest.properties,
});

// Example for the Request Body
requestBodySchema.examples = [
  {
    from_address: "0x....",
    to_address: "0x...",
    amount: "0.1",
  },
];

// OUTPUTS

export async function erc20TransferFrom(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof transactionWritesResponseSchema>;
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/contract/:chain/:contract_address/erc20/transfer-from",
    schema: {
      description:
        "Transfer tokens from the connected wallet to another wallet.",
      tags: ["ERC20"],
      operationId: "erc20_transferFrom",
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
      const { from_address, to_address, amount } = request.body;
      const walletAddress = request.headers["x-wallet-address"] as string;
      const chainId = getChainIdFromChain(chain);
      const contract = await getContract({
        chainId,
        contractAddress: contract_address,
        walletAddress,
      });

      const tx = await contract.erc20.transferFrom.prepare(
        from_address,
        to_address,
        amount,
      );

      const queuedId = await queueTx({ tx, chainId, extension: "erc20" });

      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
