import { Static, Type } from "@sinclair/typebox";
import { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../../core/error/customError";
import { getAllTxFromDB } from "../../helpers";
import { standardResponseSchema } from "../../helpers/sharedApiSchemas";
import { transactionResponseSchema } from "../../schemas/transaction";

// INPUT
const requestQuerySchema = Type.Object({
  page: Type.String({
    description:
      "This parameter allows the user to specify the page number for pagination purposes",
    examples: ["1"],
    default: "1",
  }),
  limit: Type.String({
    description:
      "This parameter defines the maximum number of transaction request data to return per page.",
    examples: ["10"],
    default: "10",
  }),
  sort: Type.Optional(
    Type.String({
      description:
        "This parameter specifies the sorting order of the results based on a particular field or attribute",
      examples: ["createdTimestamp"],
      default: "createdTimestamp",
    }),
  ),
  sort_order: Type.Optional(
    Type.String({
      description:
        "This parameter specifies the sorting order of the results based on a particular field or attribute",
      examples: ["desc", "asc"],
      default: "asc",
    }),
  ),
  filter: Type.Optional(
    Type.String({
      description:
        "This parameter allows to define specific criteria to filter the data by. For example, filtering by processed, submitted or error",
      examples: ["all", "submitted", "processed", "errored", "queued"],
      default: "all",
    }),
  ),
});

// OUTPUT
export const responseBodySchema = Type.Object({
  result: Type.Array(transactionResponseSchema),
});

responseBodySchema.example = {
  result: [
    {
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
      txProcessedTimestamp: "2023-06-01T18:56:54.908Z",
    },
  ],
};

export async function getAllTx(fastify: FastifyInstance) {
  fastify.route<{
    Querystring: Static<typeof requestQuerySchema>;
    Reply: Static<typeof responseBodySchema>;
  }>({
    method: "GET",
    url: "/transaction/getAll",
    schema: {
      description: "Get All Transaction Requests",
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
        const customError = createCustomError(
          "Page must be a number",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
        throw customError;
      } else if (isNaN(parseInt(limit, 10))) {
        const customError = createCustomError(
          "Limit must be a number",
          StatusCodes.BAD_REQUEST,
          "BAD_REQUEST",
        );
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
      reply.status(StatusCodes.OK).send({
        result: returnData,
      });
    },
  });
}
