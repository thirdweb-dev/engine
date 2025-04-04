import { env } from "./env";
import { createVaultClient } from "./vault-sdk/sdk";

export const vaultClient = await createVaultClient({
  baseUrl: env.VAULT_URL,
});
