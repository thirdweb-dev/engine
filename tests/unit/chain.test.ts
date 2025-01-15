import {
  getChainByChainIdAsync,
  getChainBySlugAsync,
} from "@thirdweb-dev/chains";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getChainIdFromChain } from "../../src/server/utils/chain";
import { getConfig } from "../../src/shared/utils/cache/get-config";

// Mock the external dependencies
vi.mock("../utils/cache/getConfig");
vi.mock("@thirdweb-dev/chains");

const mockGetConfig = vi.mocked(getConfig);
const mockGetChainBySlugAsync = vi.mocked(getChainBySlugAsync);

describe("getChainIdFromChain", () => {
  beforeEach(() => {
    // Clear all mock calls before each test
    vi.clearAllMocks();
  });

  it("should return the chainId from chainOverrides if input is an id", async () => {
    // @ts-ignore
    mockGetConfig.mockResolvedValueOnce({
      chainOverridesParsed: [
        {
          id: 137,
          name: "Polygon",
          rpc: "https://test-rpc-url.com",
        },
      ],
    });

    const result = await getChainIdFromChain("137");

    expect(result).toBe(137);
    expect(getChainByChainIdAsync).not.toHaveBeenCalled();
    expect(getChainBySlugAsync).not.toHaveBeenCalled();
  });

  it("should return the chainId from getChainByChainIdAsync if input is a slug", async () => {
    // @ts-ignore
    mockGetChainBySlugAsync.mockResolvedValueOnce({
      name: "Polygon",
      chainId: 137,
      status: "active",
    });

    const result = await getChainIdFromChain("Polygon");

    expect(result).toBe(137);
  });

  it("should throw an error for an invalid chain", async () => {
    // @ts-ignore
    mockGetConfig.mockResolvedValueOnce({});

    await expect(getChainIdFromChain("not_a_real_chain")).rejects.toEqual({
      message:
        "Invalid chain: not_a_real_chain. If this is a custom chain, add it to chain overrides.",
      statusCode: 400,
      code: "INVALID_CHAIN",
    });
  });
});
