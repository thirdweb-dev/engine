import * as crypto from "crypto";

if (typeof globalThis.crypto === "undefined") {
  (globalThis as any).crypto = crypto;
}
