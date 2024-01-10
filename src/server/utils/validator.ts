import { Static } from "@sinclair/typebox";
import { createCustomDateTimestampError } from "../middleware/error";
import { erc20ResponseType, signature20InputSchema } from "../schemas/erc20";
import {
  ercNFTResponseType,
  signature1155InputSchema,
  signature721InputSchema,
} from "../schemas/nft";

const timestampValidator = (value: number | string | undefined): Boolean => {
  if (value === undefined) {
    return true;
  }

  if (!isNaN(Number(value))) {
    value = Number(value);
  }

  return new Date(value).getTime() > 0;
};

export const checkAndReturnERC20SignaturePayload = <
  T extends Static<typeof signature20InputSchema>,
  U extends erc20ResponseType,
>(
  payload: T,
): U => {
  if (!timestampValidator(payload.mintStartTime)) {
    throw createCustomDateTimestampError("mintStartTime");
  }

  if (!timestampValidator(payload.mintEndTime)) {
    throw createCustomDateTimestampError("mintEndTime");
  }

  if (!isNaN(Number(payload.mintEndTime))) {
    payload.mintEndTime = Number(payload.mintEndTime);
  }

  if (!isNaN(Number(payload.mintStartTime))) {
    payload.mintStartTime = Number(payload.mintStartTime);
  }

  const updatedPayload: U = payload as unknown as U;
  updatedPayload.mintEndTime = payload.mintEndTime
    ? new Date(payload.mintEndTime)
    : undefined;
  updatedPayload.mintStartTime = payload.mintStartTime
    ? new Date(payload.mintStartTime)
    : undefined;

  return updatedPayload;
};

export const checkAndReturnNFTSignaturePayload = <
  T extends
    | Static<typeof signature1155InputSchema>
    | Static<typeof signature721InputSchema>,
  U extends ercNFTResponseType,
>(
  payload: T,
): U => {
  if (!timestampValidator(payload.mintStartTime)) {
    throw createCustomDateTimestampError("mintStartTime");
  }

  if (!timestampValidator(payload.mintEndTime)) {
    throw createCustomDateTimestampError("mintEndTime");
  }

  if (!isNaN(Number(payload.mintEndTime))) {
    payload.mintEndTime = Number(payload.mintEndTime);
  }

  if (!isNaN(Number(payload.mintStartTime))) {
    payload.mintStartTime = Number(payload.mintStartTime);
  }

  const updatedPayload: U = payload as unknown as U;
  updatedPayload.mintEndTime = payload.mintEndTime
    ? new Date(payload.mintEndTime)
    : undefined;
  updatedPayload.mintStartTime = payload.mintStartTime
    ? new Date(payload.mintStartTime)
    : undefined;

  return updatedPayload;
};

export const isValidHttpUrl = (urlString: string): boolean => {
  let url;

  try {
    url = new URL(urlString);
  } catch (_) {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
};

export const isUnixEpochTimestamp = (timestamp: number): boolean => {
  const date = new Date(timestamp);
  return date.getFullYear() === 1970;
};
