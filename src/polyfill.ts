import * as crypto from "node:crypto";

if (typeof globalThis.crypto === "undefined") {
  (globalThis as any).crypto = crypto;
}
