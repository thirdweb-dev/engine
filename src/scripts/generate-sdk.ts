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

function applyOperationIdMappings(code: string): string {
  let newCode = code;

  for (const [newId, oldId] of Object.entries(OPERATION_ID_MAPPINGS)) {
    const regex = new RegExp(`public\\s+${newId}\\(`, "g");
    newCode = newCode.replace(regex, `public ${oldId}(`);
  }

  return code;
}

function processErcServices(code: string, tag: string): string {
  const regex = new RegExp(`public\\s+${tag}(\\w+)\\(`, "g");
  const methods = code.match(regex);

  if (!methods) {
    return code;
  }

  let newCode = code;

  for (const method of methods) {
    const newMethod = method.replace(
      regex,
      (_, p1) => `public ${p1.charAt(0).toLowerCase() + p1.slice(1)}(`,
    );
    newCode = newCode.replace(method, newMethod);
  }

  return code;
}

async function main() {
  try {
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

    const servicesDir = "./sdk/src/services";
    const serviceFiles = fs.readdirSync(servicesDir);

    const ercServices = [
      "Erc20Service.ts",
      "Erc721Service.ts",
      "Erc1155Service.ts",
    ];

    for (const file of serviceFiles) {
      if (file.endsWith(".ts")) {
        const filePath = path.join(servicesDir, file);
        let code = fs.readFileSync(filePath, "utf-8");

        if (ercServices.includes(file)) {
          const tag = file.toLowerCase().replace("service.ts", "");
          code = processErcServices(code, tag);
        } else {
          code = applyOperationIdMappings(code);
        }

        fs.writeFileSync(filePath, code);
      }
    }
  } catch (error) {
    console.error("Error:", error);
    kill(process.pid, "SIGINT");
  }
}

main();
