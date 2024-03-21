import { Static } from "@sinclair/typebox";
import { transactionResponseSchema } from "../server/schemas/transaction";

export enum WebhooksEventTypes {
  QUEUED_TX = "queued_transaction",
  SENT_TX = "sent_transaction",
  MINED_TX = "mined_transaction",
  ERRORED_TX = "errored_transaction",
  RETRIED_TX = "retried_transaction",
  CANCELLED_TX = "cancelled_transaction",
  ALL_TX = "all_transactions",
  BACKEND_WALLET_BALANCE = "backend_wallet_balance",
  AUTH = "auth",
}

export interface SanitizedWebHooksSchema {
  url: string;
  name: string | null;
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

export interface AuthWebhookSchema {
  url: string;
  method: string;
  headers: any;
  params: any;
  query: any;
  cookies: any;
  body: any;
}

export type TransactionWebhookSchema = Static<typeof transactionResponseSchema>;

export type WebhookBody =
  | WalletBalanceWebhookSchema
  | AuthWebhookSchema
  | TransactionWebhookSchema;
