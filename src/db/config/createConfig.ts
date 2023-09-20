import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

// TODO: Case on types by wallet type
interface CreateConfigParams {
  pgtx?: PrismaTransaction;
  aws?: {
    awsAccessKey: string;
    awsSecretAccessKey: string;
    awsRegion: string;
  };
  gcp?: {
    gcpAppCredentialPrivateKey: string;
    gcpProjectId: string;
    gcpKMSRingId: string;
    gcpLocationId: string;
    gcpAppCredentialEmail: string;
  };
  local?: {
    privateKey?: string;
    mnemonic?: string;
    encryptedJson?: string;
    password?: string;
  };
}

export const createConfig = async ({
  pgtx,
  ...configData
}: CreateConfigParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  return prisma.engineConfiguration.create({
    data: {
      ...configData.aws,
      ...configData.gcp,
      ...configData.local,
    },
  });
};
