import { WalletDetails, WalletNonce } from "@prisma/client";

export type WalletNonceWithDetails = WalletNonce & {
  walletDetails: WalletDetails;
};

export type WalletWithNonceAndDetails = WalletNonce & WalletDetails;

export const cleanWallet = (
  wallet: WalletNonceWithDetails,
): WalletWithNonceAndDetails => {
  return {
    chainId: wallet.chainId,
    nonce: wallet.nonce,
    ...wallet.walletDetails,
  };
};
