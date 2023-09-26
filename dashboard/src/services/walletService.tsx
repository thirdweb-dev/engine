const BASE_URL = process.env.OPENAPI_BASE_ORIGIN || "http://localhost:3005";

export async function fetchWalletData(secretKey: string) {
  try {
    const url = `${BASE_URL}/wallet/get-all`;
    const response = await fetch(url, {
      method: "GET",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
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
