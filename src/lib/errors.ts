import type { Hook } from "@hono/zod-validator";
import type { Env } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import type {
  ExecutionParamsSerialized,
  ExecutionResultSerialized,
} from "../db/types";

import type { QueueingErr as BundlerExecutorAsyncQueueingErr } from "../executors/external-bundler-async";

export type HttpErrStatusCode = 400 | 401 | 403 | 404 | 500 | 501;

type BaseErr = {
  message?: string;
  status: HttpErrStatusCode;
  source?: Error;
};

export type AuthErr = BaseErr & {
  kind: "auth";
  code:
    | "missing_auth_header"
    | "malformed_auth_header"
    | "invalid_jwt"
    | "expired_jwt"
    | "invalid_signature"
    | "insufficient_permissions"
    | "invalid_keypair"
    | "invalid_body_hash"
    | "webhook_auth_failed";
};

export type AccessTokenErr = BaseErr & {
  kind: "access_token";
  code: "token_not_found" | "token_revoked" | "insufficient_permissions";
};

export type KeypairErr = BaseErr & {
  kind: "keypair";
  code: "missing_identifier" | "keypair_not_found";
};

export type PermissionsErr = BaseErr & {
  kind: "permissions";
  code: "insufficient_permissions" | "no_permissions";
};

export type DbErr = BaseErr &
  (
    | {
        kind: "database";
        code: "query_failed" | "invalid_id_format";
      }
    | {
        kind: "database";
        code: "transaction_db_entry_failed";
        status: 500;
        executionParams: ExecutionParamsSerialized;
        executionResult: ExecutionResultSerialized;
      }
  );

export function buildTransactionDbEntryErr({
  error,
  executionParams,
  executionResult,
}: {
  error: DbErr;
  executionParams: ExecutionParamsSerialized;
  executionResult: ExecutionResultSerialized;
}) {
  return {
    kind: "database",
    code: "transaction_db_entry_failed",
    message:
      "Your transaction was sent sucessfully but engine was unable to store transaction details. Please do not resend this transaction to prevent double spending.",
    status: 500,
    source: error.source,
    executionParams,
    executionResult,
  } as DbErr;
}

export type ValidationErr = BaseErr & {
  kind: "validation";
  code: "invalid_address" | "parse_error";
};

export type WebhookErr = BaseErr & {
  kind: "webhook";
  code: "request_failed";
  status: number;
};

export type ConfigErr = BaseErr & {
  kind: "config";
  code: "redis_error" | "account_generation_failed" | "config_creation_failed";
};

export type LocalAccountErr = BaseErr & {
  kind: "local_account";
  code: "account_creation_failed" | "account_decryption_failed";
};

export type CryptoErr = {
  kind: "crypto";
  code:
    | "encryption_failed"
    | "decryption_failed"
    | "invalid_format_not_json"
    | "key_derivation_failed";
} & BaseErr;

export type RpcErr = {
  kind: "rpc";
  chainId?: string;
  address?: string;
  code:
    | "smart_account_determination_failed"
    | "send_transaction_failed"
    | "sign_transaction_failed"
    | "sign_userop_failed"
    | "bundle_userop_failed"
    | "get_transaction_count_failed"
    | "get_userop_receipt_failed"
    | "serialize_transaction_failed"
    | "get_transaction_receipt_failed"
    | "get_balance_failed"
    | "resolve_method_failed";
} & BaseErr;

export type SmartAccountErr = {
  kind: "smart_account";
  code: "smart_account_validation_failed";
} & BaseErr;

export type AccountErr = {
  kind: "account";
  address?: string;
  code:
    | "account_not_found"
    | "account_deletion_failed"
    | "could_not_disambiguate"
    | "invalid_platform_identifiers";
} & BaseErr;

export type CircleErr = BaseErr & {
  kind: "circle";
  code:
    | "wallet_set_creation_failed"
    | "wallet_provisioning_failed"
    | "wallet_retrieval_failed"
    | "invalid_wallet_set"
    | "rate_limit_exceeded"
    | "unauthorized"
    | "service_unavailable"
    | "signature_failed";
};

export type AwsKmsErr = BaseErr & {
  kind: "aws_kms";
  code:
    | "unauthorized"
    | "rate_limit_exceeded"
    | "invalid_key_state"
    | "key_creation_failed"
    | "address_retrieval_failed"
    | "signature_failed";
  message: string;
  cause?: unknown;
};

export type GcpKmsErr = BaseErr & {
  kind: "gcp_kms";
  code:
    | "unauthorized"
    | "rate_limit_exceeded"
    | "invalid_key_state"
    | "key_creation_failed"
    | "client_error"
    | "address_retrieval_failed"
    | "signature_failed";
};

export type WalletProviderConfigErr = BaseErr & {
  kind: "wallet_provider_config";
  code:
    | "missing_aws_kms_config"
    | "missing_gcp_kms_config"
    | "missing_circle_config";
};

export type EoaCredentialErr = BaseErr & {
  kind: "eoa_credential";
  code: "credential_not_found";
};

export type EngineErr =
  | AuthErr
  | DbErr
  | ValidationErr
  | AccessTokenErr
  | PermissionsErr
  | KeypairErr
  | WebhookErr
  | CryptoErr
  | LocalAccountErr
  | RpcErr
  | SmartAccountErr
  | CircleErr
  | AwsKmsErr
  | GcpKmsErr
  | WalletProviderConfigErr
  | EoaCredentialErr
  | AccountErr
  | BundlerExecutorAsyncQueueingErr;

export function isEngineErr(err: unknown): err is EngineErr {
  return (
    typeof err === "object" &&
    "kind" in (err as EngineErr) &&
    "code" in (err as EngineErr)
  );
}

export class EngineHttpException extends HTTPException {
  engineErr: EngineErr;

  constructor(error: EngineErr) {
    super(error.status, {
      message: error.message ?? getDefaultErrorMessage(error),
      cause: error.source,
    });
    this.engineErr = error;
  }
}

export function engineErrToHttpException(error: EngineErr): HTTPException {
  return new EngineHttpException(error);
}

export function getDefaultErrorMessage(error: EngineErr): string {
  switch (error.kind) {
    case "auth": {
      const messages: Record<AuthErr["code"], string> = {
        missing_auth_header: "Missing or invalid authorization header",
        invalid_jwt: "Invalid JWT token",
        invalid_signature: "Invalid signature",
        insufficient_permissions: "Insufficient permissions",
        malformed_auth_header: "Malformed authorization header",
        expired_jwt: "Token has expired",
        invalid_keypair: "Invalid keypair",
        invalid_body_hash: "Invalid body hash",
        webhook_auth_failed: "Webhook authentication failed",
      };
      return messages[error.code];
    }
    case "database": {
      const messages: Record<DbErr["code"], string> = {
        query_failed: "Database operation failed",
        invalid_id_format: "Invalid ID format",
        transaction_db_entry_failed:
          "Your transaction was sent sucessfully but engine was unable to store transaction details. Please do not resend this transaction to prevent double spending.",
      };
      return messages[error.code];
    }
    case "access_token": {
      const messages: Record<AccessTokenErr["code"], string> = {
        token_not_found: "Token not found",
        token_revoked: "Token revoked",
        insufficient_permissions: "Insufficient permissions",
      };
      return messages[error.code];
    }
    case "validation": {
      const messages: Record<ValidationErr["code"], string> = {
        invalid_address: "Invalid address",
        parse_error: "Invalid input",
      };
      return messages[error.code];
    }
    case "permissions": {
      const messages: Record<PermissionsErr["code"], string> = {
        insufficient_permissions: "Insufficient permissions for operation",
        no_permissions: "No permissions defined for this address",
      };
      return messages[error.code];
    }
    case "keypair": {
      const messages: Record<KeypairErr["code"], string> = {
        missing_identifier: "Missing identifier",
        keypair_not_found: "Keypair not found",
      };
      return messages[error.code];
    }
    case "webhook": {
      const messages: Record<WebhookErr["code"], string> = {
        request_failed: "Webhook request failed",
      };
      return messages[error.code];
    }
    case "crypto": {
      const messages: Record<CryptoErr["code"], string> = {
        encryption_failed: "Encryption failed",
        decryption_failed: "Decryption failed",
        invalid_format_not_json:
          "Invalid encrypted data format, could not parse JSON",
        key_derivation_failed: "Key derivation failed",
      };
      return messages[error.code];
    }
    case "local_account": {
      const messages: Record<LocalAccountErr["code"], string> = {
        account_creation_failed: "Account creation failed",
        account_decryption_failed: "Account decryption failed",
      };
      return messages[error.code];
    }
    case "rpc": {
      const messages: Record<RpcErr["code"], string> = {
        smart_account_determination_failed:
          "Unable to auto create smart account for newly created account",
        send_transaction_failed: "Failed to send transaction to RPC",
        sign_transaction_failed: "Failed to sign transaction",
        sign_userop_failed: "Failed to sign user operation",
        bundle_userop_failed: "Failed to bundle user operation",
        get_userop_receipt_failed: "Failed to get user operation receipt",
        get_transaction_count_failed: "Failed to get transaction count",
        serialize_transaction_failed:
          "Failed to serialize transaction. This usually means we were unable to simulate the transaction, because simulation failed.",
        get_transaction_receipt_failed: "Failed to get transaction receipt",
        get_balance_failed: "Failed to get balance",
        resolve_method_failed:
          "Failed to resolve method, this usually means we were unable to get your contract ABI",
      };
      return messages[error.code];
    }
    case "smart_account": {
      const messages: Record<SmartAccountErr["code"], string> = {
        smart_account_validation_failed: "Unable to validate smart account",
      };
      return messages[error.code];
    }
    case "circle": {
      const messages: Record<CircleErr["code"], string> = {
        wallet_set_creation_failed: "Unable to create wallet set",
        wallet_provisioning_failed: "Unable to provision wallet",
        wallet_retrieval_failed: "Unable to retrieve wallet",
        invalid_wallet_set: "Invalid wallet set",
        rate_limit_exceeded: "Rate limit exceeded",
        unauthorized: "Unauthorized",
        service_unavailable: "Service unavailable",
        signature_failed: "Signature failed",
      };
      return messages[error.code];
    }
    case "aws_kms": {
      const messages = {
        unauthorized: "Unauthorized",
        rate_limit_exceeded: "Rate limit exceeded",
        invalid_key_state: "Invalid key state",
        key_creation_failed: "Key creation failed",
        address_retrieval_failed: "Address retrieval failed",
        signature_failed: "Signature failed",
      };
      return messages[error.code];
    }
    case "gcp_kms": {
      const messages: Record<GcpKmsErr["code"], string> = {
        address_retrieval_failed: "Address retrieval failed",
        signature_failed: "Signature failed",
        key_creation_failed: "Key creation failed",
        client_error: "Client error",
        invalid_key_state: "Invalid key state",
        unauthorized: "Unauthorized",
        rate_limit_exceeded: "Rate limit exceeded",
      };
      return messages[error.code];
    }
    case "wallet_provider_config": {
      const messages: Record<WalletProviderConfigErr["code"], string> = {
        missing_aws_kms_config: "Missing AWS KMS config",
        missing_gcp_kms_config: "Missing GCP KMS config",
        missing_circle_config: "Missing Circle config",
      };
      return messages[error.code];
    }
    case "eoa_credential": {
      const messages: Record<EoaCredentialErr["code"], string> = {
        credential_not_found: "Credential not found",
      };
      return messages[error.code];
    }
    case "account": {
      const messages: Record<AccountErr["code"], string> = {
        account_not_found: "Account not found",
        account_deletion_failed: "Account deletion failed",
        could_not_disambiguate:
          "Multiple signers have been found for this smart account. Please specify signer address to use this smart account",
        invalid_platform_identifiers:
          "Invalid platform identifiers. Platform identifiers for this EOA do not match the type of the account",
      };
      return messages[error.code];
    }
    case "queue": {
      const messages: Record<BundlerExecutorAsyncQueueingErr["code"], string> =
        {
          "external_bundler:queuing_confirm_job_failed":
            "Failed to queue confirm job",
          "external_bundler:queuing_send_job_failed":
            "Failed to queue send job",
        };
      return messages[error.code];
    }
  }
}

export function unwrapError(originalError: unknown) {
  return {
    ...(originalError
      ? {
          name: originalError?.constructor?.name ?? "Unknown",
          message: (originalError as Error)?.message ?? String(originalError),
          stack: (originalError as Error)?.stack,
          ...(originalError as object),
        }
      : {}),
  };
}

export function mapDbError(error: unknown): DbErr {
  if (error instanceof Error) {
    if (error.message.includes("invalid input syntax for type uuid")) {
      return {
        kind: "database",
        code: "invalid_id_format",
        status: 400,
        source: error,
      };
    }
  }

  return {
    kind: "database",
    code: "query_failed",
    status: 500,
    source: error instanceof Error ? error : undefined,
  };
}

export function getZodErrorMessage(error: ZodError): string {
  return error.errors
    .map((err) => {
      const path = err.path.join(".");
      return path ? `${path}: ${err.message}` : err.message;
    })
    .join(", ");
}

export function mapZodError(error: unknown): ValidationErr {
  if (error instanceof ZodError) {
    return {
      kind: "validation",
      code: "parse_error",
      status: 400,
      message: getZodErrorMessage(error),
    } as const;
  }

  // Handle non-Zod errors by returning a generic validation error
  return {
    kind: "validation",
    code: "parse_error",
    status: 400,
    message: "Invalid input",
    source: error instanceof Error ? error : undefined,
  } as const;
}

export const zErrorMapper: Hook<unknown, Env, string> = (result) => {
  if (!result.success) {
    throw engineErrToHttpException(mapZodError(result.error));
  }
};

type RpcErrorOptions = {
  code?: RpcErr["code"];
  status?: number;
  defaultMessage?: string;
  chainId?: string;
  address?: string;
};

const DEFAULT_RPC_OPTIONS: RpcErrorOptions = {
  code: "send_transaction_failed",
  status: 500,
  defaultMessage: "RPC request failed",
};

export type AccountActionErr = GcpKmsErr | AwsKmsErr | CircleErr;

/**
 * Checks if the error is an account action error.
 * An account action error happens at the "account" level.
 * If you were to send a transaction with a gcp kms account, it can fail at 2 levels.
 *
 * `account.sendTransaction` internally calls `signTransaction`.
 * If signing a transacation failed because we couldn't access the KMS account itself,
 * this error would be an `AccountActionErr`.
 *
 * If instead, the send call to RPC errored, then you will receive an RpcErr
 * You can use the `accountActionErrorMapper` along with any method to an Account type.
 * This will accurately map to an AccountErr or an RpcErr based on what went wrong.
 *
 * @param error - The error to check.
 * @returns True if the error is an account action error, false otherwise.
 */
export function isAccountActionErr(error: unknown): error is AccountActionErr {
  return (
    isEngineErr(error) &&
    (error.kind === "gcp_kms" ||
      error.kind === "aws_kms" ||
      error.kind === "circle")
  );
}

/**
 * Maps an account action error to an EngineErr.
 * This will accurately map to an AccountErr or an RpcErr based on what went wrong.
 *
 * @param options - The options to pass to the mapper.
 * @returns The mapped error.
 */
export const accountActionErrorMapper = (options: RpcErrorOptions = {}) => {
  const { code, status, defaultMessage, address, chainId } = {
    ...DEFAULT_RPC_OPTIONS,
    ...options,
  };

  return (error: unknown): EngineErr => {
    if (isEngineErr(error)) {
      return error;
    }

    return {
      kind: "rpc",
      code,
      status,
      chainId,
      address,
      message: error instanceof Error ? error.message : defaultMessage,
      source: error instanceof Error ? error : undefined,
    } as RpcErr;
  };
};
