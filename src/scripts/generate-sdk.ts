import { execSync } from "child_process";
import dotenv from "dotenv";
import fs from "fs";
import { kill } from "process";

dotenv.config();

const ENGINE_OPENAPI_URL = process.env.ENGINE_OPENAPI_URL;

async function main() {
  try {
    console.log("ENGINE_OPENAPI_URL:", ENGINE_OPENAPI_URL);
    if (!ENGINE_OPENAPI_URL) {
      throw new Error("ENGINE_OPENAPI_URL is not defined");
    }
    const response = await fetch(ENGINE_OPENAPI_URL);
    const jsonData = await response.json();

    // Save the JSON response to a file
    fs.writeFileSync(
      "./dist/openapi.json",
      JSON.stringify(jsonData, null, 2),
      "utf-8",
    );

    execSync(
      "yarn openapi --input ./dist/openapi.json --output ./sdk/src --name Engine",
    );

    const code = fs
      .readFileSync("./sdk/src/Engine.ts", "utf-8")
      .replace(`export class Engine`, `class EngineLogic`).concat(`
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
