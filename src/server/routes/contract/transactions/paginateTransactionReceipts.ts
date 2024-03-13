import { Static, Type } from "@sinclair/typebox";
import base64 from "base-64";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { getConfiguration } from "../../../../db/configuration/getConfiguration";
import { getTransactionReceiptsByCursor } from "../../../../db/contractTransactionReceipts/getContractTransactionReceipts";
import { createCustomError } from "../../../middleware/error";
import {
  standardResponseSchema,
  transactionReceiptsSchema,
} from "../../../schemas/sharedApiSchemas";

/* Consider moving all cursor logic inside db file */

const requestQuerySchema = Type.Object({
  cursor: Type.Optional(Type.String()),
  pageSize: Type.Optional(Type.Number()),
  contractAddresses: Type.Optional(Type.Array(Type.String())),
});

const responseSchema = Type.Object({
  result: Type.Object({
    cursor: Type.Optional(Type.String()),
    receipts: transactionReceiptsSchema,
    status: Type.String(),
  }),
});

responseSchema.example = {
  result: {
    cursor: "abcd-xyz",
    receipts: [
      {
        chainId: 1,
        blockNumber: 100,
        contractAddress: "0x...",
        transactionHash: "0x...",
        blockHash: "0x...",
        timestamp: 100,

        to: "0x...",
        from: "0x...",
        transactionIndex: 1,

        gasUsed: "1000",
        effectiveGasPrice: "1000",
        status: 1,
      },
    ],
    status: "success",
  },
};

const CursorSchema = z.object({
  createdAt: z.number().transform((s) => new Date(s)),
  chainId: z.number(),
  blockNumber: z.number(),
  transactionIndex: z.number(),
});

export async function pageTransactionReceipts(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseSchema>;
    Querystring: Static<typeof requestQuerySchema>;
  }>({
    method: "GET",
    url: "/contract/transactions/paginate-receipts",
    schema: {
      summary:
        "Get contract paginated transaction receipts for subscribed contract",
      description:
        "Get contract paginated transaction receipts for subscribed contract",
      tags: ["Contract-Transactions"],
      operationId: "pageTransactionReceipts",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseSchema,
      },
    },
    handler: async (request, reply) => {
      const { cursor, pageSize, contractAddresses } = request.query;

      const standardizedContractAddresses = contractAddresses?.map((val) =>
        val.toLowerCase(),
      );

      // add lag behind to account for clock skew, concurrent writes, etc
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
          const [createdAt, chainId, blockNumber, transactionIndex] =
            parsedCursor;
          const validationResult = CursorSchema.safeParse({
            createdAt,
            chainId,
            blockNumber,
            transactionIndex,
          });

          if (!validationResult.success) {
            throw new Error("Invalid cursor format");
          }

          cursorObj = validationResult.data;
        }
      } catch (error) {
        throw createCustomError(
          "Invalid cursor",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
      }

      const resultTransactionReceipts = await getTransactionReceiptsByCursor({
        cursor: cursorObj,
        limit: pageSize,
        contractAddresses: standardizedContractAddresses,
        maxCreatedAt,
      });

      /* cursor rules */
      // if new logs returned, return new cursor
      // if no new logs and no cursor return null (original cursor)
      // if no new logs and cursor return original cursor
      let newCursor = cursor;
      if (resultTransactionReceipts.length > 0) {
        const lastReceipt =
          resultTransactionReceipts[resultTransactionReceipts.length - 1];
        const cursorString = `${lastReceipt.createdAt.getTime()}-${
          lastReceipt.chainId
        }-${lastReceipt.blockNumber}-${lastReceipt.transactionIndex}`;
        newCursor = base64.encode(cursorString);
      }

      const transactionReceipts = resultTransactionReceipts.map((txRcpt) => {
        return {
          chainId: txRcpt.chainId,
          blockNumber: txRcpt.blockNumber,
          contractAddress: txRcpt.contractAddress,
          transactionHash: txRcpt.transactionHash,
          blockHash: txRcpt.blockHash,
          timestamp: txRcpt.timestamp.getTime(),

          to: txRcpt.to,
          from: txRcpt.from,
          transactionIndex: txRcpt.transactionIndex,

          gasUsed: txRcpt.gasUsed,
          effectiveGasPrice: txRcpt.effectiveGasPrice,
          status: txRcpt.status,
        };
      });

      reply.status(StatusCodes.OK).send({
        result: {
          cursor: newCursor,
          receipts: transactionReceipts,
          status: "success",
        },
      });
    },
  });
}
