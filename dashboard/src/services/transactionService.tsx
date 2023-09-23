const BASE_URL = process.env.OPENAPI_BASE_ORIGIN || "http://localhost:3005";

export async function fetchTransactionData(
  secretKey: string,
  page = 1,
  limit = 5,
) {
  try {
    // Fetch data from API
    const url = `${BASE_URL}/transaction/getAll?page=${page}&limit=${limit}&sort=createdTimestamp&sort_order=asc&filter=all`;
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("An error occurred:", error);
  }
}
