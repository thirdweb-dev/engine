import type { Prisma } from "@prisma/client";
import { encrypt } from "../../utils/crypto";
import { prisma } from "../client";
import { walletProviderCredentialsSchema } from "./get-configuration";

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
  if (walletProviderCredentials.circle) {
    walletProviderCredentials.circle.entitySecret = encrypt(
      walletProviderCredentials.circle.entitySecret,
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
