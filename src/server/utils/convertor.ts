import { BigNumber } from "ethers";

export const bigNumberReplacer = (value: any): any => {
  // if we find a BigNumber then make it into a string (since that is safe)
  if (
    BigNumber.isBigNumber(value) ||
    (typeof value === "object" &&
      value !== null &&
      value.type === "BigNumber" &&
      "hex" in value)
  ) {
    return BigNumber.from(value).toString();
  }

  if (Array.isArray(value)) {
    return value.map(bigNumberReplacer);
  }

  return value;
};
