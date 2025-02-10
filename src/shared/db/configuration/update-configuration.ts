import type { Prisma } from "@prisma/client";
import { encrypt } from "../../utils/crypto.js";
import { prisma } from "../client.js";
import { walletProviderConfigsSchema } from "./get-configuration.js";
import { logger } from "../../utils/logger.js";

export const updateConfiguration = async (
  data: Prisma.ConfigurationUpdateInput,
) => {
  if (typeof data.awsSecretAccessKey === "string") {
    data.awsSecretAccessKey = encrypt(data.awsSecretAccessKey);
  }

  if (typeof data.gcpApplicationCredentialPrivateKey === "string") {
    data.gcpApplicationCredentialPrivateKey = encrypt(
      data.gcpApplicationCredentialPrivateKey,
    );
  }

  // allow undefined (for no updates to field), but do not allow any other values than object
  if (typeof data.walletProviderConfigs === "object") {
    const { data: parsedWalletProviderConfigs, error } =
      walletProviderConfigsSchema.safeParse(data.walletProviderConfigs);

    if (error) {
      logger({
        level: "error",
        message: "Invalid walletProviderConfigs",
        error: error,
        service: "server",
      });
      // it's okay to throw a raw error here, any HTTP call that uses this should validate the input
      throw new Error("Invalid walletProviderConfigs");
    }

    if (parsedWalletProviderConfigs?.circle?.apiKey) {
      parsedWalletProviderConfigs.circle.apiKey = encrypt(
        parsedWalletProviderConfigs.circle.apiKey,
      );
    }

    data.walletProviderConfigs = parsedWalletProviderConfigs;
  } else if (typeof data.walletProviderConfigs !== "undefined") {
    throw new Error("Invalid walletProviderConfigs");
  }

  return prisma.configuration.update({
    where: {
      id: "default",
    },
    data,
  });
};
