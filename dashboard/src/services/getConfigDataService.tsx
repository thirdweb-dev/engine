const BASE_URL = process.env.OPENAPI_BASE_ORIGIN || "http://localhost:3005";
const THIRDWEB_API_SECRET_KEY = process.env.REACT_APP_THIRDWEB_API_SECRET_KEY;

export async function getConfigData() {
  try {
    // Fetch data from API
    const url = `${BASE_URL}/config/get-all`;
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
    return data.result.data;
  } catch (error) {
    console.error("An error occurred:", error);
  }
}
