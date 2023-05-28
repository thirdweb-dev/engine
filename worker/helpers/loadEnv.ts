import * as dotenv from "dotenv";

dotenv.config({
  debug: true,
});

function getEnv(key: string, defaultValue?: any): any {
  const value = process.env[key];
  if (!value) {
    if (defaultValue) {
      return defaultValue;
    }

    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export { getEnv };
