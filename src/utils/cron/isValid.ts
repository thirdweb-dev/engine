import cronParser from "cron-parser";
import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../server/middleware/error";

export const isValidCron = (input: string): boolean => {
  try {
    cronParser.parseExpression(input);
  } catch (error) {
    throw createCustomError(
      "Invalid cron expression. Please check the cron expression.",
      StatusCodes.BAD_REQUEST,
      "BAD_REQUEST",
    );
  }

  const fields = input.split(" ");

  // Check if the cron expression has 6 fields
  if (fields.length !== 6) {
    throw createCustomError(
      "Invalid cron expression. Please check the cron expression.",
      StatusCodes.BAD_REQUEST,
      "BAD_REQUEST",
    );
  }

  const seconds = fields[0];

  let parsedSecondsValue: number | null = null;
  if (seconds.startsWith("*/")) {
    parsedSecondsValue = parseInt(seconds.split("/")[1]);
  }

  // Check for specific invalid patterns in seconds field
  if (
    (parsedSecondsValue !== null &&
      (parsedSecondsValue < 10 || parsedSecondsValue > 59)) ||
    seconds === "*" ||
    seconds === "*/1"
  ) {
    throw createCustomError(
      `Invalid cron expression. ${
        parsedSecondsValue !== null
          ? "Seconds must be between 10 and 59 when using an interval."
          : "Cannot run every second of every minute of every hour."
      }`,
      StatusCodes.BAD_REQUEST,
      "BAD_REQUEST",
    );
  }

  return true;
};
