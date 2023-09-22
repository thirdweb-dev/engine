import { WalletNonce } from "@prisma/client";
import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";
import { createWalletNonce } from "../wallets/createWalletNonce";

interface GetWalletNonceParams {
  pgtx?: PrismaTransaction;
  address: string;
  chainId: number;
}

export const getWalletNonce = async ({
  pgtx,
  address,
  chainId,
}: GetWalletNonceParams): Promise<WalletNonce | null> => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const [walletNonce]: WalletNonce[] = await prisma.$queryRaw`
    SELECT
      *
    FROM
      "wallet_nonce"
    WHERE
      "chainId" = ${chainId}
      AND "address" = ${address.toLowerCase()}
    FOR UPDATE
  `;

  if (!walletNonce) {
    const backendWallet = await prisma.backendWallet.findUnique({
      where: {
        address: address.toLowerCase(),
      },
    });

    // If we have backend wallet, but not a wallet nonce for the chain, create one
    if (backendWallet) {
      return createWalletNonce({
        pgtx,
        address,
        chainId,
      });
    } else {
      return null;
    }
  }

  return walletNonce;
};
