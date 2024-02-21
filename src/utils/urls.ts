const URLS_LIST_FOR_NO_AUTH = new Set([
  "/",
  "/favicon.ico",
  "/",
  "/system/health",
  "/static",
  "/json",
]);

export const reportUsageForUrl = (url: string) =>
  !URLS_LIST_FOR_NO_AUTH.has(url);

export const checkIfAllowed = (url: string) => URLS_LIST_FOR_NO_AUTH.has(url);
