import cronParser, { type CronFields } from "cron-parser";
import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../../server/middleware/error.js";

const validateCronFields = (fields: CronFields) => {
  const secondValues = fields.second;

  // More comprehensive check for "every second" patterns
  if (
    secondValues.length > 30 || // Too many values
    secondValues.some((val, idx, arr) => {
      // Check for small intervals
      const nextVal = arr[idx + 1];
      return (
        typeof val === "number" &&
        typeof nextVal === "number" &&
        nextVal - val < 10
      );
    })
  ) {
    throw createCustomError(
      "Cannot run every second or with intervals less than 10 seconds",
      StatusCodes.BAD_REQUEST,
      "BAD_REQUEST",
    );
  }
};

export const isValidCron = (input: string | null | undefined): boolean => {
  if (!input?.trim()) {
    throw createCustomError(
      "Cron expression cannot be empty",
      StatusCodes.BAD_REQUEST,
      "BAD_REQUEST",
    );
  }

  try {
    const parsedFields = cronParser.parseExpression(input).fields;
    validateCronFields(parsedFields);
    return true;
  } catch (error) {
    if (error instanceof Error) {
      throw createCustomError(
        error.message,
        StatusCodes.BAD_REQUEST,
        "BAD_REQUEST",
      );
    }
    throw createCustomError(
      "Invalid cron expression",
      StatusCodes.BAD_REQUEST,
      "BAD_REQUEST",
    );
  }
};
