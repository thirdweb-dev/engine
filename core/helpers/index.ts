import { env } from "../env";

const AWS_ACCESS_KEY_ID = env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = env.AWS_REGION;

const WALLET_PRIVATE_KEY = env.WALLET_PRIVATE_KEY;

export const isValidHttpUrl = (urlString: string): boolean => {
  let url;

  try {
    url = new URL(urlString);
  } catch (_) {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
};
