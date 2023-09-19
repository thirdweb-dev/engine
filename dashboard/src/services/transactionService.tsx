const BASE_URL = "http://localhost:3005"; //process.env.OPENAPI_BASE_ORIGIN;
const THIRDWEB_API_SECRET_KEY =
  "klRsqmatrdlEpik_pHKgYy_q2YzGe3bTewO1VC26eY_H184Kc7xOVqKVj0mHwOOW2AOx2N-a3GqLCQ7Z9s9-sw"; //process.env.THIRDWEB_API_SECRET_KEY;

export async function fetchTransactionData(page = 1, limit = 5) {
  try {
    // Fetch data from API
    const url = `${BASE_URL}/transaction/getAll?page=${page}&limit=${limit}&sort=createdTimestamp&sort_order=asc&filter=all`;
    console.log("Fetching data from:", url);

    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${THIRDWEB_API_SECRET_KEY}`,
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
