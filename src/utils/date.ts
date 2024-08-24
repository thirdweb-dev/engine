/**
 * Returns the milliseconds since a given past date.
 * Returns 0 if the date is in the future.
 * @param from A past date
 * @returns number Milliseconds since the `from` date.
 */
export const msSince = (from: Date) => {
  const ms = new Date().getTime() - from.getTime();
  return Math.max(ms, 0);
};

export const timeFromNow = (
  args:
    | { seconds: number }
    | { minutes: number }
    | { hours: number }
    | { days: number },
): Date => {
  const now = new Date();

  if ("seconds" in args) {
    return new Date(now.getTime() + args.seconds * 1000);
  }
  if ("minutes" in args) {
    return new Date(now.getTime() + args.minutes * 60 * 1000);
  }
  if ("hours" in args) {
    return new Date(now.getTime() + args.hours * 60 * 60 * 1000);
  }
  if ("days" in args) {
    return new Date(now.getTime() + args.days * 24 * 60 * 60 * 1000);
  }

  throw new Error(
    "Invalid arguments: at least one time unit must be provided.",
  );
};
