import * as crypto from "node:crypto";

if (typeof globalThis.crypto === "undefined") {
  // @ts-expect-error
  globalThis.crypto = crypto;
}
