import { WalletData } from "../interfaces";
import { Knex } from "knex";

export const insertIntoWallets = async (
  walletData: WalletData,
  database: Knex,
): Promise<void> => {
  await database("wallets")
    .insert(walletData)
    .onConflict(["walletAddress", "chainId"])
    .merge();
};
