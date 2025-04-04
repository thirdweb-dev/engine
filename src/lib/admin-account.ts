import { encryptedJsonToAccount } from "./accounts/local.js";
import { config } from "./config.js";

export const adminAccount = encryptedJsonToAccount({
  json: config.authEoaEncryptedJson,
})._unsafeUnwrap();
