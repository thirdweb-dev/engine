import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { Static, Type } from "@sinclair/typebox";
import { createCustomError } from "../../../core/error/customError";
import {
  standardResponseSchema,
} from "../../helpers/sharedApiSchemas";
import { transactionResponseSchema } from "../../schemas/transaction";
import { getAllTxFromDB } from "../../helpers";

// INPUT
const requestQuerySchema = Type.Object({
  page: Type.String({
    description: "This parameter allows the user to specify the page number for pagination purposes",
    examples: ["1"],
    default: ["1"],
  }),
  limit: Type.String({
    description: "This parameter defines the maximum number of transaction request data to return per page.",
    examples: ["10"],
    default: ["10"],
  }),
  sort: Type.Optional(Type.String({
    description: "This parameter specifies the sorting order of the results based on a particular field or attribute",
    examples: ["createdTimestamp"],
    default: ["createdTimestamp"],
  })),
  sort_order: Type.Optional(Type.String({
    description: "This parameter specifies the sorting order of the results based on a particular field or attribute",
    examples: ["desc", "asc"],
    default: ["asc"],
  })),
  filter: Type.Optional(Type.String({
    description: "This parameter allows to define specific criteria to filter the data by. For example, filtering by processed, submitted or error",
    examples: ["all", "submitted", "processed", "errored", "queued"],
    default: ["all"],
  })),
});

// OUTPUT
export const responseBodySchema = Type.Object({
  result: Type.Array(transactionResponseSchema),
});

export async function getAllTx(fastify: FastifyInstance) {
  fastify.route<{
    Querystring: Static<typeof requestQuerySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/transaction/getAll",
    schema: {
      description: "Get Submitted Transaction Status",
      tags: ["Transaction"],
      operationId: "getAllTx",
      querystring: requestQuerySchema,
      response: {
        ...standardResponseSchema,
        [StatusCodes.OK]: responseBodySchema,
      },
    },
    handler: async (request, reply) => {
      const { page, limit, sort, sort_order, filter } = request.query;

      if (isNaN(parseInt(page, 10))) {
        const customError = createCustomError("Page must be a number", StatusCodes.BAD_REQUEST, "BAD_REQUEST");
        throw customError;
      } else if(isNaN(parseInt(limit, 10))) {
        const customError = createCustomError("Limit must be a number", StatusCodes.BAD_REQUEST, "BAD_REQUEST");
        throw customError;
      }
      
      const returnData = await getAllTxFromDB(
        request,
        parseInt(page, 10),
        parseInt(limit, 10),
        sort,
        sort_order,
        filter,
      );
      
      request.log.debug(`Got All Transaction Data ${returnData}`)
      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
