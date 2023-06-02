import * as dotenv from "dotenv";

dotenv.config({
  debug: true,
  override: true,
});

function getEnv(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export { getEnv };
