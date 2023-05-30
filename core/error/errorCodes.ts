import { StatusCodes } from 'http-status-codes';

const flipObject = (data: any) =>
  Object.fromEntries(Object.entries(data).map(([key, value]) => [value, key]));

const StatusCodeToCode = flipObject(StatusCodes);

export const getCodeFromStatusCode = (statusCode: number) =>
  StatusCodeToCode[statusCode];
