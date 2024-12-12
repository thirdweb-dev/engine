import cronParser from "cron-parser";
import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../../server/middleware/error";

export const isValidCron = (input: string): boolean => {
  try {
    cronParser.parseExpression(input);
  } catch (_error) {
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

  const [seconds, minutes, hours, dayOfMonth, month, dayOfWeek] = fields;

  let parsedSecondsValue: number | null = null;
  if (seconds.startsWith("*/")) {
    parsedSecondsValue = Number.parseInt(seconds.split("/")[1]);
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

  // Check other fields
  checkCronFieldInterval(minutes, 0, 59, "Minutes");
  checkCronFieldInterval(hours, 0, 23, "Hours");
  checkCronFieldInterval(dayOfMonth, 1, 31, "Day of month");
  checkCronFieldInterval(month, 1, 12, "Month");
  checkCronFieldInterval(dayOfWeek, 0, 7, "Day of week");

  return true;
};

const checkCronFieldInterval = (
  field: string,
  minValue: number,
  maxValue: number,
  fieldName: string,
) => {
  if (field.startsWith("*/")) {
    const parsedValue = Number.parseInt(field.split("/")[1]);
    if (parsedValue < minValue || parsedValue > maxValue) {
      throw createCustomError(
        `Invalid cron expression. ${fieldName} must be between ${minValue} and ${maxValue} when using an interval.`,
        StatusCodes.BAD_REQUEST,
        "BAD_REQUEST",
      );
    }
  }
};
