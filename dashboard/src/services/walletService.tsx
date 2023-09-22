const BASE_URL = process.env.OPENAPI_BASE_ORIGIN || "http://localhost:3005";
const THIRDWEB_API_SECRET_KEY = process.env.REACT_APP_THIRDWEB_API_SECRET_KEY;

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
