import { BigNumber } from "ethers";
import { getWalletNonce } from "../../../core/services/blockchain";
import { getSdk } from "../../../server/utils/cache/getSdk";
import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface CreateWalletNonceParams {
  pgtx?: PrismaTransaction;
  chainId: number;
  address: string;
  initNonce?: number;
}

export const createWalletNonce = async ({
  pgtx,
  chainId,
  address,
  initNonce,
}: CreateWalletNonceParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  const sdk = await getSdk({ chainId });

  // TODO: Remove init nonce and do this properly
  const nonce =
    initNonce ||
    BigNumber.from(
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
