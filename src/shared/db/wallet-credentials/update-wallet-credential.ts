import { getWalletCredential } from "./get-wallet-credential";
import { encrypt } from "../../utils/crypto";
import { prisma } from "../client";
import { cirlceEntitySecretZodSchema } from "../../schemas/wallet";

interface UpdateWalletCredentialParams {
  id: string;
  label?: string;
  isDefault?: boolean;
  entitySecret?: string;
}

type UpdateData = {
  label?: string;
  isDefault: boolean | null;
  data?: {
    entitySecret: string;
  };
};

export const updateWalletCredential = async ({
  id,
  label,
  isDefault,
  entitySecret,
}: UpdateWalletCredentialParams) => {
  // First check if credential exists
  await getWalletCredential({ id });

  // If entitySecret is provided, validate and encrypt it
  const data: UpdateData = {
    label,
    isDefault: isDefault || null,
  };

  if (entitySecret) {
    // Validate the entity secret
    cirlceEntitySecretZodSchema.parse(entitySecret);

    // Only update data field if entitySecret is provided
    data.data = {
      entitySecret: encrypt(entitySecret),
    };
  }

  // Update the credential
  const updatedCredential = await prisma.walletCredentials.update({
    where: {
      id,
    },
    data,
  });

  return updatedCredential;
};
