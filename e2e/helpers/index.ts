// write cost to await the transaction to be mined.

import { FastifyInstance } from "fastify";
import { TransactionStatusEnum } from "../../server/schemas/transaction";
import request from "supertest";

export const awaitTransactionSubmission = async (
  server: FastifyInstance,
  queueId: string,
): Promise<request.Response> => {
  server.log.info(`Awaiting transaction to be Submitted: ${queueId}`);
  let txStatusResponse = await request(server.server)
    .get(`/transaction/status/${queueId}`)
    .send();
  let txSubmitted =
    txStatusResponse.body.result.status === TransactionStatusEnum.Submitted;

  while (!txSubmitted) {
    server.log.info(
      `Awaiting transaction to be Submitted: ${queueId}. Waiting for 3 Seconds before trying`,
    );
    await new Promise((resolve) => setTimeout(resolve, 3000));
    txStatusResponse = await request(server.server)
      .get(`/transaction/status/${queueId}`)
      .send();
    if (
      txStatusResponse.body.result.status === TransactionStatusEnum.Submitted
    ) {
      txSubmitted = true;
    }
  }
  server.log.info(`Transaction submitted for requestId ${queueId}`);
  return txStatusResponse;
};
