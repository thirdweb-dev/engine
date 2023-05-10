import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { getCodeFromStatusCode } from './utilities/errorCodes';
import { getEnv } from './loadEnv';
import { FastifyInstance } from 'fastify';

export const errorHandler = async (server: FastifyInstance) => {
  server.setErrorHandler((error, request, reply) => {
    console.log("===>", error);
    // Transform unexpected errors into a standard payload
    const statusCode = error.statusCode ?? StatusCodes.INTERNAL_SERVER_ERROR;
    const code =
      error.code ??
      getCodeFromStatusCode(statusCode) ??
      StatusCodes.INTERNAL_SERVER_ERROR;
    
    const message = error.message ?? ReasonPhrases.INTERNAL_SERVER_ERROR;
    reply.status(statusCode).send({
      data: null,
      error: {
        code,
        message,
        statusCode,
        stack: getEnv('NODE_ENV') !== 'production' ? error.stack : undefined,
      },
    });
  });
};
