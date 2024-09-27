import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../db/configuration/updateConfiguration";
import { getConfig } from "../../../../utils/cache/getConfig";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const requestBodySchema = Type.Partial(
  Type.Object({
    minTxsToProcess: Type.Number(),
    maxTxsToProcess: Type.Number(),
    minedTxListenerCronSchedule: Type.Union([Type.String(), Type.Null()]),
    maxTxsToUpdate: Type.Number(),
    retryTxListenerCronSchedule: Type.Union([Type.String(), Type.Null()]),
    minEllapsedBlocksBeforeRetry: Type.Number(),
    maxFeePerGasForRetries: Type.String(),
    maxPriorityFeePerGasForRetries: Type.String(),
    maxRetriesPerTx: Type.Number(),
  }),
);

const responseBodySchema = Type.Object({
  result: Type.Object({
    minTxsToProcess: Type.Number(),
    maxTxsToProcess: Type.Number(),
    minedTxListenerCronSchedule: Type.Union([Type.String(), Type.Null()]),
    maxTxsToUpdate: Type.Number(),
    retryTxListenerCronSchedule: Type.Union([Type.String(), Type.Null()]),
    minEllapsedBlocksBeforeRetry: Type.Number(),
    maxFeePerGasForRetries: Type.String(),
    maxPriorityFeePerGasForRetries: Type.String(),
    maxRetriesPerTx: Type.Number(),
  }),
});

export async function updateTransactionConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Body: Static<typeof requestBodySchema>;
  }>({
    method: "POST",
    url: "/configuration/transactions",
    schema: {
      summary: "Update transaction processing configuration",
      description: "Update transaction processing configuration",
      tags: ["Configuration"],
      operationId: "updateTransactionConfiguration",
      body: requestBodySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (req, res) => {
      await updateConfiguration({ ...req.body });
      const config = await getConfig(false);
      res.status(StatusCodes.OK).send({
        result: {
          minTxsToProcess: config.minTxsToProcess,
          maxTxsToProcess: config.maxTxsToProcess,
          minedTxListenerCronSchedule: config.minedTxListenerCronSchedule,
          maxTxsToUpdate: config.maxTxsToUpdate,
          retryTxListenerCronSchedule: config.retryTxListenerCronSchedule,
          minEllapsedBlocksBeforeRetry: config.minEllapsedBlocksBeforeRetry,
          maxFeePerGasForRetries: config.maxFeePerGasForRetries,
          maxPriorityFeePerGasForRetries: config.maxPriorityFeePerGasForRetries,
          maxRetriesPerTx: config.maxRetriesPerTx,
        },
      });
    },
  });
}
