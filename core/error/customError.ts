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
