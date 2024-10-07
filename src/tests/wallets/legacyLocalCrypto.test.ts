import { describe, expect, it } from "vitest";
import {
  decryptJsonWallet,
  toEncryptedJson,
} from "../../server/utils/wallets/legacyLocalCrypto";

// Example encrypted wallets and their expected decrypted values
const testCases = [
  {
    encryptedWallet: JSON.stringify({
      address: "f39fd6e51aad88f6f4ce6ab8827279cfffb92266",
      id: "be88e6c1-de95-4257-bbdb-190e4c65a983",
      version: 3,
      crypto: {
        cipher: "aes-128-ctr",
        cipherparams: { iv: "6b630c68780c1b210ca96d879d939d60" },
        ciphertext:
          "120b5f8d50fb48cba05a72af71516c127b0d5d1c272cca0a34d76ff752b51408",
        kdf: "scrypt",
        kdfparams: {
          salt: "5a9fec91a5673db21fc298f1b6cbf2a8127a308b9d2252373b859f30b2d17778",
          n: 1,
          dklen: 32,
          p: 1,
          r: 8,
        },
        mac: "6ff27b3be5370b5bcb993d8dc981c54220f662270856972bc77472ed6e43c69e",
      },
    }),
    password: "hellohello",
    expectedPrivateKey:
      "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    expectedAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },
  // TODO: Add more test cases here
];

describe("Wallet Encryption/Decryption", () => {
  testCases.forEach((testCase, index) => {
    describe(`Test Case ${index + 1}`, () => {
      it("should correctly decrypt the wallet", async () => {
        const decrypted = await decryptJsonWallet({
          password: testCase.password,
          encryptedJson: testCase.encryptedWallet,
        });
        expect(decrypted.address.toLowerCase()).toBe(
          testCase.expectedAddress.toLowerCase(),
        );
        expect(decrypted.privateKey.toLowerCase()).toBe(
          testCase.expectedPrivateKey.toLowerCase(),
        );
      });

      it("should correctly re-encrypt and decrypt the wallet", async () => {
        const decrypted = await decryptJsonWallet({
          encryptedJson: testCase.encryptedWallet,
          password: testCase.password,
        });
        const reEncrypted = await toEncryptedJson({
          privateKey: decrypted.privateKey,
          password: testCase.password,
        });
        const reDecrypted = await decryptJsonWallet({
          encryptedJson: reEncrypted,
          password: testCase.password,
        });

        expect(reDecrypted.address.toLowerCase()).toBe(
          testCase.expectedAddress.toLowerCase(),
        );
        expect(reDecrypted.privateKey.toLowerCase()).toBe(
          testCase.expectedPrivateKey.toLowerCase(),
        );
      });

      it("should match the snapshot for re-encrypted wallet", async () => {
        const decrypted = await decryptJsonWallet({
          encryptedJson: testCase.encryptedWallet,
          password: testCase.password,
        });
        const reEncrypted = await toEncryptedJson({
          privateKey: decrypted.privateKey,
          password: testCase.password,
        });

        // Parse the re-encrypted wallet to ensure consistent formatting
        const reEncryptedParsed = JSON.parse(reEncrypted);

        // We only snapshot some fields because others (like id, iv, salt) will change on each encryption
        expect({
          address: reEncryptedParsed.address,
          version: reEncryptedParsed.version,
          crypto: {
            cipher: reEncryptedParsed.crypto.cipher,
            kdf: reEncryptedParsed.crypto.kdf,
            kdfparams: {
              dklen: reEncryptedParsed.crypto.kdfparams.dklen,
              p: reEncryptedParsed.crypto.kdfparams.p,
              r: reEncryptedParsed.crypto.kdfparams.r,
            },
          },
        }).toMatchSnapshot();
      });
    });
  });
});
