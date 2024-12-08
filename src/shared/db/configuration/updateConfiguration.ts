import type { Prisma } from "@prisma/client";
import { encrypt } from "../../utils/crypto";
import { prisma } from "../client";

export const updateConfiguration = async (
  data: Prisma.ConfigurationUpdateArgs["data"],
) => {
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
