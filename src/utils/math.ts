export const getPercentile = (arr: number[], percentile: number): number => {
  if (arr.length === 0) {
    return 0;
  }

  arr.sort((a, b) => a - b);
  const index = Math.floor((percentile / 100) * (arr.length - 1));
  return arr[index];
};
