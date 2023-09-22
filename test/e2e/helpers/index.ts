import { FastifyInstance } from "fastify";
import request from "supertest";
import { TransactionStatusEnum } from "../../../server/schemas/transaction";
import { env } from "../../../src/utils/env";

export const awaitTransactionSubmission = async (
  server: FastifyInstance,
  queueId: string,
): Promise<request.Response> => {
  server.log.info(`Awaiting transaction to be Submitted: ${queueId}`);
  let txStatusResponse = await request(server.server)
    .get(`/transaction/status/${queueId}`)
    .set("Authorization", `Bearer ${env.THIRDWEB_API_SECRET_KEY}`)
    .send();
  let txSubmitted =
    txStatusResponse.body.result.status === TransactionStatusEnum.Submitted ||
    txStatusResponse.body.result.status === TransactionStatusEnum.Mined ||
    txStatusResponse.body.result.status === TransactionStatusEnum.Errored;

  while (!txSubmitted) {
    server.log.info(
      `Awaiting transaction to be Submitted: ${queueId}. Waiting for 3 Seconds before trying`,
    );
    await new Promise((resolve) => setTimeout(resolve, 3000));
    txStatusResponse = await request(server.server)
      .get(`/transaction/status/${queueId}`)
      .set("Authorization", `Bearer ${env.THIRDWEB_API_SECRET_KEY}`)
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
