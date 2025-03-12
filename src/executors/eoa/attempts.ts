import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { redis } from "../../lib/redis";
import { type NonceDbErr, mapRedisError } from "./nonce";
import SuperJSON from "superjson";
import { z } from "zod";
import { evmAddressSchema, hexSchema } from "../../lib/zod";

// Redis key definitions
const txAttemptKey = ({
  txId,
  attemptNo,
}: {
  txId: string;
  attemptNo?: number;
}) => `tx:attempts:${txId}:${attemptNo ?? ""}`;

const txCurrentAttemptKey = (txId: string) => `tx:attempts:${txId}:current`;
// Valid error codes from TransactionSendError
export type TransactionSendErrorCode = z.infer<
  typeof transactionErrorSchema.shape.code
>;

// Error object schema
export type TransactionError = {
  code: TransactionSendErrorCode;
  message: string;
};

// Transaction attempt schema
export type TransactionAttempt = z.infer<typeof txAttemptSchema>;

// Zod schema for validation
const transactionErrorSchema = z.object({
  code: z.enum([
    "gas_too_low",
    "insufficient_funds",
    "nonce_too_low",
    "nonce_too_high",
    "replacement_underpriced",
    "already_known",
    "unknown_rpc_error",
    "other_engine_error"
  ]),
  message: z.string(),
});

const baseTxAttemptSchema = z.object({
  from: evmAddressSchema,
  chainId: z.string(),
  to: evmAddressSchema.optional(),
  data: hexSchema,
  value: z.coerce.bigint().optional(),
  nonce: z.number(),
  gas: z.coerce.bigint(),
  hash: hexSchema,
  error: transactionErrorSchema.optional(),
});

const legacyFeeSchema = z.object({
  feeType: z.literal("legacy"),
  gasPrice: z.coerce.bigint(), // Will be parsed as bigint
});

const eip1559FeeSchema = z.object({
  feeType: z.literal("eip1559"),
  maxFeePerGas: z.coerce.bigint(), // Will be parsed as bigint
  maxPriorityFeePerGas: z.coerce.bigint(), // Will be parsed as bigint
});

const txAttemptSchema = z.union([
  baseTxAttemptSchema.merge(legacyFeeSchema),
  baseTxAttemptSchema.merge(eip1559FeeSchema),
]);

/**
 * Records a transaction attempt in Redis
 * @param txId The transaction ID
 * @param attempt The transaction attempt details
 * @returns A Result indicating success or failure
 */
export function recordTransactionAttempt(
  txId: string,
  attempt: TransactionAttempt
): ResultAsync<number, NonceDbErr> {
  return ResultAsync.fromPromise(
    redis
      .multi()
      .incr(txCurrentAttemptKey(txId))
      .get(txCurrentAttemptKey(txId))
      .exec(),
    mapRedisError
  ).andThen((result) => {
    if (!result) {
      return errAsync({
        kind: "nonce_db_err",
        code: "unknown_redis_err",
      } as NonceDbErr);
    }

    const [_, innerResult] = result;

    if (!innerResult) {
      return errAsync({
        kind: "nonce_db_err",
        code: "unknown_redis_err",
      } as NonceDbErr);
    }

    const [err, currentAttemptStr] = innerResult;

    if (err) {
      return errAsync({
        kind: "nonce_db_err",
        code: "unknown_redis_err",
      } as NonceDbErr);
    }

    const currentAttempt = Number(currentAttemptStr);
    if (!Number.isFinite(currentAttempt)) {
      return errAsync({
        kind: "nonce_db_err",
        code: "corruption_err",
      } as NonceDbErr);
    }

    // Serialize the attempt with SuperJSON to handle bigint values
    const serializedAttempt = SuperJSON.stringify(attempt);

    return ResultAsync.fromPromise(
      redis.set(
        txAttemptKey({ txId, attemptNo: currentAttempt }),
        serializedAttempt
      ),
      mapRedisError
    ).map(() => currentAttempt);
  });
}

/**
 * Gets the current attempt number for a transaction
 * @param txId The transaction ID
 * @returns A Result containing the current attempt number or 0 if not found
 */
export function getCurrentAttemptNumber(
  txId: string
): ResultAsync<number, NonceDbErr> {
  return ResultAsync.fromPromise(
    redis.get(txCurrentAttemptKey(txId)),
    mapRedisError
  ).map((value) => Number(value || 0));
}

/**
 * Gets a specific transaction attempt
 * @param txId The transaction ID
 * @param attemptNo The attempt number to retrieve
 * @returns A Result containing the transaction attempt or null if not found
 */
export function getTransactionAttempt(
  txId: string,
  attemptNo: number
): ResultAsync<TransactionAttempt | null, NonceDbErr> {
  return ResultAsync.fromPromise(
    redis.get(txAttemptKey({ txId, attemptNo })),
    mapRedisError
  ).andThen((serializedAttempt) => {
    if (!serializedAttempt) {
      return okAsync(null);
    }

    const parsed = SuperJSON.parse(serializedAttempt);
    const validationResult = txAttemptSchema.safeParse(parsed);

    if (!validationResult.success) {
      return errAsync({
        kind: "nonce_db_err",
        code: "corruption_err",
      } as NonceDbErr);
    }

    return okAsync(SuperJSON.parse(serializedAttempt) as TransactionAttempt);
  });
}

/**
 * Gets the current transaction attempt atomically
 * @param txId The transaction ID
 * @returns A Result containing the current transaction attempt or null if not found
 */
export function getCurrentTransactionAttempt(
  txId: string
): ResultAsync<TransactionAttempt | null, NonceDbErr> {
  return ResultAsync.fromPromise(
    redis.eval(
      `
      local currentAttempt = redis.call('get', KEYS[1])
      if not currentAttempt or tonumber(currentAttempt) == 0 then
        return nil
      end
      
      local attempt = redis.call('get', KEYS[2] .. currentAttempt)
      if not attempt then
        return nil
      end
      
      return attempt
      `,
      2,
      txCurrentAttemptKey(txId),
      txAttemptKey({ txId })
    ),
    mapRedisError
  ).andThen((serializedAttempt) => {
    if (!serializedAttempt) {
      return okAsync(null);
    }

    try {
      const parsed = SuperJSON.parse(serializedAttempt as string);
      const validationResult = txAttemptSchema.safeParse(parsed);

      if (!validationResult.success) {
        return errAsync({
          kind: "nonce_db_err",
          code: "corruption_err",
        } as NonceDbErr);
      }

      return okAsync(validationResult.data);
    } catch (error) {
      return errAsync({
        kind: "nonce_db_err",
        code: "corruption_err",
        source: error instanceof Error ? error : undefined,
      } as NonceDbErr);
    }
  });
}

/**
 * Gets all transaction attempts for a transaction
 * @param txId The transaction ID
 * @returns A Result containing an array of all transaction attempts
 */
export function getAllTransactionAttempts(
  txId: string
): ResultAsync<
  { attemptNumber: number; attempt: TransactionAttempt }[],
  NonceDbErr
> {
  return getCurrentAttemptNumber(txId).andThen((currentAttempt) => {
    if (currentAttempt === 0) {
      return okAsync([]);
    }

    // Create an array of ResultAsync for each attempt
    const attemptResults = Array.from({ length: currentAttempt }, (_, i) =>
      getTransactionAttempt(txId, i + 1).map((attempt) => ({
        attemptNumber: i + 1,
        attempt,
      }))
    );

    // Combine all results and handle errors
    return ResultAsync.combine(attemptResults).map((attempts) =>
      attempts.filter(
        (a): a is { attemptNumber: number; attempt: TransactionAttempt } =>
          a !== null
      )
    );
  });
}
