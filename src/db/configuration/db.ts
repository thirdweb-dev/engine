import { redis } from "../../utils/redis/redis";

// No optional values. All configuration has default values.
export interface ConfigurationDBResult {
  extraGas: bigint;
}

// Add more configurations to this type union.
export type ConfigurationName = "extra_gas";

// biome-ignore lint/complexity/noStaticOnlyClass: Encapsulates DB logic.
export class ConfigurationDB {
  private static redis = redis;
  private static redisKey = "configuration";

  /**
   * Sets one or more configuration.
   * @param updateValues
   */
  static set = async (updateValues: Partial<ConfigurationDBResult>) => {
    const tuples: [ConfigurationName, string][] = [];

    // Values must be stringified and parsed in `getAll()` identically.
    if (updateValues.extraGas) {
      tuples.push(["extra_gas", updateValues.extraGas.toString()]);
    }

    await this.redis.hset(this.redisKey, ...tuples.flat());
  };

  /**
   * Returns all stored configuration with default values if not set.
   * @returns ConfigurationDBResult
   */
  static getAll = async (): Promise<ConfigurationDBResult> => {
    const raw: Record<ConfigurationName, string> = await this.redis.hgetall(
      this.redisKey,
    );

    const result: ConfigurationDBResult = {
      // Define default values if not set.
      extraGas: 0n,
    };
    if ("extra_gas" in raw) {
      result.extraGas = BigInt(raw.extra_gas);
    }

    return result;
  };
}
