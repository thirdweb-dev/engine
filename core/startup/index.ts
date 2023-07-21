import { FastifyInstance } from "fastify";
import { getEnv } from "../loadEnv";
import { THIRDWEB_SDK_REQUIRED_ENV_VARS } from "../constants";

export const envVariablesCheck = async (
  server: FastifyInstance,
  variables: string[],
) => {
  server.log.info(`Checking for Required ENV variables`);
  for (let str of variables) {
    server.log.info(`\t Checking for ${str} in ENV`);
    if (!getEnv(str, undefined)) {
      if (THIRDWEB_SDK_REQUIRED_ENV_VARS.includes(str)) {
        server.log.error(
          `\t \t${str} is a required ENV Variable to instantiate SDK. Please set ${str} the ENV Variable. You can get a secretKey from https://thirdweb.com/create-api-key`,
        );
      } else {
        server.log.error(`\t \t${str} not found in ENV variable`);
      }
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
          `\t Checking for ${key.toLowerCase()} -> ${str} in ENV`,
        );
        keyResult = keyResult && !!getEnv(str, undefined);
      }
      resultArr.push(keyResult);
    }
    if (resultArr.includes(true)) {
      break;
    }
  }

  if (!resultArr.includes(true)) {
    server.log.error(
      `Please set WALLET_PRIVATE_KEY or [AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_KMS_KEY_ID] for AWS KMS Wallet as ENV Variables.`,
    );
    process.exit(1);
  }
};
