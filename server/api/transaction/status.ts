import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../../core/error/customError";
import { findTxDetailsWithQueueId } from "../../helpers";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { transactionResponseSchema } from "../../schemas/transaction";
import { UserSubscription } from "../../schemas/websocket";

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
    queueId: "d09e5849-a262-4f0f-84be-55389c6c7bce",
    walletAddress: "0x1946267d81fb8adeeea28e6b98bcd446c8248473",
    contractAddress: "0x365b83d67d5539c6583b9c0266a548926bf216f4",
    chainId: "80001",
    extension: "non-extension",
    status: "submitted",
    encodedInputData:
      "0xa9059cbb0000000000000000000000003ecdbf3b911d0e9052b64850693888b008e1837300000000000000000000000000000000000000000000000000000000000f4240",
    txType: 2,
    gasPrice: "",
    gasLimit: "46512",
    maxPriorityFeePerGas: "1500000000",
    maxFeePerGas: "1500000032",
    txHash:
      "0x6b63bbe29afb2813e8466c0fc48b22f6c2cc835de8b5fd2d9815c28f63b2b701",
    submittedTxNonce: 562,
    createdTimestamp: "2023-06-01T18:56:50.787Z",
    txSubmittedTimestamp: "2023-06-01T18:56:54.908Z",
  },
};

export const subscriptions: UserSubscription[] = [];

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
    wsHandler: async (connection, request) => {
      request.log.info(request, "Websocket Route Handler");
      const { tx_queue_id } = request.params;
      let userSubscription: UserSubscription | undefined = undefined;
      const index = subscriptions.findIndex(
        (sub) => sub.socket === connection.socket,
      );
      if (index > -1) {
        userSubscription = subscriptions[index];
      }

      userSubscription = {
        socket: connection.socket,
        requestId: tx_queue_id,
      };

      subscriptions.push(userSubscription);

      const returnData = await findTxDetailsWithQueueId(tx_queue_id, request);
      if (returnData && Object.keys(returnData).length === 0) {
        userSubscription.socket.send(
          JSON.stringify({
            result: null,
            requestId: tx_queue_id,
            status: "pending",
            message: "Transaction is still pending. Stay connected...",
          }),
        );
      } else {
        userSubscription.socket.send(
          JSON.stringify({
            result: returnData,
            requestId: tx_queue_id,
            status: "success",
            message: "Transaction is successful. Closing Socket...",
          }),
        );
        userSubscription.socket.close();
      }

      userSubscription.socket.on("connection", () => {
        request.log.info(`Websocket Connection Established for ${tx_queue_id}`);
      });

      userSubscription.socket.on("error", (error) => {
        request.log.error(error, "Websocket Error");
      });

      userSubscription.socket.on("message", async (message, isBinary) => {
        request.log.info(message, "Websocket Message Received");
      });

      userSubscription.socket.on("close", () => {
        request.log.info("Websocket Connection Closed");
        const index = subscriptions.findIndex(
          (sub) => sub.socket === connection.socket,
        );
        const userSubscription = subscriptions[index];
        if (index > -1) {
          subscriptions.splice(index, 1);
        }
      });
    },
  });
}
