import { getIndexedContractsUniqueChainIds } from "../../db/indexedContracts/getIndexedContract";
import {
  INDEXER_REGISTRY,
  addChainIndexer,
  removeChainIndexer,
} from "../indexers/chainIndexerRegistry";

export const manageChainIndexers = async () => {
  const chainIds = await getIndexedContractsUniqueChainIds();

  for (const chainId of chainIds) {
    if (!(chainId in INDEXER_REGISTRY)) {
      await addChainIndexer(chainId);
    }
  }

  for (const chainId in INDEXER_REGISTRY) {
    const chainIdNum = parseInt(chainId);
    if (!chainIds.includes(chainIdNum)) {
      await removeChainIndexer(chainIdNum);
    }
  }
};
