interface FetchApiParams {
  host: string;
  apiKey: string;
  path: string;
  method: string;
  body: string;
  walletAddress: string;
  accountAddress?: string;
}

export const fetchApi = async ({
  host,
  apiKey,
  path,
  method,
  body,
  walletAddress,
  accountAddress,
}: FetchApiParams) => {
  const res = await fetch(`${host}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-backend-wallet-address": walletAddress,
      Authorization: `Bearer ${apiKey}`,
      ...(accountAddress ? { "x-account-address": accountAddress } : {}),
    },
    body,
  });

  return res.json();
};
