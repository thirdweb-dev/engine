import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { kill } from "node:process";

const ENGINE_OPENAPI_URL = "https://demo.web3api.thirdweb.com/json";
const REPLACE_LOG_FILE = "sdk/replacement_log.txt";

type BasicOpenAPISpec = {
  paths?: {
    [path: string]: {
      [method: string]: {
        operationId?: string;
      };
    };
  };
};

function generateOperationIdMappings(
  oldSpec: BasicOpenAPISpec,
  newSpec: BasicOpenAPISpec,
): Record<string, string> {
  const mappings: Record<string, string> = {};

  if (newSpec.paths && oldSpec.paths) {
    for (const [path, pathItem] of Object.entries(newSpec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        const oldOperation = oldSpec.paths[path]?.[method];
        if (
          operation.operationId &&
          oldOperation?.operationId &&
          operation.operationId !== oldOperation.operationId
        ) {
          mappings[operation.operationId] = oldOperation.operationId;
        }
      }
    }
  }

  console.log("Operation ID mappings:", mappings);
  return mappings;
}

function applyOperationIdMappings(
  originalCode: string,
  fileName: string,
  mappings: Record<string, string>,
): string {
  const replacementLog: string[] = [];
  let newCode: string = originalCode;

  for (const [newId, oldId] of Object.entries(mappings)) {
    const regex: RegExp = new RegExp(`public\\s+${newId}\\(`, "g");
    const methods = newCode.match(regex);

    if (methods) {
      for (const method of methods) {
        const newMethod = `public ${oldId}(`;
        if (newMethod !== method) {
          newCode = newCode.replace(method, newMethod);
          replacementLog.push(
            `In ${fileName}: Replaced "${method}" with "${newMethod}"`,
          );
        }
      }
    }
  }

  fs.appendFileSync(REPLACE_LOG_FILE, `${replacementLog.join("\n")}\n`);
  return newCode;
}

function processErcServices(
  originalCode: string,
  tag: string,
  fileName: string,
): string {
  const replacementLog: string[] = [];
  let newCode: string = originalCode;

  const regex: RegExp = new RegExp(`public\\s+${tag}(\\w+)\\(`, "g");
  const methods = newCode.match(regex);

  if (methods) {
    for (const method of methods) {
      const newMethod = method.replace(
        regex,
        (_, p1) => `public ${p1.charAt(0).toLowerCase() + p1.slice(1)}(`,
      );
      if (newMethod !== method) {
        newCode = newCode.replace(method, newMethod);
        replacementLog.push(
          `In ${fileName}: Replaced "${method}" with "${newMethod}"`,
        );
      }
    }
  }

  fs.appendFileSync(REPLACE_LOG_FILE, `${replacementLog.join("\n")}\n`);
  return newCode;
}

async function main(): Promise<void> {
  try {
    fs.writeFileSync(REPLACE_LOG_FILE, "");

    const oldSpec = JSON.parse(
      fs.readFileSync("sdk/old_openapi.json", "utf-8"),
    );

    const response: Response = await fetch(ENGINE_OPENAPI_URL);
    const newSpec: unknown = await response.json();

    fs.writeFileSync("openapi.json", JSON.stringify(newSpec, null, 2), "utf-8");

    const operationIdMappings = generateOperationIdMappings(
      oldSpec,
      newSpec as BasicOpenAPISpec,
    );

    execSync(
      "yarn openapi --input ./openapi.json --output ./sdk/src --name Engine",
    );

    const engineCode: string = fs
      .readFileSync("./sdk/src/Engine.ts", "utf-8")
      .replace("export class Engine", "class EngineLogic");

    const newEngineCode: string = `${engineCode}
export class Engine extends EngineLogic {
  constructor(config: { url: string; accessToken: string; }) {
    super({ BASE: config.url, TOKEN: config.accessToken });
  }
}
`;
    fs.writeFileSync("./sdk/src/Engine.ts", newEngineCode);

    const servicesDir: string = "./sdk/src/services";
    const serviceFiles: string[] = fs.readdirSync(servicesDir);

    const ercServices: string[] = ["erc20", "erc721", "erc1155"];

    for (const tag of ercServices) {
      const fileName = `${tag.charAt(0).toUpperCase() + tag.slice(1)}Service.ts`;
      const filePath = path.join(servicesDir, fileName);
      const originalCode = fs.readFileSync(filePath, "utf-8");

      const newCode = processErcServices(originalCode, tag, fileName);

      fs.writeFileSync(filePath, newCode);
    }

    for (const file of serviceFiles) {
      if (
        file.endsWith(".ts") &&
        !ercServices.includes(file.toLowerCase().replace("service.ts", ""))
      ) {
        const filePath: string = path.join(servicesDir, file);
        const originalCode: string = fs.readFileSync(filePath, "utf-8");

        const newCode = applyOperationIdMappings(
          originalCode,
          file,
          operationIdMappings,
        );

        fs.writeFileSync(filePath, newCode);
      }
    }

    console.log("Replacements have been logged to sdk/replacement_log.txt");
  } catch (error) {
    console.error("Error:", error);
    kill(process.pid, "SIGINT");
  }
}

main();
