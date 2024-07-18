import { FastifyInstance } from "fastify";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";

export type CustomError = {
  message: string;
  statusCode: number;
  code: string;
  stack?: string;
};

export const createCustomError = (
  message: string,
  statusCode: number,
  code: string,
): CustomError => ({
  message,
  statusCode,
  code,
});

export const createCustomDateTimestampError = (key: string): CustomError => {
  return createCustomError(
    `Invalid ${key} Value. Needs to new Date() / new Date().toISOstring() / new Date().getTime() / Unix Epoch`,
    404,
    "INVALID_DATE_TIME",
  );
};

const flipObject = (data: any) =>
  Object.fromEntries(Object.entries(data).map(([key, value]) => [value, key]));

export const withErrorHandler = async (server: FastifyInstance) => {
  server.setErrorHandler((error: Error | CustomError, request, reply) => {
    logger({
      service: "server",
      level: "error",
      message: `Encountered server error`,
      error,
    });

    // v4 : Contract Prepare Error Handler
    if (error.message.includes("code=INVALID_ARGUMENT")) {
      return reply.status(StatusCodes.BAD_REQUEST).send({
        error: {
          code: "BAD_REQUEST",
          message: "INVALID_ARGUMENT",
          reason: error.message,
          statusCode: 400,
          stack: env.NODE_ENV !== "production" ? error.stack : undefined,
        },
      });
    }

    // v4: Zod Typings Errors
    if (error.message.toLowerCase().includes("invalid input")) {
      return reply.status(StatusCodes.BAD_REQUEST).send({
        error: {
          code: "BAD_REQUEST",
          message: "Invalid input",
          reason: JSON.parse(error.message),
          statusCode: 400,
          stack: env.NODE_ENV !== "production" ? error.stack : undefined,
        },
      });
    }

    if ("statusCode" in error && "code" in error) {
      // Transform unexpected errors into a standard payload
      const statusCode = error.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR;
      const code =
        error.code ??
        flipObject(StatusCodes)[statusCode] ??
        StatusCodes.INTERNAL_SERVER_ERROR;

      const message = error.message ?? ReasonPhrases.INTERNAL_SERVER_ERROR;
      reply.status(statusCode).send({
        error: {
          code,
          message,
          statusCode,
          stack: env.NODE_ENV !== "production" ? error.stack : undefined,
        },
      });
    } else {
      // Handle non-custom errors
      reply.status(StatusCodes.INTERNAL_SERVER_ERROR).send({
        error: {
          statusCode: 500,
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || ReasonPhrases.INTERNAL_SERVER_ERROR,
          stack: env.NODE_ENV !== "production" ? error.stack : undefined,
        },
      });
    }
  });
};
