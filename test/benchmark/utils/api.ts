interface FetchApiParams {
  host: string;
  apiKey: string;
  path: string;
  method: string;
  body: string;
}

export const fetchApi = async ({
  host,
  apiKey,
  path,
  method,
  body,
}: FetchApiParams) => {
  const res = await fetch(`${host}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  });

  return res.json();
};
