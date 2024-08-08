import { Address } from "thirdweb";

export const maybeBigInt = (val?: string) => (val ? BigInt(val) : undefined);

// These overloads hint TS at the response type (ex: Address if `val` is Address).
export function normalizeAddress(val: Address): Address;
export function normalizeAddress(val?: Address): Address | undefined;
export function normalizeAddress(val: string): Address;
export function normalizeAddress(val?: string): Address | undefined;
export function normalizeAddress(val: string | null): undefined;
export function normalizeAddress(
  val?: string | Address | null,
): Address | undefined {
  return val ? (val.toLowerCase() as Address) : undefined;
}

export function maybeDate(val: number): Date;
export function maybeDate(val?: number): Date | undefined;
export function maybeDate(val?: number): Date | undefined {
  return val ? new Date(val) : undefined;
}
