import { Prisma } from "@prisma/client";
import { encrypt } from "../../utils/cypto";
import { prisma } from "../client";
import { getConfiguration } from "./getConfiguration";

export const updateConfiguration = async (
  data: Prisma.ConfigurationUpdateArgs["data"],
) => {
  const config = await getConfiguration();
  return prisma.configuration.update({
    where: {
      id: config.id,
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
