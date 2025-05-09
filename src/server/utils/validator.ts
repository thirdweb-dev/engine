import type { Static } from "@sinclair/typebox";
import { customDateTimestampError } from "../middleware/error";
import type {
  erc20ResponseType,
  signature20InputSchema,
} from "../schemas/erc20";
import type {
  ercNFTResponseType,
  signature1155InputSchema,
  signature721InputSchema,
} from "../schemas/nft";

const timestampValidator = (value: number | string | undefined): boolean => {
  let timestamp = value;
  if (timestamp === undefined) {
    return true;
  }

  if (!Number.isNaN(Number(timestamp))) {
    timestamp = Number(timestamp);
  }

  return new Date(timestamp).getTime() > 0;
};

export const checkAndReturnERC20SignaturePayload = <
  T extends Static<typeof signature20InputSchema>,
  U extends erc20ResponseType,
>(
  payload: T,
): U => {
  if (!timestampValidator(payload.mintStartTime)) {
    throw customDateTimestampError("mintStartTime");
  }

  if (!timestampValidator(payload.mintEndTime)) {
    throw customDateTimestampError("mintEndTime");
  }

  if (!Number.isNaN(Number(payload.mintEndTime))) {
    payload.mintEndTime = Number(payload.mintEndTime);
  }

  if (!Number.isNaN(Number(payload.mintStartTime))) {
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
    throw customDateTimestampError("mintStartTime");
  }

  if (!timestampValidator(payload.mintEndTime)) {
    throw customDateTimestampError("mintEndTime");
  }

  if (!Number.isNaN(Number(payload.mintEndTime))) {
    payload.mintEndTime = Number(payload.mintEndTime);
  }

  if (!Number.isNaN(Number(payload.mintStartTime))) {
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

export const isValidWebhookUrl = (input: string): boolean => {
  try {
    const url = new URL(input);
    return (
      url.protocol === "https:" ||
      // Allow http for localhost only.
      (url.protocol === "http:" &&
        ["localhost", "0.0.0.0", "127.0.0.1", "host.docker.internal"].includes(
          url.hostname,
        ))
    );
  } catch {
    return false;
  }
};

export const isUnixEpochTimestamp = (timestamp: number): boolean => {
  const date = new Date(timestamp);
  return date.getFullYear() === 1970;
};
