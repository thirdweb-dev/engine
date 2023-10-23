export enum WebhooksEventTypes {
  QUEUED_TX = "Queued_Transaction",
  SENT_TX = "Sent_Transaction",
  MINED_TX = "Mined_Transaction",
  ERRORED_TX = "Errored_Transaction",
  RETRIED_TX = "Retried_Transaction",
  CANCELLED_TX = "Cancelled_Transaction",
  ALL_TX = "All_Transactions",
  BACKEND_WALLET_BALANCE = "Backend_Wallet_Balance",
}

export interface SanitizedWebHooksSchema {
  url: string;
  name: string;
  eventType: string;
  secret?: string;
  createdAt: string;
  active: boolean;
  id: number;
}

export interface WalletBalanceWebhookSchema {
  walletAddress: string;
  minimumBalance: string;
  currentBalance: string;
  chainId: number;
  message: string;
}
