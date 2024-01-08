import { sha256HexSync } from "@thirdweb-dev/crypto";

export const deriveClientId = (secretKey: string): string => {
  const hashedSecretKey = sha256HexSync(secretKey);
  const derivedClientId = hashedSecretKey.slice(0, 32);
  return derivedClientId;
};
