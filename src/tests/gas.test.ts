import { Transactions } from ".prisma/client";
import { getDefaultGasOverrides } from "@thirdweb-dev/sdk";
import { BigNumber, ethers, providers } from "ethers";
import { getGasSettingsForRetry } from "../utils/gas";

jest.mock("@thirdweb-dev/sdk");
const mockGetDefaultGasOverrides =
  getDefaultGasOverrides as jest.MockedFunction<typeof getDefaultGasOverrides>;

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
    jest.clearAllMocks();
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

  //   it("should handle legacy gas format when new gas settings are lower than the minimum", async () => {
  //     // Mocking getDefaultGasOverrides response for legacy gas format
  //     getDefaultGasOverrides.mockResolvedValueOnce({
  //       gasPrice: BigNumber.from(1000),
  //       maxFeePerGas: undefined,
  //       maxPriorityFeePerGas: undefined,
  //     });

  //     // Lowering the gasPrice to trigger the minimum check
  //     mockTransaction.gasPrice = BigNumber.from(100);

  //     const gasSettings = await getGasSettingsForRetry(
  //       mockTransaction,
  //       mockProvider,
  //     );

  //     // Assertion
  //     expect(gasSettings).toEqual({
  //       gasPrice: BigNumber.from(110), // Expected minimum gasPrice
  //     });
  //   });

  //   it("should handle EIP 1559 gas format when new gas settings are lower than the minimum", async () => {
  //     // Mocking getDefaultGasOverrides response for EIP 1559 gas format
  //     getDefaultGasOverrides.mockResolvedValueOnce({
  //       gasPrice: undefined,
  //       maxFeePerGas: BigNumber.from(500),
  //       maxPriorityFeePerGas: BigNumber.from(100),
  //     });

  //     // Lowering the maxFeePerGas to trigger the minimum check
  //     mockTransaction.maxFeePerGas = 450;

  //     const gasSettings = await getGasSettingsForRetry(
  //       mockTransaction,
  //       mockProvider,
  //     );

  //     // Assertion
  //     expect(gasSettings).toEqual({
  //       maxFeePerGas: BigNumber.from(495), // Expected minimum maxFeePerGas
  //       maxPriorityFeePerGas: BigNumber.from(110), // Expected minimum maxPriorityFeePerGas
  //     });
  //   });
});
