import { BackendWallet, WalletNonce } from "@prisma/client";

export type WalletNonceWithDetails = WalletNonce & {
  config: BackendWallet;
};

export type WalletWithNonceAndDetails = WalletNonce & BackendWallet;

export const cleanWallet = (
  wallet: WalletNonceWithDetails,
): WalletWithNonceAndDetails => {
  return {
    chainId: wallet.chainId,
    nonce: wallet.nonce,
    ...wallet.config,
  };
};
