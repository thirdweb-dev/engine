import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../../middleware/error";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";
import { transactionResponseSchema } from "../../../schemas/transaction";

// INPUT
const requestSchema = Type.Object({
  transactionHash: Type.String({
    description: "Transaction queue ID",
    examples: [""],
    pattern: "^0x([A-Fa-f0-9]{64})$",
  }),
  chain: Type.String({
    examples: ["mumbai"],
    description: "Chain ID or name",
  }),
});

// OUTPUT
export const responseBodySchema = Type.Object({
  result: transactionResponseSchema,
});

responseBodySchema.example = {
  result: {
    queueId: "a20ed4ce-301d-4251-a7af-86bd88f6c015",
    walletAddress: "0x3ecdbf3b911d0e9052b64850693888b008e18373",
    contractAddress: "0x365b83d67d5539c6583b9c0266a548926bf216f4",
    chainId: "80001",
    extension: "non-extension",
    status: "mined",
    encodedInputData:
      "0xa9059cbb0000000000000000000000001946267d81fb8adeeea28e6b98bcd446c824847300000000000000000000000000000000000000000000000000000000000186a0",
    txType: 2,
    gasPrice: "1500000017",
    gasLimit: "46512",
    maxPriorityFeePerGas: "1500000000",
    maxFeePerGas: "1500000034",
    txHash:
      "0x6de86da898fa4beb13d965c42bf331ad46cfa061cadf75f69791f31c9d8a4f66",
    submittedTxNonce: 698,
    createdTimestamp: "2023-08-25T22:42:26.910Z",
    txProcessedTimestamp: "2023-08-25T22:42:27.302Z",
    txSubmittedTimestamp: "2023-08-25T22:42:28.743Z",
    deployedContractAddress: "",
    contractType: "",
    errorMessage: "",
    txMinedTimestamp: "2023-08-25T22:42:33.000Z",
    blockNumber: 39398545,
    onChainTxStatus: 1,
  },
};

export async function checkTxStatus(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/transaction/:chain/:transactionHash",
    schema: {
      summary: "Get blockchain transaction hash details",
      description: "Get blockchain transaction hash details",
      tags: ["Transaction"],
      operationId: "blockchainTxHashReceipt",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { queueId } = request.params;
      const returnData = await getTxById({ queueId });

      if (!returnData) {
        const error = createCustomError(
          `Transaction not found with queueId ${queueId}`,
          StatusCodes.NOT_FOUND,
          "TX_NOT_FOUND",
        );
        throw error;
      }

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
