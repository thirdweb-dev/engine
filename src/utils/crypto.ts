import crypto from "crypto-js";
import { env } from "./env";

export const encrypt = (data: string): string => {
  return crypto.AES.encrypt(data, env.THIRDWEB_API_SECRET_KEY).toString();
};

export const decrypt = (data: string) => {
  return crypto.AES.decrypt(data, env.THIRDWEB_API_SECRET_KEY).toString(
    crypto.enc.Utf8,
  );
};
