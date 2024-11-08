import { Hex } from "thirdweb";
import { describe, expect, it } from "vitest";
import { _updateGasFees } from "../worker/tasks/sendTransactionWorker";

describe("_updateGasFees", () => {
  const base = {
    // Irrelevant values for testing.
    chainId: 1,
    data: "0x0" as Hex,
    gas: 21000n,
    to: undefined,
    nonce: undefined,
    accessList: undefined,
    value: undefined,
  };

  //   const legacyTransaction: PopulatedTransaction = {
  //     ...base,
  //     gasPrice: 35000000000n,
  //   };

  //   const eip1559Transaction: PopulatedTransaction = {
  //     ...base,
  //     maxPriorityFeePerGas: 500000000n,
  //     maxFeePerGas: 35000000000n,
  //   };

  it("returns the original transaction on first send (resendCount = 0)", () => {
    let result = _updateGasFees({ ...base, gasPrice: 100n }, 0, undefined);
    expect(result.gasPrice).toEqual(100n);

    result = _updateGasFees(
      { ...base, maxFeePerGas: 100n, maxPriorityFeePerGas: 10n },
      0,
      undefined,
    );
    expect(result.maxFeePerGas).toEqual(100n);
    expect(result.maxPriorityFeePerGas).toEqual(10n);
  });

  it("doubles gasPrice for legacy transactions", () => {
    const result = _updateGasFees({ ...base, gasPrice: 100n }, 1, {});
    expect(result.gasPrice).toBe(200n);
  });

  it("caps gasPrice multiplier at 10x", () => {
    const result = _updateGasFees({ ...base, gasPrice: 100n }, 10, {});
    expect(result.gasPrice).toBe(1000n);
  });

  it("updates maxPriorityFeePerGas and maxFeePerGas for EIP-1559 transactions", () => {
    const result = _updateGasFees(
      { ...base, maxFeePerGas: 100n, maxPriorityFeePerGas: 10n },
      3,
      {},
    );
    expect(result.maxPriorityFeePerGas).toBe(60n);
    expect(result.maxFeePerGas).toBe(260n);
  });

  it("respects overrides for maxPriorityFeePerGas", () => {
    const result = _updateGasFees(
      { ...base, maxFeePerGas: 100n, maxPriorityFeePerGas: 10n },
      3,
      { maxPriorityFeePerGas: 10n },
    );
    expect(result.maxPriorityFeePerGas).toBe(10n); // matches override
    expect(result.maxFeePerGas).toBe(210n);
  });

  it("respects overrides for maxFeePerGas", () => {
    const result = _updateGasFees(
      { ...base, maxFeePerGas: 100n, maxPriorityFeePerGas: 10n },
      3,
      { maxFeePerGas: 100n },
    );
    expect(result.maxPriorityFeePerGas).toBe(60n);
    expect(result.maxFeePerGas).toBe(100n); // matches override
  });

  it("returns correct values when only maxPriorityFeePerGas is set", () => {
    const result = _updateGasFees(
      { ...base, maxPriorityFeePerGas: 10n },
      3,
      {},
    );
    expect(result.maxPriorityFeePerGas).toBe(60n);
    expect(result.maxFeePerGas).toBeUndefined();
  });

  it("returns correct values when only maxFeePerGas is set", () => {
    const result = _updateGasFees({ ...base, maxFeePerGas: 80n }, 3, {});
    expect(result.maxFeePerGas).toBe(160n);
  });
});
