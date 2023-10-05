import { time } from "./time";

export interface FetchEngineParams {
  host: string;
  path: string;
  thirdwebApiSecretKey: string;
  method?: string;
  body?: string;
  backendWalletAddress?: string;
  accountAddress?: string;
}

export const fetchEngine = async (params: FetchEngineParams) => {
  return time(async () => {
    const res = await fetch(`${params.host}${params.path}`, {
      method: params.method || "POST",
      headers: {
        Authorization: `Bearer ${params.thirdwebApiSecretKey}`,
        ...(params.body ? { "Content-Type": "application/json" } : {}),
        ...(params.backendWalletAddress
          ? { "x-backend-wallet-address": params.backendWalletAddress }
          : {}),
        ...(params.accountAddress
          ? { "x-account-address": params.accountAddress }
          : {}),
      },
      body: params.body,
    });

    const result = await res.json();
    return { res: result };
  });
};
