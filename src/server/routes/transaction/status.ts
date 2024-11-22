import { SocketStream } from "@fastify/websocket";
import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { TransactionDB } from "../../../db/transactions/db";
import { logger } from "../../../utils/logger";
import { createCustomError } from "../../middleware/error";
import { standardResponseSchema } from "../../schemas/sharedApiSchemas";
import {
  TransactionSchema,
  toTransactionSchema,
} from "../../schemas/transaction";
import {
  findOrAddWSConnectionInSharedState,
  formatSocketMessage,
  getStatusMessageAndConnectionStatus,
  onClose,
  onError,
  onMessage,
} from "../../utils/websocket";

// INPUT
const requestSchema = Type.Object({
  queueId: Type.String({
    description: "Transaction queue ID",
    examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
  }),
});

// OUTPUT
export const responseBodySchema = Type.Object({
  result: TransactionSchema,
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
    url: "/transaction/status/:queueId",
    schema: {
      summary: "Get transaction status",
      description: "Get the status for a transaction request.",
      tags: ["Transaction"],
      operationId: "status",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { queueId } = request.params;

      const transaction = await TransactionDB.get(queueId);
      if (!transaction) {
        throw createCustomError(
          "Transaction not found.",
          StatusCodes.BAD_REQUEST,
          "TRANSACTION_NOT_FOUND",
        );
      }

      reply.status(StatusCodes.OK).send({
        result: toTransactionSchema(transaction),
      });
    },
    wsHandler: async (connection: SocketStream, request) => {
      const { queueId } = request.params;

      findOrAddWSConnectionInSharedState(connection, queueId, request);

      const transaction = await TransactionDB.get(queueId);
      const returnData = transaction ? toTransactionSchema(transaction) : null;

      const { message, closeConnection } =
        await getStatusMessageAndConnectionStatus(returnData);

      connection.socket.send(await formatSocketMessage(returnData, message));

      if (closeConnection) {
        connection.socket.close();
        return;
      }

      connection.socket.on("error", (error) => {
        logger({
          service: "websocket",
          level: "error",
          message: "Websocket error",
          error,
        });

        onError(error, connection, request);
      });

      connection.socket.on("message", async (_message, _isBinary) => {
        onMessage(connection, request);
      });

      connection.socket.on("close", () => {
        onClose(connection, request);
      });
    },
  });
}
