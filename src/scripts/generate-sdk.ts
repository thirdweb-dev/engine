import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { kill } from "node:process";

// requires engine to be running locally
const ENGINE_OPENAPI_URL = "http://localhost:3005/json";

const OPERATION_ID_MAPPINGS = {
  createWebhook: "create",
  listWebhooks: "getAll",
  listTransactions: "getAll",
  createRelayer: "create",
  listRelayers: "getAll",
  revokeRelayer: "revoke",
  updateRelayer: "update",
  getContractEvents: "getEvents",
  getContractRole: "getRole",
  listContractRoles: "getAll",
  grantContractRole: "grant",
  revokeContractRole: "revoke",
  getAllDirectListings: "getAll",
  getAllValidDirectListings: "getAllValid",
  getDirectListing: "getListing",
  getDirectListingsTotalCount: "getTotalCount",
  isBuyerApprovedForDirectListings: "isBuyerApprovedForListing",
  isCurrencyApprovedForDirectListings: "isCurrencyApprovedForListing",
  buyFromDirectListing: "buyFromListing",
  cancelDirectListing: "cancelListing",
  createDirectListing: "createListing",
  updateDirectListing: "updateListing",
  getAllEnglishAuctions: "getAll",
  getAllValidEnglishAuctions: "getAllValid",
  getEnglishAuction: "getAuction",
  getEnglishAuctionsBidBufferBps: "getBidBufferBps",
  getEnglishAuctionsMinimumNextBid: "getMinimumNextBid",
  getEnglishAuctionsTotalCount: "getTotalCount",
  getEnglishAuctionsWinner: "getWinner",
  getEnglishAuctionsWinningBid: "getWinningBid",
  isEnglishAuctionsWinningBid: "isWinningBid",
  buyoutEnglishAuction: "buyoutAuction",
  cancelEnglishAuction: "cancelAuction",
  closeEnglishAuctionForBidder: "closeAuctionForBidder",
  closeEnglishAuctionForSeller: "closeAuctionForSeller",
  createEnglishAuction: "createAuction",
  executeEnglishAuctionSale: "executeSale",
  makeEnglishAuctionBid: "makeBid",
  getAllMarketplaceOffers: "getAll",
  getAllValidMarketplaceOffers: "getAllValid",
  getMarketplaceOffer: "getOffer",
  getMarketplaceOffersTotalCount: "getTotalCount",
  acceptMarketplaceOffer: "acceptOffer",
  cancelMarketplaceOffer: "cancelOffer",
  makeMarketplaceOffer: "makeOffer",
};

function applyOperationIdMappings(
  originalCode: string,
  fileName: string,
): string {
  const replacementLog: string[] = [];
  let newCode: string = originalCode;

  for (const [newId, oldId] of Object.entries(OPERATION_ID_MAPPINGS)) {
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

  fs.appendFileSync("replacement_log.txt", `${replacementLog.join("\n")}\n`);
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

  fs.appendFileSync("replacement_log.txt", `${replacementLog.join("\n")}\n`);
  return newCode;
}

async function main() {
  try {
    // Clear the log file
    fs.writeFileSync("replacement_log.txt", "");

    const response = await fetch(ENGINE_OPENAPI_URL);
    const jsonData = await response.json();

    fs.writeFileSync(
      "openapi.json",
      JSON.stringify(jsonData, null, 2),
      "utf-8",
    );

    execSync(
      "yarn openapi --input ./openapi.json --output ./sdk/src --name Engine",
    );

    const engineCode = fs
      .readFileSync("./sdk/src/Engine.ts", "utf-8")
      .replace("export class Engine", "class EngineLogic")
      .concat(`
export class Engine extends EngineLogic {
  constructor(config: { url: string; accessToken: string; }) {
    super({ BASE: config.url, TOKEN: config.accessToken });
  }
}
`);
    fs.writeFileSync("./sdk/src/Engine.ts", engineCode);

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

        const newCode = applyOperationIdMappings(originalCode, file);

        fs.writeFileSync(filePath, newCode);
      }
    }

    console.log("Replacements have been logged to replacement_log.txt");
  } catch (error) {
    console.error("Error:", error);
    kill(process.pid, "SIGINT");
  }
}

main();
