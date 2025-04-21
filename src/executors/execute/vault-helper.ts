// src/executor/external-bundler-async/vault-token-helper.ts

import {
  createSignedAccessToken,
  SIGNED_TOKEN_PREFIX,
  STORED_TOKEN_PREFIX,
} from "../../lib/vault-sdk/sdk.js";
import { vaultClient } from "../../lib/vault-client.js";
import {
  getContract,
  readContract,
  encode,
  prepareContractCall,
  type Address,
  type Hex,
  type ThirdwebClient,
  type ThirdwebContract,
  type Chain,
  type PreparedTransaction,
} from "thirdweb";
import { ResultAsync, errAsync, okAsync, safeTry } from "neverthrow";
import type {
  PolicyComponent,
  Rule,
  UserOperationV06Rules,
  UserOperationV07Rules,
} from "../../lib/vault-sdk/types.js";
import type { RpcErr, CryptoErr } from "../../lib/errors.js";

// Function to generate a random uint192 for nonce generation
export function generateRandomUint192(): bigint {
  const rand1 = BigInt(Math.floor(Math.random() * 0x100000000));
  const rand2 = BigInt(Math.floor(Math.random() * 0x100000000));
  const rand3 = BigInt(Math.floor(Math.random() * 0x100000000));
  const rand4 = BigInt(Math.floor(Math.random() * 0x100000000));
  const rand5 = BigInt(Math.floor(Math.random() * 0x100000000));
  const rand6 = BigInt(Math.floor(Math.random() * 0x100000000));
  return (
    (rand1 << BigInt(160)) |
    (rand2 << BigInt(128)) |
    (rand3 << BigInt(96)) |
    (rand4 << BigInt(64)) |
    (rand5 << BigInt(32)) |
    rand6
  );
}

// Interface for the function parameters
export interface CreateRestrictedSignedTokenParams {
  storedToken: string;
  chainId: string;
  chain: Chain; // Pass the chain object directly
  thirdwebClient: ThirdwebClient;
  entrypointAddress: Address;
  smartAccountAddress: Address;
  transactionParams: {
    to: Address;
    data: Hex;
    value?: bigint;
  }[];
}

// Interface for the result
export interface CreateRestrictedSignedTokenResult {
  signedToken: string;
  preallocatedNonce: bigint;
  nonceSeed: bigint;
  encodedCalldata: Hex;
}

// Helper to check if a token is a stored token
export function isStoredToken(token?: string): boolean {
  return !!token && token.startsWith(STORED_TOKEN_PREFIX);
}

// Helper to check if a token is a signed token
export function isSignedToken(token?: string): boolean {
  return !!token && token.startsWith(SIGNED_TOKEN_PREFIX);
}

// Function selectors for entrypoint contracts
const FN_SELECTOR = "0x35567e1a" as const; // getNonce function selector
const FN_INPUTS = [
  { type: "address", name: "sender" },
  { type: "uint192", name: "key" },
] as const;
const FN_OUTPUTS = [{ type: "uint256", name: "nonce" }] as const;

// Helper function similar to prepareBatchExecute but adapted for our use case
function prepareBatchExecute(args: {
  accountContract: ThirdwebContract;
  transactions: {
    to: Address;
    data: Hex;
    value?: bigint;
  }[];
}): PreparedTransaction {
  return prepareContractCall({
    contract: args.accountContract,
    method: "function executeBatch(address[], uint256[], bytes[])",
    params: [
      args.transactions.map((tx) => tx.to),
      args.transactions.map((tx) => tx.value || 0n),
      args.transactions.map((tx) => tx.data),
    ],
  });
}

// Helper function to prepare a single execute transaction
function prepareExecute(args: {
  accountContract: ThirdwebContract;
  transaction: {
    to: Address;
    data: Hex;
    value?: bigint;
  };
}): PreparedTransaction {
  return prepareContractCall({
    contract: args.accountContract,
    method: "function execute(address, uint256, bytes)",
    params: [
      args.transaction.to,
      args.transaction.value || 0n,
      args.transaction.data,
    ],
  });
}

/**
 * Helper function to encode transactions into the expected calldata format
 * This matches how the SDK formats calldata for both single and batch transactions
 */
function encodeTransactionsAsync(
  transactions: { to: Address; data: Hex; value?: bigint }[],
  smartAccountAddress: Address,
  chain: Chain,
  client: ThirdwebClient,
): ResultAsync<Hex, RpcErr> {
  if (transactions.length === 0) {
    return errAsync({
      kind: "rpc",
      code: "encode_transaction_failed",
      status: 400,
      message: "No transactions provided to encode",
    } as RpcErr);
  }

  // Get the smart account contract
  const accountContract = getContract({
    address: smartAccountAddress,
    chain,
    client,
  });

  // Use different encoding approaches based on number of transactions
  let executeTx;
  let firstTransaction = transactions[0];
  if (transactions.length === 1 && firstTransaction) {
    // For single transaction
    executeTx = prepareExecute({
      accountContract,
      transaction: firstTransaction,
    });
  } else {
    // For multiple transactions
    executeTx = prepareBatchExecute({
      accountContract,
      transactions,
    });
  }

  // Encode the transaction
  return ResultAsync.fromPromise(
    encode(executeTx),
    (e) =>
      ({
        kind: "rpc",
        code: "encode_transaction_failed",
        status: 500,
        message:
          e instanceof Error ? e.message : "Failed to encode transaction",
        source: e instanceof Error ? e : undefined,
      }) as RpcErr,
  );
}

/**
 * Creates a restricted signed token from a stored token, limiting permissions to exactly one transaction
 * with a specific nonce and calldata
 */
export function createRestrictedSignedToken({
  storedToken,
  chainId,
  chain,
  thirdwebClient,
  entrypointAddress,
  smartAccountAddress,
  transactionParams,
}: CreateRestrictedSignedTokenParams): ResultAsync<
  CreateRestrictedSignedTokenResult,
  RpcErr | CryptoErr
> {
  return safeTry(async function* () {
    // console.time("createRestrictedSignedToken");

    // 1. Create contract instance (using the passed chain object)
    const entrypointContract = getContract({
      address: entrypointAddress,
      chain,
      client: thirdwebClient,
    });

    // 2. Generate random nonce key
    const nonceSeed = generateRandomUint192();

    // console.timeLog("createRestrictedSignedToken", "before allocating nonce");

    // 3. Get pre-allocated nonce
    const preallocatedNonce = yield* ResultAsync.fromPromise(
      readContract({
        contract: entrypointContract,
        method: [FN_SELECTOR, FN_INPUTS, FN_OUTPUTS] as const,
        params: [smartAccountAddress, nonceSeed],
      }),
      (e) =>
        ({
          kind: "rpc",
          code: "read_contract_failed",
          status: 500,
          message:
            e instanceof Error
              ? e.message
              : "Failed to get pre-allocated nonce",
          source: e instanceof Error ? e : undefined,
          chainId,
          address: smartAccountAddress,
        }) as RpcErr,
    );

    // console.timeLog(
    //   "createRestrictedSignedToken",
    //   "after allocating nonce, before encoding",
    // );

    // 4. Encode the transactions
    const encodedCalldata = yield* encodeTransactionsAsync(
      transactionParams,
      smartAccountAddress,
      chain,
      thirdwebClient,
    );

    // console.timeLog(
    //   "createRestrictedSignedToken",
    //   "after encoding, before signing",
    // );

    // 5. Create rules for the policies
    const nonceRule: Rule = { pattern: `^${preallocatedNonce}$` };
    const callDataRule: Rule = { pattern: `(?i)^${encodedCalldata}$` };

    // 6. Create UserOp rules for both v0.6 and v0.7
    const userOpV06Rules: UserOperationV06Rules = {
      nonce: nonceRule,
      callData: callDataRule,
    };

    const userOpV07Rules: UserOperationV07Rules = {
      nonce: nonceRule,
      callData: callDataRule,
    };

    // 7. Create the policies
    const additionalPolicies: PolicyComponent[] = [
      {
        type: "eoa:signStructuredMessage",
        structuredPatterns: {
          useropV06: userOpV06Rules,
          useropV07: userOpV07Rules,
        },
      },
    ];

    // 8. Create the signed token with specific policies (24 hour expiry)
    const expiryTimestamp = Math.floor(Date.now() / 1000) + 60 * 60 * 24;

    const signedToken = yield* ResultAsync.fromPromise(
      createSignedAccessToken({
        vaultClient,
        baseAccessToken: storedToken,
        additionalPolicies,
        expiryTimestamp,
      }),
      (e) =>
        ({
          kind: "crypto",
          code: "encryption_failed",
          status: 500,
          message:
            e instanceof Error
              ? e.message
              : "Failed to create signed access token",
          source: e instanceof Error ? e : undefined,
        }) as CryptoErr,
    );

    // console.timeLog("createRestrictedSignedToken", "after signing");
    // console.timeEnd("createRestrictedSignedToken");

    // Return the final result
    return okAsync({
      signedToken,
      preallocatedNonce,
      nonceSeed,
      encodedCalldata,
    });
  });
}
