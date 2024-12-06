/**
 * Returns the milliseconds since a given past date.
 * Returns 0 if the date is in the future.
 * @param from A past date
 * @returns number Milliseconds since the `from` date.
 */
export const msSince = (from: Date) => {
  const ms = Date.now() - from.getTime();
  return Math.max(ms, 0);
};
