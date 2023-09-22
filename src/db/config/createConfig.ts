import { StatusCodes } from "http-status-codes";
import { createCustomError } from "../../../core";
import { AWSConfig, GCPConfig } from "../../../server/schemas/config";
import { PrismaTransaction } from "../../schema/prisma";
import { WalletType } from "../../schema/wallet";
import { getPrismaWithPostgresTx } from "../client";

// TODO: Case on types by wallet type
interface CreateConfigParams {
  pgtx?: PrismaTransaction;
  awsKms?: AWSConfig;
  gcpKms?: GCPConfig;
  local?: {
    privateKey?: string;
    mnemonic?: string;
    encryptedJson?: string;
    password?: string;
  };
  configType: WalletType;
}

export const createConfig = async ({
  pgtx,
  ...configData
}: CreateConfigParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const exists = await prisma.configuration.findFirst({
    where: {
      configType: configData.configType,
    },
  });

  if (exists) {
    throw createCustomError(
      `Configuration for ${configData.configType} already exists`,
      StatusCodes.CONFLICT,
      "CONFLICT",
    );
  }

  return prisma.configuration.create({
    data: {
      ...configData.awsKms,
      ...configData.gcpKms,
      ...configData.local,
      configType: configData.configType,
    },
  });
};
