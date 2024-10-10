import { execSync } from "node:child_process";
import fs from "node:fs";
import { kill } from "node:process";

// Requires Engine to be running locally
const ENGINE_OPENAPI_URL = "https://demo.web3api.thirdweb.com/json";

async function main() {
  try {
    const response = await fetch(ENGINE_OPENAPI_URL);
    const jsonData = await response.json();

    // Save the JSON response to a file
    fs.writeFileSync(
      "openapi.json",
      JSON.stringify(jsonData, null, 2),
      "utf-8",
    );

    execSync(
      "yarn openapi --input ./openapi.json --output ./sdk/src --name Engine",
    );

    const code = fs
      .readFileSync("./sdk/src/Engine.ts", "utf-8")
      .replace("export class Engine", "class EngineLogic")
      .concat(`
export class Engine extends EngineLogic {
  constructor(config: { url: string; accessToken: string; }) {
    super({ BASE: config.url, TOKEN: config.accessToken });
  }
}
`);
    fs.writeFileSync("./sdk/src/Engine.ts", code);
  } catch (error) {
    console.error("Error:", error);
    kill(process.pid, "SIGINT");
  }
}

main();
