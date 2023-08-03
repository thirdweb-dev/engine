import { Knex } from "knex";
import { WalletData } from "../interfaces";

export const insertIntoWallets = async (
  walletData: WalletData,
  database: Knex,
): Promise<void> => {
  await database("wallets")
    .insert(walletData)
    .onConflict(["walletAddress", "chainId"])
    .merge();
};
