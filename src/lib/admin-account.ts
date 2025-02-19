import { encryptedJsonToAccount } from "./accounts/local";
import { config } from "./config";

export const adminAccount = encryptedJsonToAccount({
  json: config.authEoaEncryptedJson,
})._unsafeUnwrap();
