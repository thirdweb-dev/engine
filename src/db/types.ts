import type { Address, Hex } from "thirdweb";
import type {
  configuration,
  keypairs,
  permissions,
  tokens,
  webhooks,
} from "./schema";

export type ConfigInDb = typeof configuration.$inferSelect;

export type Permission = "ADMIN" | "OWNER";
export type PermissionDbEntry = typeof permissions.$inferSelect;
export type KeypairDbEntry = typeof keypairs.$inferSelect;

export type TokenDbEntry = typeof tokens.$inferSelect;

export type WebhookEventType = "AUTH" | "TRANSACTION";
export type WebhookDbEntry = typeof webhooks.$inferSelect;

export type ExecutionParams4337Serialized = {
  type: "AA";
  entrypointAddress: string;
  smartAccountAddress: string;
  signerAddress: string;
};

export const ENGINE_EOA_TYPES = [
  "local",
  "aws-kms",
  "gcp-kms",
  "circle",
] as const;

export type ExecutionParamsSerialized = ExecutionParams4337Serialized;

export type RevertDataSerialized = {
  errorName: string;
  errorArgs: Record<string, unknown>;
};

export type ExecutionResult4337Serialized =
  | {
      status: "SUBMITTED";
      monitoringStatus: "WILL_MONITOR" | "CANNOT_MONITOR";
      userOpHash: string;
    }
  | ({
      status: "CONFIRMED";
      userOpHash: Hex;
      transactionHash: Hex;
      actualGasCost: string;
      actualGasUsed: string;
      nonce: string;
    } & (
      | {
          onchainStatus: "SUCCESS";
        }
      | {
          onchainStatus: "REVERTED";
          revertData?: RevertDataSerialized;
        }
    ));

export type ExecutionResultSerialized = ExecutionResult4337Serialized;

export type TransactionParamsSerialized = {
  to: Address;
  data: Hex;
  value: string;
};
