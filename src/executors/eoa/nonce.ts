import type { Address } from "thirdweb";
import { errAsync, okAsync, ResultAsync } from "neverthrow";
import { redis } from "../../lib/redis";
import { randomUUID } from "node:crypto";

const engineNonceKey = ({
  address,
  chainId,
}: {
  address: Address;
  chainId: string;
}) => `nonce:${address}:${chainId}`;

const confirmedNonceKey = ({
  address,
  chainId,
}: {
  address: Address;
  chainId: string;
}) => `nonce-confirmed:${address}:${chainId}`;

const recycledNoncesKey = ({
  address,
  chainId,
}: {
  address: Address;
  chainId: string;
}) => `nonce-recycled:${address}:${chainId}`;

const epochKey = ({
  address,
  chainId,
}: {
  address: Address;
  chainId: string;
}) => `nonce-epoch:${address}:${chainId}`;

// Key for tracking in-flight nonces (nonces that have been used but not yet confirmed)
const inflightNoncesKey = ({
  address,
  chainId,
}: {
  address: Address;
  chainId: string;
}) => `inflight:nonces:${address}:${chainId}`;

export type NonceDbErr = {
  kind: "nonce_db_err";
  code: "unknown_redis_err" | "corruption_err" | "too_many_missing_nonces";
  source?: Error;
  missingNonces?: number[];
};

export const mapRedisError = (error: unknown): NonceDbErr => ({
  kind: "nonce_db_err",
  code: "unknown_redis_err",
  source: error instanceof Error ? error : undefined,
});

type RecycledNonceResult =
  | { status: "success"; nonce: number; epoch: string }
  | { status: "empty" }
  | { status: "oversized"; count: number };

/**
 * Records a transaction that was just sent with a specific nonce
 * Maps the nonce to a transaction ID in the in-flight nonces hashmap
 * 
 * @param address The account address
 * @param chainId The chain ID
 * @param nonce The nonce used for the transaction
 * @param txId The transaction ID
 * @returns A Result indicating success or failure
 */
export function recordInflightNonce(
  address: Address,
  chainId: string,
  nonce: number,
  txId: string
): ResultAsync<boolean, NonceDbErr> {
  return ResultAsync.fromPromise(
    redis.hset(
      inflightNoncesKey({ address, chainId }),
      nonce.toString(),
      txId
    ),
    mapRedisError
  ).map(() => true);
}

/**
 * Removes a nonce from the in-flight nonces hashmap when a transaction is confirmed
 * 
 * @param address The account address
 * @param chainId The chain ID
 * @param nonce The nonce to remove
 * @returns A Result indicating success or failure
 */
export function removeInflightNonce(
  address: Address,
  chainId: string,
  nonce: number
): ResultAsync<boolean, NonceDbErr> {
  return ResultAsync.fromPromise(
    redis.hdel(inflightNoncesKey({ address, chainId }), nonce.toString()),
    mapRedisError
  ).map((count) => count > 0);
}

/**
 * Gets all in-flight nonces for an account on a specific chain
 * 
 * @param address The account address
 * @param chainId The chain ID
 * @returns A Result containing a map of nonce to txId
 */
export function getInflightNonces(
  address: Address,
  chainId: string
): ResultAsync<Map<number, string>, NonceDbErr> {
  return ResultAsync.fromPromise(
    redis.hgetall(inflightNoncesKey({ address, chainId })),
    mapRedisError
  ).map((result) => {
    const nonceMap = new Map<number, string>();
    
    for (const [nonceStr, txId] of Object.entries(result)) {
      const nonce = Number(nonceStr);
      if (Number.isFinite(nonce)) {
        nonceMap.set(nonce, txId);
      }
    }
    
    return nonceMap;
  });
}

/**
 * Checks for missing nonces between confirmed and engine nonce
 * Returns a list of missing nonces if any are found
 * If more than 100 nonces are missing, returns an error
 * 
 * @param address The account address
 * @param chainId The chain ID
 * @returns A Result containing an array of missing nonces or an error if too many are missing
 */
export function checkMissingNonces(
  address: Address,
  chainId: string
): ResultAsync<number[], NonceDbErr> {
  const MAX_MISSING_NONCES = 100;
  
  return ResultAsync.fromPromise(
    redis.eval(
      `
      local engineNonceKey = KEYS[1]
      local confirmedNonceKey = KEYS[2]
      local inflightNoncesKey = KEYS[3]
      
      local engineNonce = tonumber(redis.call('get', engineNonceKey) or '0')
      local confirmedNonce = tonumber(redis.call('get', confirmedNonceKey) or '0')
      
      -- Get all in-flight nonces
      local inflightNonces = redis.call('hkeys', inflightNoncesKey)
      local inflightSet = {}
      
      -- Convert to a set for O(1) lookups
      for i, nonceStr in ipairs(inflightNonces) do
        inflightSet[tonumber(nonceStr)] = true
      end
      
      -- Find missing nonces
      local missingNonces = {}
      for nonce = confirmedNonce + 1, engineNonce do
        if not inflightSet[nonce] then
          table.insert(missingNonces, nonce)
          -- If we have too many missing nonces, return early
          if #missingNonces > tonumber(ARGV[1]) then
            return 'too_many_missing'
          end
        end
      end
    
      return missingNonces
      `,
      3,
      engineNonceKey({ address, chainId }),
      confirmedNonceKey({ address, chainId }),
      inflightNoncesKey({ address, chainId }),
      MAX_MISSING_NONCES.toString()
    ),
    mapRedisError
  ).andThen((result) => {
    if (result === 'too_many_missing') {
      return errAsync({
        kind: "nonce_db_err",
        code: "too_many_missing_nonces",
      } as NonceDbErr);
    }
    
    try {
      // The result will already be an array
      const missingNonces = result as number[];
      return okAsync(missingNonces);
    } catch (error) {
      return errAsync({
        kind: "nonce_db_err",
        code: "corruption_err",
        source: error instanceof Error ? error : undefined,
      } as NonceDbErr);
    }
  });
}


export function popRecycledNonce(
  address: Address,
  chainId: string,
  maxSize: number
): ResultAsync<RecycledNonceResult, NonceDbErr> {
  return ResultAsync.fromPromise(
    redis.eval(
      `
      local count = redis.call('zcard', KEYS[1])
      if count >= tonumber(ARGV[1]) then
        return "oversized:" .. count
      end
      
      local epoch = redis.call('get', KEYS[2])
      if not epoch then
        return "empty"
      end
      
      local first = redis.call('zrange', KEYS[1], 0, 0)
      if #first == 0 then
        return "empty"
      end
      
      redis.call('zrem', KEYS[1], first[1])
      return "success:" .. first[1] .. ':' .. epoch
      `,
      2,
      recycledNoncesKey({ address, chainId }),
      epochKey({ address, chainId }),
      maxSize.toString()
    ),
    mapRedisError
  ).andThen((result) => {
    if (!result)
      return errAsync({
        kind: "nonce_db_err",
        code: "corruption_err",
      } as NonceDbErr);

    const parts = (result as string).split(":");

    if (parts[0] === "oversized") {
      return okAsync({
        status: "oversized",
        count: Number(parts[1]),
      } as RecycledNonceResult);
    }

    if (parts[0] === "empty") {
      return okAsync({ status: "empty" } as RecycledNonceResult);
    }

    if (parts[0] === "success") {
      const nonceStr = parts[1];
      const epoch = parts[2];
      const nonce = Number(nonceStr);

      if (!Number.isFinite(nonce) || !epoch) {
        return errAsync({
          kind: "nonce_db_err",
          code: "corruption_err",
        } as NonceDbErr);
      }

      return okAsync({
        status: "success",
        nonce,
        epoch,
      } as RecycledNonceResult);
    }

    return errAsync({
      kind: "nonce_db_err",
      code: "corruption_err",
    } as NonceDbErr);
  });
}

export function resetNonceState(
  address: Address,
  chainId: string,
  newNonce: number
): ResultAsync<true, NonceDbErr> {
  return ResultAsync.fromPromise(
    redis
      .multi()
      .set(epochKey({ address, chainId }), randomUUID().toString())
      .set(engineNonceKey({ address, chainId }), newNonce)
      .set(confirmedNonceKey({ address, chainId }), newNonce)
      .del(recycledNoncesKey({ address, chainId }))
      .del(inflightNoncesKey({ address, chainId })) // Also clear in-flight nonces on reset
      .exec(),
    mapRedisError
  ).andThen((result) => {
    if (!result || result.some(([err]) => err)) {
      return errAsync({
        kind: "nonce_db_err",
        code: "unknown_redis_err",
      } as NonceDbErr);
    }
    return okAsync(true as const);
  });
}

export function getNonceState(
  address: Address,
  chainId: string
): ResultAsync<
  {
    engineNonce: number;
    confirmedNonce: number;
    recycledCount: number;
    epoch: string;
    inFlight: number;
  },
  NonceDbErr
> {
  return ResultAsync.fromPromise(
    redis.eval(
      `
      local engineNonce = redis.call('get', KEYS[1]) or '0'
      local confirmedNonce = redis.call('get', KEYS[2]) or '0'
      local recycledCount = redis.call('zcard', KEYS[3])
      local epoch = redis.call('get', KEYS[4])
      local inflightCount = redis.call('hlen', KEYS[5])
      
      -- Initialize epoch if it doesn't exist
      if not epoch then
        epoch = ARGV[1]  -- UUID passed in
        redis.call('set', KEYS[4], epoch)
      end
      
      return engineNonce .. ':' .. confirmedNonce .. ':' .. recycledCount .. ':' .. epoch .. ':' .. inflightCount
      `,
      5,
      engineNonceKey({ address, chainId }),
      confirmedNonceKey({ address, chainId }),
      recycledNoncesKey({ address, chainId }),
      epochKey({ address, chainId }),
      inflightNoncesKey({ address, chainId }),
      randomUUID()
    ),
    mapRedisError
  ).andThen((result) => {
    const [engineStr, confirmedStr, recycledStr, epoch, inflightStr] = (
      result as string
    ).split(":");
    const engineNonce = Number(engineStr);
    const confirmedNonce = Number(confirmedStr);
    const recycledCount = Number(recycledStr);
    const inflightCount = Number(inflightStr);

    if (
      !Number.isFinite(engineNonce) ||
      !Number.isFinite(confirmedNonce) ||
      !Number.isFinite(recycledCount) ||
      !Number.isFinite(inflightCount) ||
      !epoch
    ) {
      return errAsync({
        kind: "nonce_db_err",
        code: "corruption_err",
      } as NonceDbErr);
    }

    return okAsync({
      engineNonce,
      confirmedNonce,
      recycledCount,
      epoch,
      inFlight: inflightCount,
    });
  });
}

export function recycleNonce(
  address: Address,
  chainId: string,
  nonce: number,
  nonceEpoch: string
): ResultAsync<boolean, NonceDbErr> {
  return ResultAsync.fromPromise(
    redis.eval(
      `
      local currentEpoch = redis.call('get', KEYS[1])
      if not currentEpoch or currentEpoch ~= ARGV[2] then
        return 0
      end
      
      redis.call('zadd', KEYS[2], ARGV[1], ARGV[1])
      return 1
      `,
      2,
      epochKey({ address, chainId }),
      recycledNoncesKey({ address, chainId }),
      nonce.toString(),
      nonceEpoch
    ),
    mapRedisError
  ).map((result) => result === 1);
}

export function setEngineNonceMax(
  address: Address,
  chainId: string,
  newValue: number
): ResultAsync<number, NonceDbErr> {
  return ResultAsync.fromPromise(
    redis.eval(
      `
    local current = redis.call('get', KEYS[1])
    if not current or tonumber(current) < tonumber(ARGV[1]) then
      redis.call('set', KEYS[1], ARGV[1])
      return tonumber(ARGV[1])
    end
    return tonumber(current)
  `,
      1,
      engineNonceKey({ address, chainId }),
      newValue.toString()
    ),
    mapRedisError
  ).andThen((result) => {
    const engineNonce = Number(result);
    if (!Number.isFinite(engineNonce)) {
      return errAsync({
        kind: "nonce_db_err",
        code: "corruption_err",
      } as NonceDbErr);
    }

    return okAsync(engineNonce);
  });
}

/**
 * Sets the confirmed nonce to max(passed_value, existing_value)
 *
 * Also removes all recycled nonces that are less than the new confirmed nonce.
 * Also removes all in-flight nonces that are less than the new confirmed nonce.
 *
 * Lastly, it sets the engine nonce to max(passed_value, existing_engine_nonce).
 * This is because engineNonce should always be >= confirmedNonce.
 *
 * @returns the current confirmed nonce and the current engine nonce stored in redis as a result of this operation.
 */
export function setConfirmedNonceMax(
  address: Address,
  chainId: string,
  newValue: number
): ResultAsync<{ confirmedNonce: number; engineNonce: number }, NonceDbErr> {
  return ResultAsync.fromPromise(
    redis.eval(
      `
      local confirmed = redis.call('get', KEYS[1])
      local engine = redis.call('get', KEYS[2])
      
      if not confirmed or tonumber(confirmed) < tonumber(ARGV[1]) then
        redis.call('set', KEYS[1], ARGV[1])
        confirmed = ARGV[1]
      else
        confirmed = confirmed
      end
      
      if not engine or tonumber(engine) < tonumber(ARGV[1]) then
        redis.call('set', KEYS[2], ARGV[1])
        engine = ARGV[1]
      else
        engine = engine
      end
      
      -- Remove all recycled nonces less than confirmed nonce
      redis.call('zremrangebyscore', KEYS[3], 0, tonumber(confirmed) - 1)
      
      -- Remove all in-flight nonces less than confirmed nonce
      local inflightKeys = redis.call('hkeys', KEYS[4])
      for i, nonceStr in ipairs(inflightKeys) do
        local nonce = tonumber(nonceStr)
        if nonce < tonumber(confirmed) then
          redis.call('hdel', KEYS[4], nonceStr)
        end
      end
      
      return confirmed .. ':' .. engine
      `,
      4,
      confirmedNonceKey({ address, chainId }),
      engineNonceKey({ address, chainId }),
      recycledNoncesKey({ address, chainId }),
      inflightNoncesKey({ address, chainId }),
      newValue.toString()
    ),
    mapRedisError
  ).andThen((result) => {
    const [confirmedStr, engineStr] = (result as string).split(":");
    const confirmedNonce = Number(confirmedStr);
    const engineNonce = Number(engineStr);

    if (!Number.isFinite(confirmedNonce) || !Number.isFinite(engineNonce)) {
      return errAsync({
        kind: "nonce_db_err",
        code: "corruption_err",
      } as NonceDbErr);
    }

    return okAsync({ confirmedNonce, engineNonce });
  });
}

// Get/Set engine nonce
export function getEngineNonce(
  address: Address,
  chainId: string
): ResultAsync<number, NonceDbErr> {
  return ResultAsync.fromPromise(
    redis.get(engineNonceKey({ address, chainId })),
    mapRedisError
  ).map((value) => Number(value || 0));
}

export function incrementEngineNonce(
  address: Address,
  chainId: string
): ResultAsync<number, NonceDbErr> {
  return ResultAsync.fromPromise(
    redis.incr(engineNonceKey({ address, chainId })),
    mapRedisError
  );
}
