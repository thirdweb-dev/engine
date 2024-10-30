import { getContractSubscriptionsUniqueChainIds } from "../../db/contractSubscriptions/getContractSubscriptions";
import {
  INDEXER_REGISTRY,
  addChainIndexer,
  removeChainIndexer,
} from "../indexers/chainIndexerRegistry";

export const manageChainIndexers = async () => {
  const chainIdsToIndex = await getContractSubscriptionsUniqueChainIds();
  console.log("[DEBUG] chainIdsToIndex", chainIdsToIndex);

  for (const chainId of chainIdsToIndex) {
    if (!(chainId in INDEXER_REGISTRY)) {
      console.log("[DEBUG] Adding chain indexer");
      await addChainIndexer(chainId);
    }
  }

  for (const chainId in INDEXER_REGISTRY) {
    const chainIdNum = Number.parseInt(chainId);
    if (!chainIdsToIndex.includes(chainIdNum)) {
      console.log("[DEBUG] Removing chain indexer");
      await removeChainIndexer(chainIdNum);
    }
  }
};
