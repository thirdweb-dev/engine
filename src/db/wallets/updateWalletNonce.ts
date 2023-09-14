import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface UpdateWalletNonceParams {
  pgtx?: PrismaTransaction;
  chainId: number;
  address: string;
  nonce: number;
}

export const updateWalletNonce = async ({
  pgtx,
  chainId,
  address,
  nonce,
}: UpdateWalletNonceParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  await prisma.walletNonce.update({
    where: {
      address_chainId: {
        address: address.toLowerCase(),
        chainId,
      },
    },
    data: {
      nonce,
    },
  });
};
