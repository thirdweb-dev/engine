import * as crypto from "node:crypto";

// DEBUG: do we need this?
if (typeof globalThis.crypto === "undefined") {
  (globalThis as any).crypto = crypto;
}
