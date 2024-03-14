import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { getConfig } from "../../../../utils/cache/getConfig";
import { standardResponseSchema } from "../../../schemas/sharedApiSchemas";

const ReplySchema = Type.Object({
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
    clearCacheCronSchedule: Type.Union([Type.String(), Type.Null()]),
  }),
});

export async function getTransactionConfiguration(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
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
        [StatusCodes.OK]: ReplySchema,
      },
    },
    handler: async (req, res) => {
      const config = await getConfig();
      res.status(200).send({
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
