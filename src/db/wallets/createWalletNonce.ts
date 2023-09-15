import { BigNumber } from "ethers";
import { getSDK } from "../../../core/sdk/sdk";
import { getWalletNonce } from "../../../core/services/blockchain";
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

  // TODO: chainId instead of chainName being passed around everywhere
  // or just pass SDK around
  const sdk = await getSDK(chainId.toString());
  // TODO: Replace BigNumber
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
