import {
  getChainByChainIdAsync,
  getChainBySlugAsync,
} from "@thirdweb-dev/chains";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getChainIdFromChain } from "../../src/server/utils/chain";
import { getConfig } from "../../src/shared/utils/cache/getConfig";

// Mock the external dependencies
vi.mock("../utils/cache/getConfig");
vi.mock("@thirdweb-dev/chains");

const mockGetConfig = vi.mocked(getConfig);

const mockGetChainByChainIdAsync = vi.mocked(getChainByChainIdAsync);
const mockGetChainBySlugAsync = vi.mocked(getChainBySlugAsync);

describe("getChainIdFromChain", () => {
  beforeEach(() => {
    // Clear all mock calls before each test
    vi.clearAllMocks();
  });

  it("should return the chainId from chainOverrides if it exists by slug", async () => {
    // @ts-ignore
    mockGetConfig.mockResolvedValueOnce({
      chainOverrides: JSON.stringify([
        {
          slug: "Polygon",
          chainId: 137,
        },
      ]),
    });

    const result = await getChainIdFromChain("Polygon");

    expect(result).toBe(137);
    expect(getChainByChainIdAsync).not.toHaveBeenCalled();
    expect(getChainBySlugAsync).not.toHaveBeenCalled();
  });

  it("should return the chainId from chainOverrides if it exists by slug, case-insensitive", async () => {
    // @ts-ignore
    mockGetConfig.mockResolvedValueOnce({
      chainOverrides: JSON.stringify([
        {
          slug: "Polygon",
          chainId: 137,
        },
      ]),
    });

    const result = await getChainIdFromChain("polygon");

    expect(result).toBe(137);
    expect(getChainByChainIdAsync).not.toHaveBeenCalled();
    expect(getChainBySlugAsync).not.toHaveBeenCalled();
  });

  it("should return the chainId from chainOverrides if it exists", async () => {
    // @ts-ignore
    mockGetConfig.mockResolvedValueOnce({
      chainOverrides: JSON.stringify([
        {
          slug: "Polygon",
          chainId: 137,
        },
      ]),
    });

    const result = await getChainIdFromChain("Polygon");

    expect(result).toBe(137);
    expect(getChainByChainIdAsync).not.toHaveBeenCalled();
    expect(getChainBySlugAsync).not.toHaveBeenCalled();
  });

  it("should return the chainId from getChainByChainIdAsync if chain is a valid numeric string", async () => {
    // @ts-ignore
    mockGetChainByChainIdAsync.mockResolvedValueOnce({
      name: "Polygon",
      chainId: 137,
    });

    const result = await getChainIdFromChain("137");

    expect(result).toBe(137);
    expect(getChainByChainIdAsync).not.toHaveBeenCalled();
    expect(getChainBySlugAsync).not.toHaveBeenCalled();
  });

  it("should return the chainId from getChainBySlugAsync if chain is a valid string", async () => {
    // @ts-ignore
    mockGetConfig.mockResolvedValueOnce({});
    // @ts-ignore
    mockGetChainBySlugAsync.mockResolvedValueOnce({
      name: "Polygon",
      chainId: 137,
    });

    const result = await getChainIdFromChain("Polygon");

    expect(result).toBe(137);
    expect(getChainBySlugAsync).toHaveBeenCalledWith("polygon");
    expect(getChainByChainIdAsync).not.toHaveBeenCalled();
  });

  it("should throw an error for an invalid chain", async () => {
    // @ts-ignore
    mockGetConfig.mockResolvedValueOnce({});

    await expect(getChainIdFromChain("not_a_real_chain")).rejects.toEqual({
      message: "Chain not_a_real_chain is not found",
      statusCode: 400,
      code: "INVALID_CHAIN",
    });
  });
});
