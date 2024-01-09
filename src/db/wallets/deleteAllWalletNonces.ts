import { PrismaTransaction } from "../../schema/prisma";
import { getPrismaWithPostgresTx } from "../client";

interface DeleteAllWalletNoncesParams {
  pgtx?: PrismaTransaction;
}

/**
 * Delete the cached value of all backend wallet nonces.
 * This is useful to require all backend wallets to resync their
 * nonce on the next txn.
 */
export const deleteAllWalletNonces = async ({
  pgtx,
}: DeleteAllWalletNoncesParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  await prisma.walletNonce.deleteMany({});
};
