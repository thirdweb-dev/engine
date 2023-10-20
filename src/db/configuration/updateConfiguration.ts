import { Prisma } from "@prisma/client";
import { webhookCache } from "../../../server/utils/cache/getWebhookConfig";
import { encrypt } from "../../utils/crypto";
import { prisma } from "../client";

export const updateConfiguration = async (
  data: Prisma.ConfigurationUpdateArgs["data"],
) => {
  webhookCache.clear();
  return prisma.configuration.update({
    where: {
      id: "default",
    },
    data: {
      ...data,
      ...(typeof data.awsSecretAccessKey === "string"
        ? { awsSecretAccessKey: encrypt(data.awsSecretAccessKey) }
        : {}),
      ...(typeof data.gcpApplicationCredentialPrivateKey === "string"
        ? {
            gcpApplicationCredentialPrivateKey: encrypt(
              data.gcpApplicationCredentialPrivateKey,
            ),
          }
        : {}),
    },
  });
};
