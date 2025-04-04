import type { Address } from "thirdweb";
import { redis } from "../../lib/redis.js";
import { ResultAsync } from "neverthrow";

const accountDeployingKey = (address: Address, chainId: string) =>
  `account-deploying:${address}:${chainId}`;

type RedisErr = {
  kind: "redis";
  code: "unknown_redis_err";
  source?: Error;
};

export function setAccountDeploying(
  address: Address,
  chainId: string,
  transactionId: string
) {
  return ResultAsync.fromPromise(
    redis.set(accountDeployingKey(address, chainId), transactionId),
    (err) =>
      ({
        kind: "redis",
        code: "unknown_redis_err",
        source: err,
      } as RedisErr)
  );
}

export function isAccountDeploying(address: Address, chainId: string) {
  return ResultAsync.fromPromise(
    redis.get(accountDeployingKey(address, chainId)),
    (err) =>
      ({ kind: "redis", code: "unknown_redis_err", source: err } as RedisErr)
  );
}

export function clearAccountDeploying(address: Address, chainId: string) {
  return ResultAsync.fromPromise(
    redis.del(accountDeployingKey(address, chainId)),
    (err) =>
      ({ kind: "redis", code: "unknown_redis_err", source: err } as RedisErr)
  );
}
