import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { TransactionDB } from "../../../db/transactions/db";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import {
  TransactionSchema,
  toTransactionSchema,
} from "../../schemas/transaction";

const requestQuerySchema = Type.Object({
  page: Type.Integer({
    description: "Specify the page number for pagination.",
    examples: [1],
    default: 1,
    minimum: 1,
  }),
  limit: Type.Integer({
    description: "Specify the number of transactions to return per page.",
    examples: [10],
    default: 10,
    minimum: 1,
  }),
});

const responseBodySchema = Type.Object({
  result: Type.Object({
    transactions: Type.Array(TransactionSchema),
    totalCount: Type.Integer(),
  }),
});

responseBodySchema.example = {
  result: {
    transactions: [
      {
        queueId: "8fe7d546-2b8b-465e-b0d2-f1cb5d3d0db3",
        walletAddress: "0x3ecdbf3b911d0e9052b64850693888b008e18373",
        contractAddress: "0x5dbc7b840baa9dabcbe9d2492e45d7244b54a2a0",
        chainId: "80001",
        extension: "deploy_prebuilt",
        status: "submitted",
        encodedInputData:
          "0x11b804ab0000000000000000000000004fa15bae96f5816c268f3b473cf67e223644d536000000000000000000000000000000000000000000000000000000000000006033373131393539310000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000284e15916340000000000000000000000003ecdbf3b911d0e9052b64850693888b008e183730000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000000002200000000000000000000000003ecdbf3b911d0e9052b64850693888b008e18373000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000034949490000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000349494900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000037697066733a2f2f516d5553734471664a4879686375686f504e653650374566336547717864466e78516977526d37585a434234724b2f300000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c82bbe41f2cf04e3a8efa18f7032bdd7f6d98a810000000000000000000000009399bb24dbb5c4b782c70c2969f58716ebbd6a3b00000000000000000000000000000000000000000000000000000000",
        txType: 2,
        gasPrice: "",
        gasLimit: "925188",
        maxPriorityFeePerGas: "1500000000",
        maxFeePerGas: "1500000032",
        txHash:
          "0x383b0ef55b76f1848f81c1016580f83faf3cde9f6affd66f789e741e39861f30",
        submittedTxNonce: 111,
        createdTimestamp: "2023-06-21T18:05:18.979Z",
        txSubmittedTimestamp: "2023-06-21T18:05:21.823Z",
        txProcessedTimestamp: "2023-06-21T18:05:21.823Z",
        deployedContractAddress: "0x8dE0E40e8a5108Da3e0D65cFc908269fE083DfE7",
        contractType: "edition",
      },
    ],
    totalCount: 1,
  },
};

export async function getAllDeployedContracts(fastify: FastifyInstance) {
  fastify.route<{
    Querystring: Static<typeof requestQuerySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/transaction/get-all-deployed-contracts",
    schema: {
      summary: "Get all deployment transactions",
      description: "Get all transaction requests to deploy contracts.",
      tags: ["Transaction"],
      operationId: "getAllDeployedContracts",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { page, limit } = request.query;

      const { transactions } = await TransactionDB.getTransactionListByStatus({
        status: "queued",
        page,
        limit,
      });
      const deploymentTransactions = transactions.filter(
        (t) => !!t.deployedContractAddress,
      );

      reply.status(StatusCodes.OK).send({
        result: {
          transactions: deploymentTransactions.map(toTransactionSchema),
          // @TODO: this is inaccurate.
          totalCount: 0,
        },
      });
    },
  });
}
