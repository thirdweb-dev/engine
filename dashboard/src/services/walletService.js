const BASE_URL = "http://localhost:3005"; //process.env.OPENAPI_BASE_ORIGIN;
const THIRDWEB_API_SECRET_KEY =
  "klRsqmatrdlEpik_pHKgYy_q2YzGe3bTewO1VC26eY_H184Kc7xOVqKVj0mHwOOW2AOx2N-a3GqLCQ7Z9s9-sw"; //process.env.THIRDWEB_API_SECRET_KEY;

export async function fetchWalletData() {
  try {
    const url = `${BASE_URL}/wallet/getAll`;
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${THIRDWEB_API_SECRET_KEY}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Something went wrong");
    }

    return data.result;
  } catch (error) {
    console.error("An error occurred:", error);
    throw error;
  }
}
