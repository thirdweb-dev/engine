import { Address } from "thirdweb";
import { checksumAddress } from "thirdweb/utils";

export const maybeBigInt = (val?: string) => (val ? BigInt(val) : undefined);

// These overloads hint TS at the response type (ex: Address if `val` is Address).
export function normalizeAddress(val: Address): Address;
export function normalizeAddress(val?: Address): Address | undefined;
export function normalizeAddress(val: string): Address;
export function normalizeAddress(val?: string): Address | undefined;
export function normalizeAddress(val: string | null): Address | undefined;
export function normalizeAddress(
  val?: string | Address | null,
): Address | undefined {
  return val ? (val.toLowerCase() as Address) : undefined;
}

export function getChecksumAddress(val: Address): Address;
export function getChecksumAddress(val?: Address): Address | undefined;
export function getChecksumAddress(val: string): Address;
export function getChecksumAddress(val?: string): Address | undefined;
export function getChecksumAddress(val: string | null): Address | undefined;
export function getChecksumAddress(
  val?: string | Address | null,
): Address | undefined {
  return val ? checksumAddress(val) : undefined;
}

export function maybeDate(val: number): Date;
export function maybeDate(val?: number): Date | undefined;
export function maybeDate(val?: number): Date | undefined {
  return val ? new Date(val) : undefined;
}
