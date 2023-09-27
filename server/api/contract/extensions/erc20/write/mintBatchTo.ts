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
  data: Type.Array(
    Type.Object({
      toAddress: Type.String({
        description: "The address to mint tokens to",
      }),
      amount: Type.String({
        description: "The number of tokens to mint to the specified address.",
      }),
    }),
  ),
  ...txOverridesForWriteRequest.properties,
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
  }>({
    method: "POST",
    url: "/contract/:chain/:contract_address/erc20/mint-batch-to",
    schema: {
      description: "Mint tokens to many wallets in one transaction.",
      tags: ["ERC20"],
      operationId: "erc20_mintBatchTo",
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
      const { data } = request.body;
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

      const tx = await contract.erc20.mintBatchTo.prepare(data);
      const queuedId = await queueTx({ tx, chainId, extension: "erc20" });
      reply.status(StatusCodes.OK).send({
        result: queuedId,
      });
    },
  });
}
