import { AsyncStorage } from "@thirdweb-dev/wallets";
import fs from "fs";
import { prisma } from "../../../db/client";
import { WalletType } from "../../../schema/wallet";
import { logger } from "../../../utils/logger";

export class LocalFileStorage implements AsyncStorage {
  label?: string;

  constructor(private readonly walletAddress: string, label?: string) {
    this.walletAddress = walletAddress.toLowerCase();
    this.label = label;
  }

  async getItem(_: string): Promise<string | null> {
    const walletDetails = await prisma.walletDetails.findUnique({
      where: {
        address: this.walletAddress,
      },
    });

    if (walletDetails?.encryptedJson) {
      return walletDetails.encryptedJson;
    }

    // For backwards compatibility, support old local file storage format
    const dir = `${process.env.HOME}/.thirdweb`;
    const path = `${dir}/localWallet-${this.walletAddress}`;
    if (!fs.existsSync(dir) || !fs.existsSync(path)) {
      logger({
        service: "server",
        level: "error",
        message: `No local wallet found!`,
      });
      return null;
    }

    // Save the encrypted json in the database for future access
    const encryptedJson = fs.readFileSync(path, "utf8");
    await this.setItem("", encryptedJson);

    return encryptedJson;
  }

  async setItem(_: string, value: string): Promise<void> {
    await prisma.walletDetails.upsert({
      where: {
        address: this.walletAddress,
        type: WalletType.local,
      },
      create: {
        address: this.walletAddress,
        type: WalletType.local,
        encryptedJson: value,
        label: this.label,
      },
      update: {
        encryptedJson: value,
        label: this.label,
      },
    });
  }

  async removeItem(_: string): Promise<void> {
    await prisma.walletDetails.delete({
      where: {
        address: this.walletAddress,
        type: WalletType.local,
      },
    });
  }
}
