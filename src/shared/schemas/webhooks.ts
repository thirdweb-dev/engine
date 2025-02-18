import type { WalletCondition } from "./wallet-subscription-conditions";

export enum WebhooksEventTypes {
  QUEUED_TX = "queued_transaction",
  SENT_TX = "sent_transaction",
  MINED_TX = "mined_transaction",
  ERRORED_TX = "errored_transaction",
  CANCELLED_TX = "cancelled_transaction",
  ALL_TX = "all_transactions",
  BACKEND_WALLET_BALANCE = "backend_wallet_balance",
  AUTH = "auth",
  CONTRACT_SUBSCRIPTION = "contract_subscription",
  WALLET_SUBSCRIPTION = "wallet_subscription",
}

export type BackendWalletBalanceWebhookParams = {
  walletAddress: string;
  minimumBalance: string;
  currentBalance: string;
  chainId: number;
  message: string;
};
export interface WalletSubscriptionWebhookParams {
  subscriptionId: string;
  chainId: string;
  walletAddress: string;
  condition: WalletCondition;
  currentValue: string;
}
