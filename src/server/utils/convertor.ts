import { BigNumber } from "ethers";

const isHexBigNumber = (value: unknown) => {
  const isNonNullObject = typeof value === "object" && value !== null;
  const hasType = isNonNullObject && "type" in value;
  return hasType && value.type === "BigNumber" && "hex" in value;
};
export const bigNumberReplacer = (value: unknown): unknown => {
  // if we find a BigNumber then make it into a string (since that is safe)
  if (BigNumber.isBigNumber(value) || isHexBigNumber(value)) {
    return BigNumber.from(value).toString();
  }

  if (Array.isArray(value)) {
    return value.map(bigNumberReplacer);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  return value;
};
