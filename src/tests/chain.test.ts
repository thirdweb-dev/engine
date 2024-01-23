import {
  getChainByChainIdAsync,
  getChainBySlugAsync,
} from "@thirdweb-dev/chains";
import { getChainIdFromChain } from "../server/utils/chain";
import { getConfig } from "../utils/cache/getConfig";

// Mock the external dependencies
jest.mock("../utils/cache/getConfig");
jest.mock("@thirdweb-dev/chains");

const mockGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
const mockGetChainByChainIdAsync =
  getChainByChainIdAsync as jest.MockedFunction<typeof getChainByChainIdAsync>;
const mockGetChainBySlugAsync = getChainBySlugAsync as jest.MockedFunction<
  typeof getChainBySlugAsync
>;

describe("getChainIdFromChain", () => {
  beforeEach(() => {
    // Clear all mock calls before each test
    jest.clearAllMocks();
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
    mockGetConfig.mockResolvedValueOnce({});
    // @ts-ignore
    mockGetChainByChainIdAsync.mockResolvedValueOnce({
      name: "Mumbai",
      chainId: 80001,
    });

    const result = await getChainIdFromChain("80001");

    expect(result).toBe(80001);
    expect(getChainByChainIdAsync).toHaveBeenCalledWith(80001);
    expect(getChainBySlugAsync).not.toHaveBeenCalled();
  });

  it("should return the chainId from getChainBySlugAsync if chain is a valid string", async () => {
    // @ts-ignore
    mockGetConfig.mockResolvedValueOnce({});
    // @ts-ignore
    mockGetChainBySlugAsync.mockResolvedValueOnce({
      chainId: 137,
    });

    const result = await getChainIdFromChain("Polygon");

    expect(result).toBe(137);
    expect(getChainBySlugAsync).toHaveBeenCalledWith("Polygon");
    expect(getChainByChainIdAsync).not.toHaveBeenCalled();
  });

  it("should throw an error for an invalid chain", async () => {
    // @ts-ignore
    mockGetConfig.mockResolvedValueOnce({});

    await expect(getChainIdFromChain("InvalidChain")).rejects.toThrow(
      "Invalid chain. Please confirm this is a valid chain",
    );
  });
});
