import type { Prisma } from "@prisma/client";
import { encrypt } from "../../utils/crypto";
import { prisma } from "../client";
import { walletProviderCredentialsSchema } from "./getConfiguration";

export const updateConfiguration = async (
  data: Prisma.ConfigurationUpdateArgs["data"],
) => {
  // ecnrypt AWS credential data
  if (typeof data.awsSecretAccessKey === "string") {
    data.awsSecretAccessKey = encrypt(data.awsSecretAccessKey);
  }

  // ecnrypt GCP credential data
  if (typeof data.gcpApplicationCredentialPrivateKey === "string") {
    data.gcpApplicationCredentialPrivateKey = encrypt(
      data.gcpApplicationCredentialPrivateKey,
    );
  }

  const walletProviderCredentials = walletProviderCredentialsSchema.parse(
    data.walletProviderCredentials,
  );

  // Encrypt Circle credential data
  if (walletProviderCredentials.cirlce) {
    walletProviderCredentials.cirlce.entitySecret = encrypt(
      walletProviderCredentials.cirlce.entitySecret,
    );
  }

  return prisma.configuration.update({
    where: {
      id: "default",
    },
    data: {
      ...data,
      walletProviderCredentials,
    },
  });
};
