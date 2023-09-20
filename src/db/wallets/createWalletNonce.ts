import { BigNumber } from "ethers";
import { getWalletNonce } from "../../../core/services/blockchain";
import { getSdk } from "../../../server/utils/cache/getSdk";
import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface CreateWalletNonceParams {
  pgtx?: PrismaTransaction;
  chainId: number;
  address: string;
}

export const createWalletNonce = async ({
  pgtx,
  chainId,
  address,
}: CreateWalletNonceParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  const sdk = await getSdk({ chainId });

  const nonce = BigNumber.from(
    (await getWalletNonce(address.toLowerCase(), sdk.getProvider())) ?? 0,
  ).toNumber();

  return prisma.walletNonce.create({
    data: {
      address: address.toLowerCase(),
      chainId,
      nonce,
    },
  });
};
