import { WalletNonce } from "@prisma/client";
import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";
import { createWalletNonce } from "../wallets/createWalletNonce";

interface GetWalletNonceParams {
  pgtx?: PrismaTransaction;
  address: string;
  chainId: number;
  signerAddress?: string;
}

export const getWalletNonce = async ({
  pgtx,
  address,
  chainId,
  signerAddress,
}: GetWalletNonceParams): Promise<WalletNonce | null> => {
  const prisma = getPrismaWithPostgresTx(pgtx);

  const [walletNonce]: WalletNonce[] = await prisma.$queryRaw`
    SELECT
      *
    FROM
      "wallet_nonce"
    WHERE
      "chainId" = ${chainId.toString()}
      AND "address" = ${address.toLowerCase()}
    FOR UPDATE
  `;

  if (!walletNonce) {
    const walletDetails = await prisma.walletDetails.findUnique({
      where: {
        address: address.toLowerCase(),
      },
    });

    // If we have wallet details or a signer address, create a new nonce
    if (walletDetails || signerAddress) {
      return createWalletNonce({
        pgtx,
        address,
        chainId,
        signerAddress,
      });
    } else {
      return null;
    }
  }

  return walletNonce;
};
