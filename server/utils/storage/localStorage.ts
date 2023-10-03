import { AsyncStorage } from "@thirdweb-dev/wallets";
import * as fs from "fs";

export class LocalFileStorage implements AsyncStorage {
  constructor(private readonly walletAddress?: string) {
    if (walletAddress) {
      this.walletAddress = walletAddress;
    }
  }

  getKey(): string {
    if (this.walletAddress) {
      return `localWallet-${this.walletAddress.toLowerCase()}`;
    }
    throw new Error("Wallet Address not set");
  }

  getItem(_: string): Promise<string | null> {
    //read file from home directory/.thirdweb folder
    //file name is the key name
    //return null if it doesn't exist
    //return the value if it does exist
    const dir = `${process.env.HOME}/.thirdweb`;
    if (!fs.existsSync(dir)) {
      return Promise.resolve(null);
    }

    const path = `${dir}/${this.getKey()}`;
    if (!fs.existsSync(path)) {
      return Promise.resolve(null);
    }
    return Promise.resolve(fs.readFileSync(path, "utf8"));
  }

  setItem(_: string, value: string): Promise<void> {
    //save to home directory .thirdweb folder
    //create the folder if it doesn't exist
    const dir = `${process.env.HOME}/.thirdweb`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    fs.writeFileSync(`${dir}/${this.getKey()}`, value);
    return Promise.resolve();
  }

  removeItem(_: string): Promise<void> {
    //delete the file from home directory/.thirdweb folder
    const dir = `${process.env.HOME}/.thirdweb`;
    if (!fs.existsSync(dir)) {
      return Promise.resolve();
    }
    const path = `${dir}/${this.getKey()}`;
    if (!fs.existsSync(path)) {
      return Promise.resolve();
    } else {
      fs.unlinkSync(path);
      return Promise.resolve();
    }
  }
}
