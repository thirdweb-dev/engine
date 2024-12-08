import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { updateConfiguration } from "../../../../shared/db/configuration/updateConfiguration";
import { getConfig } from "../../../../shared/utils/cache/getConfig";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const requestBodySchema = Type.Partial(
  Type.Object({
    maxTxsToProcess: Type.Integer({ minimum: 1, maximum: 10_000 }),
    maxTxsToUpdate: Type.Integer({ minimum: 1, maximum: 10_000 }),
    minedTxListenerCronSchedule: Type.Union([Type.String(), Type.Null()]),
    retryTxListenerCronSchedule: Type.Union([Type.String(), Type.Null()]),
    minEllapsedBlocksBeforeRetry: Type.Integer({ minimum: 1, maximum: 10_000 }),
    maxFeePerGasForRetries: Type.String(),
    maxRetriesPerTx: Type.Integer({ minimum: 0, maximum: 10_000 }),
  }),
);

const responseBodySchema = Type.Object({
  result: Type.Object({
    minTxsToProcess: Type.Integer(),
    maxTxsToProcess: Type.Integer(),
    minedTxListenerCronSchedule: Type.Union([Type.String(), Type.Null()]),
    maxTxsToUpdate: Type.Integer(),
    retryTxListenerCronSchedule: Type.Union([Type.String(), Type.Null()]),
    minEllapsedBlocksBeforeRetry: Type.Integer(),
    maxFeePerGasForRetries: Type.String(),
    maxPriorityFeePerGasForRetries: Type.String(),
    maxRetriesPerTx: Type.Integer(),
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
