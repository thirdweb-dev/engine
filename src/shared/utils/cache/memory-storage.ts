import type { AsyncStorage } from "@thirdweb-dev/wallets";

export class MemoryStorage implements AsyncStorage {
  data: Map<string, string> = new Map();

  async getItem(key: string) {
    return this.data.get(key) || null;
  }

  async setItem(key: string, value: string) {
    this.data.set(key, value);
  }

  async removeItem(key: string) {
    this.data.delete(key);
  }
}