import { PrismaTransaction } from "../../schema/prisma";
import { WalletType } from "../../schema/wallet";
import { getPrismaWithPostgresTx } from "../client";

interface GetConfigParams {
  pgtx?: PrismaTransaction;
  configType: WalletType;
}

export const getConfigData = async ({ pgtx, configType }: GetConfigParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  return prisma.configuration.findFirst({
    where: {
      configType,
    },
  });
};
