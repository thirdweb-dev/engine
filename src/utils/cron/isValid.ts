import cronParser from "cron-parser";

export const isValidCron = (input: string): boolean => {
  try {
    cronParser.parseExpression(input);
    return true;
  } catch (error) {
    return false;
  }
};
