import * as dotenv from "dotenv";

dotenv.config({
  debug: true,
});

function getEnv(key: string, defaultValue: any = undefined): any {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }
  return value;
}

export { getEnv };
