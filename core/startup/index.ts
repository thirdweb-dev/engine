import { FastifyInstance } from "fastify";
import { getEnv } from "../loadEnv";

export const envVariablesCheck = async (
  server: FastifyInstance,
  variables: string[],
) => {
  server.log.info(`Checking for Required env variables`);
  for (let str of variables) {
    server.log.info(`\t Checking for ${str} in env`);
    if (!getEnv(str, undefined)) {
      server.log.error(`${str} not found in env`);
      process.exit(1);
    }
  }
};

export const walletEnvVariablesCheck = async (
  server: FastifyInstance,
  variables: { [key: string]: string[] }[],
) => {
  let resultArr: boolean[] = [];
  let keyResult: boolean;
  server.log.info(`Checking for Wallet Setup ENV variables`);
  for (let obj of variables) {
    keyResult = true;
    for (let key in obj) {
      for (let str of obj[key]) {
        server.log.info(
          `\t Checking for ${key.toLowerCase()} -> ${str} in env`,
        );
        keyResult = keyResult && !!getEnv(str, undefined);
      }
      resultArr.push(keyResult);
    }
  }

  if (!resultArr.includes(true)) {
    server.log.error(
      `No wallet private key or AWS KMS credentials provided. Please set WALLET_PRIVATE_KEY or [AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_KMS_KEY_ID] for KMS Wallet`,
    );
    process.exit(1);
  }
};
