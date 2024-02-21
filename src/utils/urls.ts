const URLS_LIST_FOR_NO_AUTH = [
  "/",
  "/favicon.ico",
  "/",
  "/system/health",
  "/static",
  "/json",
];

export const reportUsageForUrl = (url: string) => {
  if (URLS_LIST_FOR_NO_AUTH.includes(url.trim())) {
    return false;
  }

  return true;
};

export const checkIfAllowed = (url: string) => {
  if (URLS_LIST_FOR_NO_AUTH.includes(url.trim())) {
    return true;
  }

  return false;
};
