import { encrypt } from "../../utils/crypto";
import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";
import { prisma } from "../client";
import { getConfig } from "../../utils/cache/get-config";
import { WalletCredentialsError } from "./get-wallet-credential";
import { randomBytes } from "node:crypto";
import { cirlceEntitySecretZodSchema } from "../../schemas/wallet";

// will be expanded to be a discriminated union of all supported wallet types
export type CreateWalletCredentialsParams = {
  type: "circle";
  label: string;
  entitySecret?: string;
  isDefault?: boolean;
};

export const createWalletCredential = async ({
  type,
  label,
  entitySecret,
  isDefault,
}: CreateWalletCredentialsParams) => {
  const { walletConfiguration } = await getConfig();

  switch (type) {
    case "circle": {
      const circleApiKey = walletConfiguration.circle?.apiKey;

      if (!circleApiKey) {
        throw new WalletCredentialsError("No Circle API Key Configured");
      }

      if (entitySecret) {
        const { error } = cirlceEntitySecretZodSchema.safeParse(entitySecret);
        if (error) {
          throw new WalletCredentialsError(
            "Invalid provided entity secret for Circle",
          );
        }
      }

      // If entitySecret is not provided, generate a random one
      const finalEntitySecret = entitySecret ?? randomBytes(32).toString("hex");
      // Create the wallet credentials
      const walletCredentials = await prisma.walletCredentials.create({
        data: {
          type,
          label,
          isDefault: isDefault ?? null,
          data: {
            entitySecret: encrypt(finalEntitySecret),
          },
        },
      });

      // try registering the entity secret. See: https://developers.circle.com/w3s/developer-controlled-create-your-first-wallet
      try {
        await registerEntitySecretCiphertext({
          apiKey: circleApiKey,
          entitySecret: finalEntitySecret,
          recoveryFileDownloadPath: "/dev/null",
        });
      } catch (e: unknown) {
        // If failed to registeer, permanently delete erroneously created credential
        await prisma.walletCredentials.delete({
          where: {
            id: walletCredentials.id,
          },
        });

        throw new WalletCredentialsError(
          `Could not register Entity Secret with Circle\n${JSON.stringify(e)}`,
        );
      }

      return walletCredentials;
    }
  }
};
