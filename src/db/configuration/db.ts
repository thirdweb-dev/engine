import superjson from "superjson";
import { redis } from "../../utils/redis/redis";

// Add more configurations to this type union.
export type ConfigurationKey = "config:extra_gas";

export class ConfigurationDB {
  private static redis = redis;

  /**
   * Sets a configuration value.
   * @param key The configuration name to set.
   * @param value Any serializable value. BigInt and Date types are permitted.
   */
  static set = async (key: ConfigurationKey, value: any) => {
    await this.redis.set(key, superjson.stringify(value));
  };

  /**
   * Gets a configuration value, if found.
   * @param key The configuration name to get.
   * @returns The parsed value.
   */
  static get = async <T>(key: ConfigurationKey): Promise<T | null> => {
    const value = await this.redis.get(key);
    if (!value) {
      return null;
    }
    return superjson.parse(value) as T;
  };
}
