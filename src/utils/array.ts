export const dedupeArray = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};
