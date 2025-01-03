import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../shared/utils/cache/get-config";
import { standardResponseSchema } from "../../../schemas/shared-api-schemas";

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
    clearCacheCronSchedule: Type.Union([Type.String(), Type.Null()]),
  }),
});

export async function getTransactionConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/configuration/transactions",
    schema: {
      summary: "Get transaction processing configuration",
      description: "Get transactions processing configuration",
      tags: ["Configuration"],
      operationId: "getTransactionConfiguration",
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (_req, res) => {
      const config = await getConfig();
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
          clearCacheCronSchedule: config.clearCacheCronSchedule,
        },
      });
    },
  });
}
