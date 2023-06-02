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
