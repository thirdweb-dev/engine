export const isLocalhost = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  } catch (err) {
    return false;
  }
};
