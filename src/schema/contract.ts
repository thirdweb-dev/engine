import { z } from "zod";

export const ContractParamsSchema = z.object({
  chain_name: z.enum([
    "mainnet",
    "ethereum",
    "goerli",
    "polygon",
    "matic",
    "mumbai",
    "fantom",
    "fantom-testnet",
    "avalanche",
    "avalanche-testnet",
    "avalanche-fuji",
    "optimism",
    "optimism-goerli",
    "arbitrum",
    "arbitrum-goerli",
    "binance",
    "binance-testnet",
  ]),
  contract_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});
