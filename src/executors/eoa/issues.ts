import { eth_getBalance, getRpcClient, type Address } from "thirdweb";
import { okAsync, ResultAsync } from "neverthrow";
import { redis } from "../../lib/redis.js";
import { getChain } from "../../lib/chain.js";
import { z } from "zod";
import { thirdwebClient } from "../../lib/thirdweb-client.js";
import { accountActionErrorMapper, type EngineErr } from "../../lib/errors.js";

// Key for tracking EOA issues
const eoaIssuesKey = ({
  address,
  chainId,
}: {
  address: Address;
  chainId: string;
}) => `eoa-issues:${address}:${chainId}`;

// Issue types
export const EOA_ISSUE_CODES = ["out_of_gas"] as const;
export type EoaIssueCode = (typeof EOA_ISSUE_CODES)[number];

// Stale time constants (in milliseconds)
export const ISSUE_STALE_TIMES: Record<EoaIssueCode, number> = {
  out_of_gas: 60 * 1000, // 1 minute
};

export const outOfGasIssueSchema = z.object({
  type: z.literal("out_of_gas"),
  timestamp: z.coerce.number(),
  threshold: z.coerce.bigint(),
});

export const eoaIssueSchema = z.discriminatedUnion("type", [
  outOfGasIssueSchema,
]);

type EoaIssue = z.infer<typeof eoaIssueSchema>;

export type EoaIssues = {
  [key in EoaIssueCode]?: Extract<EoaIssue, { type: key }> & {
    isStale: boolean;
  };
};

export type EoaIssueDbErr = {
  kind: "eoa_issue_db_err";
  code: "unknown_redis_err" | "corruption_err";
  source?: Error;
};

export const mapRedisError = (error: unknown): EoaIssueDbErr => ({
  kind: "eoa_issue_db_err",
  code: "unknown_redis_err",
  source: error instanceof Error ? error : undefined,
});

/**
 * Sets an out of gas issue for an EOA wallet with the current timestamp and threshold
 *
 * @param address The account address
 * @param chainId The chain ID
 * @param threshold The balance threshold below which the wallet is considered out of gas
 * @returns A Result indicating success or failure
 */
export function setOutOfGasIssue(
  address: Address,
  chainId: string,
  threshold: bigint
): ResultAsync<boolean, EoaIssueDbErr> {
  const timestamp = Date.now();
  const issueData = JSON.stringify({
    timestamp,
    threshold: threshold.toString(),
  });

  return ResultAsync.fromPromise(
    redis.hset(eoaIssuesKey({ address, chainId }), "out_of_gas", issueData),
    mapRedisError
  ).map(() => true);
}

/**
 * Gets all issues for an EOA wallet and marks which ones are stale
 *
 * @param address The account address
 * @param chainId The chain ID
 * @returns A Result containing the issues or null if no issues
 */
export function getEoaIssues(
  address: Address,
  chainId: string
): ResultAsync<EoaIssues | null, EoaIssueDbErr> {
  return ResultAsync.fromPromise(
    redis.hgetall(eoaIssuesKey({ address, chainId })),
    mapRedisError
  ).map((result) => {
    if (!result || Object.keys(result).length === 0) {
      return null;
    }

    const now = Date.now();
    const issues: EoaIssues = {};

    for (const [issueType, issueDataStr] of Object.entries(result)) {
      const issue = JSON.parse(issueDataStr);
      issue.type = issueType as EoaIssueCode;

      const parsedIssue = eoaIssueSchema.safeParse(issue);

      if (!parsedIssue.success) {
        continue;
      }

      const isStale =
        now - parsedIssue.data.timestamp >
        ISSUE_STALE_TIMES[parsedIssue.data.type];

      issues[parsedIssue.data.type] = {
        ...parsedIssue.data,
        isStale,
      };
    }
    return Object.keys(issues).length > 0 ? issues : null;
  });
}

/**
 * Removes an issue for an EOA wallet
 *
 * @param address The account address
 * @param chainId The chain ID
 * @param issueType The type of issue to remove
 * @returns A Result indicating success or failure
 */
export function removeEoaIssue(
  address: Address,
  chainId: string,
  issueType: EoaIssueCode
): ResultAsync<boolean, EoaIssueDbErr> {
  return ResultAsync.fromPromise(
    redis.hdel(eoaIssuesKey({ address, chainId }), issueType),
    mapRedisError
  ).map((count) => count > 0);
}

/**
 * Checks for issues on a wallet chain, fetches issues, and refreshes stale ones
 *
 * @param address The account address
 * @param chainId The chain ID
 * @returns A Result containing the issues or null if no issues
 */
export function checkEoaIssues(address: Address, chainId: string) {
  return getEoaIssues(address, chainId).andThen((issues) => {
    if (!issues) {
      return okAsync(null);
    }

    // Check for stale issues and refresh them if needed
    const refreshPromises: Array<
      ResultAsync<boolean, EoaIssueDbErr | EngineErr>
    > = [];

    for (const issueKey of Object.keys(issues)) {
      const issue = issues[issueKey as EoaIssueCode];

      if (issue?.isStale) {
        // For each stale issue, check if it still exists
        switch (issue.type) {
          case "out_of_gas":
            if (issue.threshold) {
              refreshPromises.push(
                checkOutOfGasIssue(address, chainId, issue.threshold)
              );
            }
            break;
          // Add more cases for other issue types
        }
      }
    }

    if (refreshPromises.length === 0) {
      return okAsync(issues);
    }

    // Wait for all refresh operations to complete
    return ResultAsync.combine(refreshPromises).andThen(() => {
      // Get the updated issues
      return getEoaIssues(address, chainId);
    });
  });
}

/**
 * Checks if an EOA wallet has an out of gas issue
 *
 * @param address The account address
 * @param chainId The chain ID
 * @param threshold The balance threshold below which the wallet is considered out of gas
 * @returns A Result indicating if the issue exists
 */
export function checkOutOfGasIssue(
  address: Address,
  chainId: string,
  threshold: bigint
): ResultAsync<boolean, EoaIssueDbErr | EngineErr> {
  return ResultAsync.fromPromise(
    (async () => {
      const chain = await getChain(Number(chainId));
      const rpcRequest = getRpcClient({ chain, client: thirdwebClient });
      return eth_getBalance(rpcRequest, { address });
    })(),
    accountActionErrorMapper({ chainId, address, code: "get_balance_failed" })
  ).andThen((balance) => {
    if (balance <= threshold) {
      // If the issue exists, update the timestamp
      return setOutOfGasIssue(address, chainId, threshold);
    }

    // If the issue doesn't exist, remove it
    return removeEoaIssue(address, chainId, "out_of_gas");
  });
}
