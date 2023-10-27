import { execSync, spawn } from "child_process";
import fs from "fs";

async function main() {
  const child = spawn("yarn", ["dev:server"], { detached: true });
  if (!child.pid) return;

  await new Promise((resolve) => setTimeout(resolve, 10000));
  process.kill(-child.pid);

  execSync(
    "yarn openapi --input ./dist/openapi.json --output ./src/sdk/generated --name Engine",
  );

  const code = fs
    .readFileSync("./src/sdk/generated/Engine.ts", "utf-8")
    .replace(`export class Engine`, `class EngineLogic`).concat(`
export class Engine extends EngineLogic {
  constructor(config: { url: string; accessToken: string; }) {
    super({ BASE: config.url, TOKEN: config.accessToken });
  }
}
`);
  fs.writeFileSync("./src/sdk/generated/Engine.ts", code);
}

main();
