import { Address } from "thirdweb";

export const maybeBigInt = (val?: string) => (val ? BigInt(val) : undefined);

// These overloads hint TS at the response type (ex: Address if `val` is Address).
export function normalizeAddress(val: Address): Address;
export function normalizeAddress(val: Address | undefined): Address | undefined;
export function normalizeAddress(val: string): Address;
export function normalizeAddress(val: string | undefined): Address | undefined;
export function normalizeAddress(val?: string | Address): Address | undefined {
  return val ? (val.toLowerCase() as Address) : undefined;
}
