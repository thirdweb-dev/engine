import { Static, Type } from "@sinclair/typebox";
import base64 from "base-64";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { getConfiguration } from "../../../../db/configuration/getConfiguration";
import { getEventLogsByCursor } from "../../../../db/contractEventLogs/getContractEventLogs";
import { createCustomError } from "../../../middleware/error";
import {
  eventLogsSchema,
  standardResponseSchema,
} from "../../../schemas/sharedApiSchemas";

/* Consider moving all cursor logic inside db file */

const requestQuerySchema = Type.Object({
  cursor: Type.Optional(Type.String()),
  pageSize: Type.Optional(Type.Number()),
  topics: Type.Optional(Type.Array(Type.String())),
  contractAddresses: Type.Optional(Type.Array(Type.String())),
});

const responseSchema = Type.Object({
  result: Type.Object({
    cursor: Type.Optional(Type.String()),
    logs: eventLogsSchema,
    status: Type.String(),
  }),
});

const CursorSchema = z.object({
  createdAt: z.number().transform((s) => new Date(s)),
  chainId: z.number(),
  blockNumber: z.number(),
  transactionIndex: z.number(),
  logIndex: z.number(),
});

export async function pageEventLogs(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/events/paginate-logs",
    schema: {
      summary: "Get contract event logs",
      description: "Get event logs for a subscribed contract",
      tags: ["Contract", "Index"],
      operationId: "read",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { cursor, pageSize, topics, contractAddresses } = request.query;

      const standardizedContractAddresses = contractAddresses?.map((val) =>
        val.toLowerCase(),
      );

      const config = await getConfiguration();
      const maxCreatedAt = new Date(
        Date.now() - config.cursorDelaySeconds * 1000,
      );

      let cursorObj;
      try {
        if (cursor) {
          const decodedCursor = base64.decode(cursor);
          const parsedCursor = decodedCursor
            .split("-")
            .map((val) => parseInt(val));
          const [createdAt, chainId, blockNumber, transactionIndex, logIndex] =
            parsedCursor;
          const validationResult = CursorSchema.safeParse({
            createdAt,
            chainId,
            blockNumber,
            transactionIndex,
            logIndex,
          });

          if (!validationResult.success) {
            throw new Error("Invalid cursor format");
          }

          cursorObj = validationResult.data;

          console.log(cursorObj);
        }
      } catch (error) {
        throw createCustomError(
          "Invalid cursor",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

      const resultLogs = await getEventLogsByCursor({
        cursor: cursorObj,
        limit: pageSize,
        topics,
        contractAddresses: standardizedContractAddresses,
        maxCreatedAt,
      });

      const logs = resultLogs.map((log) => {
        const topics: string[] = [];
        [log.topic0, log.topic1, log.topic2, log.topic3].forEach((val) => {
          if (val) {
            topics.push(val);
          }
        });

        return {
          chainId: log.chainId,
          contractAddress: log.contractAddress,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          topics,
          data: log.data,
          eventName: log.eventName ?? undefined,
          decodedLog: log.decodedLog,
          timestamp: log.timestamp.getTime(),
          transactionIndex: log.transactionIndex,
          logIndex: log.logIndex,
        };
      });

      let newCursor = cursor;
      if (resultLogs.length > 0) {
        const lastLog = resultLogs[resultLogs.length - 1];
        const cursorString = `${lastLog.createdAt.getTime()}-${
          lastLog.chainId
        }-${lastLog.blockNumber}-${lastLog.transactionIndex}-${
          lastLog.logIndex
        }`;

        console.log(cursorString);
        newCursor = base64.encode(cursorString);
      }

      /* cursor rules */
      // if new logs returned, return new cursor
      // if no new logs and no cursor return null (original cursor)
      // if no new logs and cursor return original cursor

      reply.status(StatusCodes.OK).send({
        result: {
          cursor: newCursor,
          logs,
          status: "success",
        },
      });
    },
  });
}
