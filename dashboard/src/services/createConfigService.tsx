import { TabInput } from "../types";

const BASE_URL = process.env.OPENAPI_BASE_ORIGIN || "http://localhost:3005";

export async function createConfig(
  tabName: string,
  configData: TabInput["awsKms"] | TabInput["gcpKms"] | TabInput["local"],
  secretKey: string,
) {
  try {
    // Fetch data from API
    const url = `${BASE_URL}/config/create`;
    const configType = tabName.split("-")[0];

    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({ [configType]: { ...configData } }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.result;
  } catch (error) {
    throw error;
  }
}
