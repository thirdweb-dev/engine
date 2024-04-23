export const isLocalhost = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch (err) {
    return false;
  }
};

/**
 * Parses an array string that comes in from a query param.
 * Handles a single string, comma-separated string, or array of strings.
 * @param raw string | string[] | undefined
 * @returns string[]
 */
export const parseArrayString = (raw?: string | string[]): string[] => {
  if (!raw) return [];

  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.flatMap((str) => str.split(",")).map((str) => str.trim());
};
