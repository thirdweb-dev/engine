import crypto from "crypto";
import * as scrypt from "scrypt-js";
import { keccak256, toBytes, type Hex } from "thirdweb";
import { privateKeyToAddress } from "viem/accounts";

export function ensureHexPrefix(value: string): Hex {
  return value.startsWith("0x") ? (value as Hex) : (`0x${value}` as Hex);
}

interface EncryptedKeystore {
  address: string;
  crypto: {
    cipher: string;
    cipherparams: {
      iv: string;
    };
    ciphertext: string;
    kdf: string;
    kdfparams: {
      salt: string;
      n: number;
      dklen: number;
      p: number;
      r: number;
    };
    mac: string;
  };
  id: string;
  version: number;
}

export async function toEncryptedJson({
  password,
  privateKey,
}: { privateKey: string; password: string }): Promise<string> {
  const salt = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);
  const uuid = crypto.randomBytes(16);
  const N = 1 << 14;

  const derivedKey = await scrypt.scrypt(toBytes(password), salt, N, 8, 1, 32);

  const encryptionKey = derivedKey.slice(0, 16);
  const macPrefix = derivedKey.slice(16, 32);

  const cipher = crypto.createCipheriv("aes-128-ctr", encryptionKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(toBytes(ensureHexPrefix(privateKey))),
    cipher.final(),
  ]);

  const concatArray = new Uint8Array(macPrefix.length + ciphertext.length);
  concatArray.set(macPrefix);
  concatArray.set(ciphertext, macPrefix.length);

  const computedMac = keccak256(concatArray).substring(2);

  const address = privateKeyToAddress(ensureHexPrefix(privateKey));
  console.log(address);

  const keystore: EncryptedKeystore = {
    address: address.slice(2),
    crypto: {
      cipher: "aes-128-ctr",
      cipherparams: {
        iv: iv.toString("hex"),
      },
      ciphertext: ciphertext.toString("hex"),
      kdf: "scrypt",
      kdfparams: {
        salt: salt.toString("hex"),
        n: N,
        dklen: 32,
        p: 1,
        r: 8,
      },
      mac: computedMac,
    },
    id: uuid.toString("hex"),
    version: 3,
  };

  return JSON.stringify(keystore);
}

export async function decryptJsonWallet({
  password,
  encryptedJson,
}: { password: string; encryptedJson: string }): Promise<{
  privateKey: string;
  address: string;
}> {
  console.log(encryptedJson);
  const keystore: EncryptedKeystore = JSON.parse(encryptedJson);

  const salt = keystore.crypto.kdfparams.salt;
  const iv = toBytes(ensureHexPrefix(keystore.crypto.cipherparams.iv));
  const ciphertext = toBytes(ensureHexPrefix(keystore.crypto.ciphertext));

  const derivedKey = await scrypt.scrypt(
    toBytes(password),
    toBytes(ensureHexPrefix(salt)),
    keystore.crypto.kdfparams.n,
    keystore.crypto.kdfparams.r,
    keystore.crypto.kdfparams.p,
    keystore.crypto.kdfparams.dklen,
  );

  const macPrefix = derivedKey.slice(16, 32);

  const concatArray = new Uint8Array(macPrefix.length + ciphertext.length);
  concatArray.set(macPrefix);
  concatArray.set(ciphertext, macPrefix.length);

  const computedMac = keccak256(concatArray).substring(2);

  if (computedMac !== keystore.crypto.mac.toLowerCase()) {
    throw new Error("invalid password");
  }

  const decipher = crypto.createDecipheriv(
    keystore.crypto.cipher,
    derivedKey.slice(0, 16),
    iv,
  );

  const privateKey = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  const address = privateKeyToAddress(`0x${privateKey.toString("hex")}`);

  return {
    privateKey: privateKey.toString("hex"),
    address: address,
  };
}
