const BASE_URL = process.env.OPENAPI_BASE_ORIGIN || "http://localhost:3005";
export async function getConfigData(secretKey: string) {
  try {
    // Fetch data from API
    const url = `${BASE_URL}/config/get-all`;
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
    return data.result.data;
  } catch (error) {
    console.error("An error occurred:", error);
  }
}
