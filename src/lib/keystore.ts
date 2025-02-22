import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  scryptSync,
  timingSafeEqual,
  randomUUID,
} from "node:crypto";
import { keccak256 } from "ox/Hash";
import { Hex } from "ox";

interface Keystore {
  version: 3;
  id: string;
  crypto: {
    cipher: string;
    ciphertext: string;
    cipherparams: {
      iv: string;
    };
    kdf: string;
    kdfparams: {
      dklen: number;
      n: number;
      r: number;
      p: number;
      salt: string;
    };
    mac: string;
  };
}

function normalizeHexString(hex: string): Buffer {
  // Remove 0x prefix if present
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  // Validate hex string
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error("Invalid private key format: must be 32 bytes hex string");
  }
  return Buffer.from(normalized, "hex");
}

function ensureBuffer(
  value: Buffer | string,
  encoding: BufferEncoding = "hex"
): Buffer {
  if (Buffer.isBuffer(value)) return value;
  return Buffer.from(value, encoding);
}

function generateKeystore(privateKey: string, password: string): Keystore {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }

  const pkBuffer = normalizeHexString(privateKey);
  const passwordBytes = Buffer.from(password, "utf8");

  // Generate random values
  const salt = randomBytes(32);
  const iv = randomBytes(16);

  // KDF params
  const n = 8192;
  const r = 8;
  const p = 1;
  const dklen = 32;

  try {
    // Derive key using scrypt
    const derivedKey = scryptSync(passwordBytes, salt, dklen, { N: n, r, p });

    // Encrypt private key
    const cipher = createCipheriv("aes-128-ctr", derivedKey.slice(0, 16), iv);
    const ciphertext = Buffer.concat([cipher.update(pkBuffer), cipher.final()]);

    // Generate MAC
    const mac = Buffer.concat([derivedKey.slice(16, 32), ciphertext]);
    const macHash = keccak256(mac);
    const macHashInHexWithoutPrefix = Hex.from(macHash).toString().slice(2);
    // Create keystore object with proper hex encoding
    const keystore: Keystore = {
      version: 3,
      id: randomUUID().toString(),
      crypto: {
        cipher: "aes-128-ctr",
        ciphertext: ciphertext.toString("hex"),
        cipherparams: {
          iv: iv.toString("hex"),
        },
        kdf: "scrypt",
        kdfparams: {
          dklen,
          n,
          r,
          p,
          salt: salt.toString("hex"),
        },
        mac: macHashInHexWithoutPrefix,
      },
    };

    return keystore;
  } finally {
    // Zero out sensitive data
    pkBuffer.fill(0);
    passwordBytes.fill(0);
  }
}

function decryptKeystore(
  keystoreData: string | Keystore,
  password: string
): string {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }

  const keystore: Keystore =
    typeof keystoreData === "string" ? JSON.parse(keystoreData) : keystoreData;

  const passwordBytes = Buffer.from(password, "utf8");

  try {
    const { crypto } = keystore;
    const { ciphertext, cipherparams, kdfparams, mac } = crypto;

    // Convert hex strings to buffers
    const saltBuffer = ensureBuffer(kdfparams.salt);
    const ivBuffer = ensureBuffer(cipherparams.iv);
    const ciphertextBuffer = ensureBuffer(ciphertext);
    const macBuffer = ensureBuffer(mac);

    // Derive key
    const derivedKey = scryptSync(passwordBytes, saltBuffer, kdfparams.dklen, {
      N: kdfparams.n,
      r: kdfparams.r,
      p: kdfparams.p,
      maxmem: 256 * 1024 * 1024,
    });

    // Verify MAC (constant-time comparison)
    const computedMac = Buffer.concat([
      derivedKey.slice(16, 32),
      ciphertextBuffer,
    ]);

    const computedMacHash = keccak256(computedMac);

    if (!timingSafeEqual(computedMacHash, macBuffer)) {
      throw new Error("Invalid password");
    }

    // Decrypt
    const decipher = createDecipheriv(
      "aes-128-ctr",
      derivedKey.slice(0, 16),
      ivBuffer
    );

    const privateKey = Buffer.concat([
      decipher.update(ciphertextBuffer),
      decipher.final(),
    ]);

    // Return with 0x prefix
    return `0x${privateKey.toString("hex")}`;
  } finally {
    // Zero out sensitive data
    passwordBytes.fill(0);
  }
}

export { generateKeystore, decryptKeystore, type Keystore };
