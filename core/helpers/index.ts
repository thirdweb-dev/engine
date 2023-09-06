import { env } from "../env";

const AWS_ACCESS_KEY_ID = env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = env.AWS_REGION;

const WALLET_PRIVATE_KEY =
  "WALLET_PRIVATE_KEY" in env.WALLET_KEYS
    ? env.WALLET_KEYS.WALLET_PRIVATE_KEY
    : undefined;

export const isValidHttpUrl = (urlString: string): boolean => {
  let url;

  try {
    url = new URL(urlString);
  } catch (_) {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
};

export const getInstanceAdminWalletType = (): string => {
  if (WALLET_PRIVATE_KEY) {
    return "ppk";
  }

  if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_REGION) {
    return "aws_kms";
  }

  // ToDo GCP KMS
  return "gcp_kms";
};

export const getWalletBackUpType = (): string => {
  if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && AWS_REGION) {
    return "aws_kms";
  }

  if (
    env.GOOGLE_APPLICATION_CREDENTIAL_EMAIL &&
    env.GOOGLE_APPLICATION_CREDENTIAL_PRIVATE_KEY &&
    env.GOOGLE_APPLICATION_PROJECT_ID &&
    env.GOOGLE_KMS_KEY_RING_ID &&
    env.GOOGLE_KMS_KEY_VERSION_ID &&
    env.GOOGLE_KMS_LOCATION_ID
  ) {
    return "gcp_kms";
  }

  // ToDo GCP KMS
  return "ppk";
};
