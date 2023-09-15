interface FetchApiParams {
  host: string;
  apiKey: string;
  path: string;
  method: string;
  body: string;
  walletAddress: string;
}

export const fetchApi = async ({
  host,
  apiKey,
  path,
  method,
  body,
  walletAddress,
}: FetchApiParams) => {
  const res = await fetch(`${host}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Wallet-Address": walletAddress,
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  });

  return res.json();
};
