export const getPercentile = (arr: number[], percentile: number): number => {
  if (arr.length === 0) {
    return 0;
  }

  arr.sort((a, b) => a - b);
  const index = Math.floor((percentile / 100) * (arr.length - 1));

  const result = arr[index];
  if (result === undefined) {
    throw new Error("Percentile out of range");
  }
  return result;
};

export const BigIntMath = {
  min: (a: bigint, b: bigint) => (a < b ? a : b),
  max: (a: bigint, b: bigint) => (a > b ? a : b),
};
