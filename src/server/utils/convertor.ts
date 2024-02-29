import { BigNumber } from "ethers";

export const bigNumberReplacer = (value: any): string => {
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
  return value;
};

export const convertBigIntToString = (obj: any): any => {
  for (let key in obj) {
    if (typeof obj[key] === "bigint") {
      obj[key] = obj[key].toString();
    }
    if (typeof obj[key] === "object") {
      convertBigIntToString(obj[key]);
    }
  }
  return obj;
};
