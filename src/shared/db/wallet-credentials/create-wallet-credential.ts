import { encrypt } from "../../utils/crypto";
import { prisma } from "../client";
import { getConfig } from "../../utils/cache/get-config";
import { WalletCredentialsError } from "./get-wallet-credential";

// will be expanded to be a discriminated union of all supported wallet types
export type CreateWalletCredentialsParams = {
  type: "circle";
  label: string;
  entitySecret: string;
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
      // Create the wallet credentials
      const walletCredentials = await prisma.walletCredentials.create({
        data: {
          type,
          label,
          isDefault: isDefault ? true : null,
          data: {
            entitySecret: encrypt(entitySecret),
          },
        },
      });
        return walletCredentials;
      }

    }
  }
};
