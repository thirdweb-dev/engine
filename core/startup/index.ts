import { FastifyInstance } from "fastify";
import { env } from "../../env";

export const walletEnvVariablesCheck = async (
  server: FastifyInstance,
) => {
  if (!!env.WALLET_PRIVATE_KEY) {
    return;
  }
  if (!!env.AWS_ACCESS_KEY_ID && !!env.AWS_SECRET_ACCESS_KEY && !!env.AWS_KMS_KEY_ID && !!env.AWS_REGION) {
    return;
  }

  server.log.error(
    `❌ Please set WALLET_PRIVATE_KEY or [AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_KMS_KEY_ID] for AWS KMS Wallet as ENV Variables.`,
  );
  process.exit(1);
};
