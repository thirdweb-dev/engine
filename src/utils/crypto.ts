import crypto from "crypto-js";
import { env } from "./env";

export const encrypt = (data: string): string => {
  return crypto.AES.encrypt(data, env.ENCRYPTION_PASSWORD).toString();
};

export const decrypt = (data: string, password: string) => {
  return crypto.AES.decrypt(data, password).toString(crypto.enc.Utf8);
};
