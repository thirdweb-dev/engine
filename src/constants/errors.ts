<<<<<<< Updated upstream
import { Static } from "@sinclair/typebox";
import { baseReplyErrorSchema } from "../sharedApiSchemas";
import { StatusCodes } from "http-status-codes";
=======
import { Static } from '@sinclair/typebox';
import { errorSchema } from '../helpers/sharedApiSchemas';
import { StatusCodes } from 'http-status-codes';
>>>>>>> Stashed changes

/**
 * API key reply errors
 */
export const API_KEY_REPLY_ERRORS: Record<
  string,
  Static<typeof baseReplyErrorSchema>
> = {
  MISSING_API_KEY: {
    code: "MISSING_API_KEY",
    message:
      "The API key is missing. Make sure 'x-api-key' is included with your request header.",
    statusCode: StatusCodes.BAD_REQUEST,
  },

  INVALID_API_KEY: {
    code: "INVALID_API_KEY",
    message:
      "The API key is invalid. Make sure you've entered the right one, or generate a new one.",
    statusCode: StatusCodes.UNAUTHORIZED,
  },

  UNAUTHORIZED_REVOCATION: {
    code: "UNAUTHORIZED_REVOCATION",
    message:
      "You are not authorized to revoke this API key. Make sure you've entered the right one.",
    statusCode: StatusCodes.UNAUTHORIZED,
  },

  REVOKED_API_KEY: {
    code: "REVOKED_API_KEY",
    message: "This API key has been revoked.",
    statusCode: StatusCodes.UNAUTHORIZED,
  },

  TOO_MANY_KEYS: {
    code: "TOO_MANY_KEYS",
    message: "You have reached the maximum number of API keys.",
    statusCode: StatusCodes.TOO_MANY_REQUESTS,
  },

  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    message: "API Key provided is not valid",
    statusCode: StatusCodes.UNAUTHORIZED,
  },
};
