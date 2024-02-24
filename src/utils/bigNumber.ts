import type { BigNumber } from "ethers";

export const maxBN = (a: BigNumber, b: BigNumber) => (a.gt(b) ? a : b);
export const minBN = (a: BigNumber, b: BigNumber) => (a.lt(b) ? a : b);
