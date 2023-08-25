import { SocketStream } from "@fastify/websocket";
import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../../core/error/customError";
import { findTxDetailsWithQueueId } from "../../helpers";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import {
  findOrAddWSConnectionInSharedState,
  formatSocketMessage,
  getStatusMessageAndConnectionStatus,
  onClose,
  onError,
  onMessage,
} from "../../helpers/websocket";
import { transactionResponseSchema } from "../../schemas/transaction";

// INPUT
const requestSchema = Type.Object({
  tx_queue_id: Type.String({
    description: "Transaction Queue ID",
    examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
  }),
});

// OUTPUT
export const responseBodySchema = Type.Object({
  result: transactionResponseSchema,
});

responseBodySchema.example = {
  result: {
    blockNumber: "39395521",
    chainId: "80001",
    contractAddress: "0x365b83d67d5539c6583b9c0266a548926bf216f4",
    contractType: null,
    createdTimestamp: "2023-08-26T03:09:22.328Z",
    deployedContractAddress: null,
    encodedInputData:
      "0xa9059cbb0000000000000000000000001946267d81fb8adeeea28e6b98bcd446c824847300000000000000000000000000000000000000000000000000000000000186a0",
    errorMessage: null,
    extension: "non-extension",
    functionArgs: "0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473,100000",
    functionName: "transfer",
    gasLimit: "46512",
    gasPrice: "1500000017",
    maxFeePerGas: "1500000034",
    maxPriorityFeePerGas: "1500000000",
    queueId: "aa9438fa-efef-4fce-8b65-a3e21910770a",
    status: "mined",
    submittedTxNonce: "640",
    toAddress: null,
    txErrored: false,
    txHash:
      "0xf0eed411e9aab68e6201404f9362d0c34a2194f3b6774321d02dfcee27bd989f",
    txMined: true,
    txMinedTimestamp: "2023-08-26T03:09:31.000Z",
    txProcessed: true,
    txProcessedTimestamp: "2023-08-25T20:09:25.673Z",
    txRetryTimestamp: null,
    txSubmitted: true,
    txSubmittedTimestamp: "2023-08-25T20:09:26.704Z",
    txType: "2",
    updatedTimestamp: "2023-08-25T21:41:32.131Z",
    walletAddress: "0x3ecdbf3b911d0e9052b64850693888b008e18373",
  },
};

// OUTPUT

export async function checkTxStatus(fastify: FastifyInstance) {
  fastify.route<{
    Params: Static<typeof requestSchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/transaction/status/:tx_queue_id",
    schema: {
      description: "Get Submitted Transaction Status",
      tags: ["Transaction"],
      operationId: "txStatus",
      params: requestSchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { tx_queue_id } = request.params;
      const returnData = await findTxDetailsWithQueueId(tx_queue_id, request);

      if (!returnData) {
        const error = createCustomError(
          `Transaction not found with queueId ${tx_queue_id}`,
          StatusCodes.NOT_FOUND,
          "TX_NOT_FOUND",
        );
        throw error;
      }

      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
    wsHandler: async (connection: SocketStream, request) => {
      request.log.info(request, "Websocket Route Handler");
      const { tx_queue_id } = request.params;
      // const timeout = await wsTimeout(connection, tx_queue_id, request);
      request.log.info(`Websocket Connection Established for ${tx_queue_id}`);
      findOrAddWSConnectionInSharedState(connection, tx_queue_id, request);

      const returnData = await findTxDetailsWithQueueId(tx_queue_id, request);

      const { message, closeConnection } =
        await getStatusMessageAndConnectionStatus(returnData);

      connection.socket.send(await formatSocketMessage(returnData, message));

      if (closeConnection) {
        connection.socket.close();
        return;
      }

      connection.socket.on("error", (error) => {
        request.log.error(error, "Websocket Error");
        onError(error, connection, request);
      });

      connection.socket.on("message", async (message, isBinary) => {
        request.log.info(message, "Websocket Message Received");
        onMessage(connection, request);
      });

      connection.socket.on("close", () => {
        request.log.info("Websocket Connection Closed");
        onClose(connection, request);
        // clearTimeout(timeout);
      });
    },
  });
}
