import { createSWRCache } from "../cache/swr";

const Services = [
  "contracts",
  "connect-sdk",
  "engine",
  "account-abstraction",
  "pay",
  "rpc-edge",
  "chainsaw",
  "insight",
] as const;

export type Service = (typeof Services)[number];

export type ChainCapabilities = Array<{
  service: Service;
  enabled: boolean;
}>;

// Create cache with 2048 entries and 5 minute TTL
const chainCapabilitiesCache = createSWRCache<number, ChainCapabilities>({
  maxEntries: 2048,
  ttlMs: 1000 * 60 * 30, // 30 minutes
});

/**
 * Get the capabilities of a chain (cached with stale-while-revalidate)
 */
export async function getChainCapabilities(
  chainId: number,
): Promise<ChainCapabilities> {
  return chainCapabilitiesCache.get(chainId, async () => {
    const response = await fetch(
      `https://api.thirdweb.com/v1/chains/${chainId}/services`,
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data.data.services as ChainCapabilities;
  });
}

/**
 * Check if a chain supports a given service
 */
export async function doesChainSupportService(
  chainId: number,
  service: Service,
): Promise<boolean> {
  const chainCapabilities = await getChainCapabilities(chainId);

  return chainCapabilities.some(
    (capability) => capability.service === service && capability.enabled,
  );
}
