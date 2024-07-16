import { Transactions } from ".prisma/client";
import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { BigNumber, ethers, providers } from "ethers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGasSettingsForRetry, multiplyGasOverrides } from "../utils/gas";

vi.mock("@thirdweb-dev/sdk");
const mockGetDefaultGasOverrides = vi.mocked(getDefaultGasOverrides);

describe("getGasSettingsForRetry", () => {
  let mockProvider: ethers.providers.StaticJsonRpcProvider;
  let mockTransaction: Transactions;

  beforeEach(() => {
    mockProvider = new providers.StaticJsonRpcProvider();

    // @ts-ignore
    mockTransaction = {
      gasPrice: "1000",
      retryGasValues: false,
      maxFeePerGas: "500",
      maxPriorityFeePerGas: "100",
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("new gas settings for legacy gas format", async () => {
    mockGetDefaultGasOverrides.mockResolvedValue({
      gasPrice: BigNumber.from(1000),
    });

    const gasSettings = await getGasSettingsForRetry(
      mockTransaction,
      mockProvider,
    );

    expect(gasSettings).toEqual({
      gasPrice: BigNumber.from(2000),
    });
  });

  it("new gas settings for legacy gas format, fallback to 110% of previous attempt", async () => {
    mockGetDefaultGasOverrides.mockResolvedValue({
      gasPrice: BigNumber.from(520),
    });

    const gasSettings = await getGasSettingsForRetry(
      mockTransaction,
      mockProvider,
    );

    expect(gasSettings).toEqual({
      gasPrice: BigNumber.from(1100), // uses 1100 instead of 1040
    });
  });

  it("new gas settings for EIP 1559 gas format", async () => {
    mockGetDefaultGasOverrides.mockResolvedValueOnce({
      maxFeePerGas: BigNumber.from(500),
      maxPriorityFeePerGas: BigNumber.from(100),
    });

    const gasSettings = await getGasSettingsForRetry(
      mockTransaction,
      mockProvider,
    );

    expect(gasSettings).toEqual({
      maxFeePerGas: BigNumber.from(1000),
      maxPriorityFeePerGas: BigNumber.from(200),
    });
  });

  it("new gas settings for EIP 1559 gas format, fallback to 110% of previous attempt", async () => {
    mockGetDefaultGasOverrides.mockResolvedValueOnce({
      maxFeePerGas: BigNumber.from(500),
      maxPriorityFeePerGas: BigNumber.from(100),
    });

    const gasSettings = await getGasSettingsForRetry(
      mockTransaction,
      mockProvider,
    );

    expect(gasSettings).toEqual({
      maxFeePerGas: BigNumber.from(1000),
      maxPriorityFeePerGas: BigNumber.from(200),
    });
  });

  it("new gas settings for EIP 1559 gas format, use manual overrides", async () => {
    mockGetDefaultGasOverrides.mockResolvedValueOnce({
      maxFeePerGas: BigNumber.from(500),
      maxPriorityFeePerGas: BigNumber.from(100),
    });

    mockTransaction = {
      ...mockTransaction,
      retryGasValues: true,
      retryMaxFeePerGas: "2222",
      retryMaxPriorityFeePerGas: "444",
    };

    const gasSettings = await getGasSettingsForRetry(
      mockTransaction,
      mockProvider,
    );

    expect(gasSettings).toEqual({
      maxFeePerGas: BigNumber.from(2222),
      maxPriorityFeePerGas: BigNumber.from(444),
    });
  });

  it("new gas settings for EIP 1559 gas format, manual overrides but fall back to 110% previous attempt", async () => {
    mockGetDefaultGasOverrides.mockResolvedValueOnce({
      maxFeePerGas: BigNumber.from(500),
      maxPriorityFeePerGas: BigNumber.from(100),
    });

    mockTransaction = {
      ...mockTransaction,
      retryGasValues: true,
      retryMaxFeePerGas: "505",
      retryMaxPriorityFeePerGas: "105",
    };

    const gasSettings = await getGasSettingsForRetry(
      mockTransaction,
      mockProvider,
    );

    expect(gasSettings).toEqual({
      maxFeePerGas: BigNumber.from(550),
      maxPriorityFeePerGas: BigNumber.from(110),
    });
  });
});

describe("multiplyGasOverrides", () => {
  const gasOverridesLegacy = {
    gasPrice: BigNumber.from(100),
  };
  const gasOverridesEip1155 = {
    maxFeePerGas: BigNumber.from(50),
    maxPriorityFeePerGas: BigNumber.from(10),
  };

  it("should multiply gasPrice by given factor", () => {
    const result = multiplyGasOverrides(gasOverridesLegacy, 2);
    expect(result.gasPrice).toEqual(BigNumber.from(200));
  });

  it("should multiply maxFeePerGas and maxPriorityFeePerGas by given factor", () => {
    const result = multiplyGasOverrides(gasOverridesEip1155, 3);
    expect(result.maxFeePerGas).toEqual(BigNumber.from(150));
    expect(result.maxPriorityFeePerGas).toEqual(BigNumber.from(30));
  });

  it("should handle non-integer multiplication factor", () => {
    const result = multiplyGasOverrides(gasOverridesEip1155, 1.5);
    expect(result.maxFeePerGas).toEqual(BigNumber.from(75));
    expect(result.maxPriorityFeePerGas).toEqual(BigNumber.from(15));
  });

  it("should handle multiplication by zero", () => {
    const result = multiplyGasOverrides(gasOverridesEip1155, 0);
    expect(result.maxFeePerGas).toEqual(BigNumber.from(0));
    expect(result.maxPriorityFeePerGas).toEqual(BigNumber.from(0));
  });
});
