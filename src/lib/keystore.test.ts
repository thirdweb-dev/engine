import { describe, expect, test } from "bun:test";
import { generateKeystore, decryptKeystore } from "./keystore.js";
import { privateKeyToAccount } from "thirdweb/wallets";

describe("keystore", () => {
  const testKeystore = {
    data: '{"address":"7d67388109f26f768b6ec84cf1bae78ffd2740c9","id":"197973e0-d42e-4316-a3e7-a71b03471caa","version":3,"crypto":{"cipher":"aes-128-ctr","cipherparams":{"iv":"392e0a4f1ef5d3a4df3417bc4d1187b1"},"ciphertext":"b189e4c3d4fdcac11e56c68b5e1fb6abfca34aa01063cf2209d2879abc96c7e5","kdf":"scrypt","kdfparams":{"salt":"182b95da1188ea6d1f32f44e808a35a3ed8599c2fee755fda0195aeeeb2ef1f3","n":131072,"dklen":32,"p":1,"r":8},"mac":"78624250436e61013d98ebdcdb61e5e97bf020151b96cd526f92068ab5886791"}}',
    address: "0x7d67388109F26f768B6EC84Cf1bae78ffd2740C9",
  };

  const password = "hellohello";

  test("should decrypt existing keystore correctly", () => {
    const decrypted = decryptKeystore(testKeystore.data, password);
    // @ts-expect-error we don't need a client
    const account = privateKeyToAccount({ privateKey: decrypted, client: {} });
    expect(account.address.toLowerCase()).toBe(
      testKeystore.address.toLowerCase(),
    );
  });

  test("should encrypt and decrypt correctly", () => {
    const testPk =
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const encrypted = generateKeystore(testPk, password);
    const decrypted = decryptKeystore(encrypted, password);
    expect(decrypted).toBe(testPk);
  });

  test("should fail with wrong password", () => {
    expect(() => {
      decryptKeystore(testKeystore.data, "wrongpassword");
    }).toThrow("Invalid password");
  });
});
