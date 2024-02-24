import { sha256HexSync } from "@thirdweb-dev/crypto";

let clientId: string | undefined;

export const deriveClientId = (secretKey: string): string => {
  if (!clientId) {
    const hashedSecretKey = sha256HexSync(secretKey);
    clientId = hashedSecretKey.slice(0, 32);
  }
  return clientId;
};
