import { execSync } from "node:child_process";
import fs from "node:fs";
import { kill } from "node:process";

// requires engine to be running locally
const ENGINE_OPENAPI_URL = "http://localhost:3005/json";

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
      .replace("export class Engine", "class EngineLogic").concat(`
export class Engine extends EngineLogic {
  constructor(config: { url: string; accessToken: string; }) {
    super({ BASE: config.url, TOKEN: config.accessToken });
  }
}
`);
    fs.writeFileSync("./sdk/src/Engine.ts", code);

    const tagsToReplace = ['erc20', 'erc721', 'erc1155'];
    tagsToReplace.forEach((tag) => { 
      const fileName = `${tag.charAt(0).toUpperCase() + tag.slice(1)}Service.ts`;
      let code = fs.readFileSync(`./sdk/src/services/${fileName}`, "utf-8");
      // replace erc methods to avoid duplication with the tag
      // find all methods that start with 'ercX', remove 'ercX' from the name and lowercase the first letter
      const regex = new RegExp(`public\\s+${tag}(\\w+)\\(`, 'g');
      const methods = code.match(regex);
      methods?.forEach((method) => {
        const newMethod = method.replace(regex, (_, p1) => `public ${p1.charAt(0).toLowerCase() + p1.slice(1)}(`);
        code = code.replace(method, newMethod);
      });
      fs.writeFileSync(`./sdk/src/services/${fileName}`, code);
    });

  } catch (error) {
    console.error("Error:", error);
    kill(process.pid, "SIGINT");
  }
}

main();
