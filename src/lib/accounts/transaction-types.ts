import type { Account } from "thirdweb/wallets";

export type SendTransaction = Account["sendTransaction"];
export type SendTransactionOptions = Parameters<SendTransaction>[0];

export type SignTransaction = Account["signTransaction"];
export type SignTransactionOptions = Parameters<
  NonNullable<SignTransaction>
>[0];

export type SendTransactionResult = ReturnType<SendTransaction>;
