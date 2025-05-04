import {
  eth_sendRawTransaction,
  getRpcClient,
  type Address,
  type Hex,
  type ThirdwebClient,
} from "thirdweb";
import {
  signTypedData as vault_signTypedData,
  signMessage as vault_signMessage,
  signTransaction as vault_signTransaction,
  signStructuredMessage as vault_signStructuredMessage,
  type VaultClient,
} from "../../vault-sdk/sdk.js";
import type {
  StructuredMessageInput,
  UserOperationV06Input,
  UserOperationV07Input,
  Auth as VaultAuth,
  VaultError,
} from "../../vault-sdk/types.js";
import type { Account } from "thirdweb/wallets";
import type { BaseErr, RpcErr } from "../../errors.js";
import type {
  TypedData,
  TypedDataDomain,
  TypedDataToPrimitiveTypes,
} from "abitype";

import type {
  SendTransactionOptions,
  SignTransactionOptions,
} from "../transaction-types.js";
import type { SignableMessage } from "viem";
import { bytesToHex } from "@noble/hashes/utils";
import { Result, ResultAsync } from "neverthrow";
import { HTTPError } from "ky";
import { parseTransaction as vault_parseTransaction } from "../../vault-sdk/transaction-parser.js";
import { getChain } from "../../chain.js";

export type VaultAccountOptions = {
  thirdwebClient: ThirdwebClient;
  vaultClient: VaultClient;
  address: Address;
  auth: VaultAuth;
};

export function getVaultAccount(options: VaultAccountOptions): Account {
  const { vaultClient, thirdwebClient, address, auth } = options;
  async function signTransaction(tx: SignTransactionOptions) {
    // Use Result.fromThrowable for synchronous operation
    const parseResult = Result.fromThrowable(
      () => vault_parseTransaction(tx),
      (e) =>
        createVaultError(
          e,
          address,
          "signTransaction",
          "transaction_parse_failed",
          500,
        ),
    )();

    if (parseResult.isErr()) {
      throw parseResult.error;
    }

    const typedTransaction = parseResult.value;

    const signResult = await ResultAsync.fromPromise(
      vault_signTransaction({
        client: vaultClient,
        request: {
          auth,
          options: {
            from: address,
            transaction: typedTransaction,
          },
        },
      }),
      (e) => createVaultError(e, address, "signTransaction"),
    );

    if (signResult.isErr()) {
      throw signResult.error;
    }

    const result = signResult.value;

    if (result.error) {
      throw handleVaultResponseError(result.error, address, "signTransaction");
    }

    return result.data.signature as Hex;
  }

  async function signTypedData<
    Types extends TypedData,
    PrimaryType extends keyof Types | "EIP712Domain" = keyof Types,
  >(typedData: {
    domain: TypedDataDomain;
    types: Types;
    primaryType: PrimaryType;
    message: TypedDataToPrimitiveTypes<Types>[PrimaryType];
  }) {
    const signResult = await ResultAsync.fromPromise(
      vault_signTypedData({
        client: vaultClient,
        request: {
          auth,
          options: {
            from: address,
            typedData: {
              domain: typedData.domain,
              types: typedData.types,
              primaryType: typedData.primaryType,
              message: typedData.message,
            },
          },
        },
      }),
      (e) => createVaultError(e, address, "signTypedData"),
    );

    if (signResult.isErr()) {
      throw signResult.error;
    }

    const result = signResult.value;

    if (result.error) {
      throw handleVaultResponseError(result.error, address, "signTypedData");
    }

    return result.data.signature as Hex;
  }

  async function sendTransaction(tx: SendTransactionOptions) {
    const signature = await signTransaction(tx);

    const rpcRequest = getRpcClient({
      client: thirdwebClient,
      chain: getChain(tx.chainId),
    });

    try {
      const transactionHash = await eth_sendRawTransaction(
        rpcRequest,
        signature,
      );
      return { transactionHash };
    } catch (error) {
      throw {
        kind: "rpc",
        code: "send_transaction_failed",
        status: 500,
        message: error instanceof Error ? error.message : "RPC request failed",
        source: error instanceof Error ? error : undefined,
      } as RpcErr;
    }
  }

  async function signMessage({
    message,
    chainId,
    originalMessage,
  }: {
    message: SignableMessage;
    originalMessage?: string;
    chainId?: number;
  }) {
    let finalMessage: string;
    let messageFormat: "text" | "hex" = "text";

    if (typeof message === "string") {
      finalMessage = message;
    } else if (typeof message.raw === "string") {
      finalMessage = message.raw;
      messageFormat = "hex";
    } else {
      finalMessage = bytesToHex(message.raw);
      messageFormat = "hex";
    }

    // Handle structured message if originalMessage is provided
    if (originalMessage) {
      // Use Result.fromThrowable to safely parse JSON
      const parseResult = Result.fromThrowable(
        () => JSON.parse(originalMessage),
        (e) =>
          createVaultError(
            e,
            address,
            "signMessage",
            "serialization_error",
            400,
          ),
      )();

      // Only proceed with UserOp detection if parsing succeeded
      if (parseResult.isOk()) {
        const parsedMessage = parseResult.value;

        // Basic check that this might be a UserOp (minimal required fields)
        const looksLikeUserOp =
          parsedMessage?.sender &&
          parsedMessage?.nonce &&
          parsedMessage?.callData &&
          parsedMessage?.callGasLimit &&
          parsedMessage?.verificationGasLimit &&
          parsedMessage?.maxFeePerGas;

        if (looksLikeUserOp) {
          // Check for version-specific fields
          const hasV06OnlyFields = "paymasterAndData" in parsedMessage;
          const hasV07OnlyFields =
            "paymasterData" in parsedMessage || "paymaster" in parsedMessage;

          let structuredMessage: StructuredMessageInput;

          // Prioritize explicit v0.7 indicators, fall back to v0.6 only if clear
          if (hasV07OnlyFields || !hasV06OnlyFields) {
            structuredMessage = {
              useropV07: parsedMessage as UserOperationV07Input,
            };
          } else {
            structuredMessage = {
              useropV06: parsedMessage as UserOperationV06Input,
            };
          }

          // Use ResultAsync for the async operation
          const signResult = await ResultAsync.fromPromise(
            vault_signStructuredMessage({
              client: vaultClient,
              request: {
                auth,
                options: {
                  from: address,
                  structuredMessage,
                  chainId,
                },
              },
            }),
            (e) =>
              createVaultError(
                e,
                address,
                "signMessage",
                "protocol_error",
                500,
              ),
          );

          if (signResult.isErr()) {
            throw signResult.error;
          }

          const result = signResult.value;

          if (result.error) {
            throw handleVaultResponseError(
              result.error,
              address,
              "signMessage",
            );
          }

          // Check if message matches
          if (result.data.message !== `0x${finalMessage}`) {
            throw createVaultError(
              new Error(
                "[VAULT ERROR] Received message does not match original message",
              ),
              address,
              "signMessage",
              "invalid_input",
              400,
            );
          }

          return result.data.signature as Hex;
        }
      }
      // If parsing failed or it's not a UserOp, continue with normal signing
      // No need to log anything here, the error is already captured in parseResult if needed
    }

    // Original signMessage code for regular signing
    const signResult = await ResultAsync.fromPromise(
      vault_signMessage({
        client: vaultClient,
        request: {
          auth,
          options: {
            from: address,
            message: finalMessage,
            format: messageFormat,
            chainId,
          },
        },
      }),
      (e) => createVaultError(e, address, "signMessage", "protocol_error", 500),
    );

    if (signResult.isErr()) {
      throw signResult.error;
    }

    const result = signResult.value;

    if (result.error) {
      throw handleVaultResponseError(result.error, address, "signMessage");
    }

    return result.data.signature as Hex;
  }

  // signAuthorization: async (authorization: AuthorizationRequest) => {
  //   const signature = ox__Secp256k1.sign({
  //     payload: ox__Authorization.getSignPayload(authorization),
  //     privateKey: privateKey,
  //   });
  //   return ox__Authorization.from(authorization, { signature });
  // },

  return {
    address,
    signTypedData: signTypedData as Account["signTypedData"],
    sendTransaction,
    signTransaction,
    signMessage,
  } satisfies Account;
}

export type VaultKmsErr = BaseErr & {
  kind: "vault_kms";
  code:
    | "auth_unsupported_operation"
    | "auth_insufficient_scope"
    | "auth_invalid_admin_key"
    | "internal_server_error"
    | "serialization_error"
    | "invalid_input"
    | "protocol_error" // we use this for all UnencryptedErrors
    | "unreachable" // we use this for all thrown errors
    | "transaction_parse_failed"; // new code for transaction parsing failures
  message: string;
  status?: number;
  details?: string;
  address: Address;
  operation: "signMessage" | "signTransaction" | "signTypedData";
};

// Helper function to create a standard VaultKmsErr from any error
function createVaultError(
  e: unknown,
  address: Address,
  operation: VaultKmsErr["operation"],
  code: VaultKmsErr["code"] = "unreachable",
  status: BaseErr["status"] = 500,
): VaultKmsErr {
  if (e instanceof HTTPError) {
    return {
      address,
      code: "unreachable",
      message: e.message,
      source: e,
      kind: "vault_kms",
      operation,
      status: 500,
    };
  }

  return {
    address,
    code,
    message:
      e instanceof Error ? e.message : `Unexpected error during ${operation}`,
    source: e instanceof Error ? e : undefined,
    kind: "vault_kms",
    operation,
    status,
  };
}

// Helper function to handle vault API response errors
function handleVaultResponseError(
  error: VaultError,
  address: Address,
  operation: VaultKmsErr["operation"],
): VaultKmsErr {
  return {
    address,
    code:
      "code" in error ? (error.code as VaultKmsErr["code"]) : "protocol_error",
    message: error.message,
    status: "status" in error ? (error.status as VaultKmsErr["status"]) : 400,
    kind: "vault_kms",
    operation,
    details: error.details,
  };
}
