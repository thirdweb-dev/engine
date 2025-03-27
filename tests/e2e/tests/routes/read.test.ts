import { beforeAll, describe, expect, test } from "bun:test";
import assert from "node:assert";
import { ZERO_ADDRESS } from "thirdweb";
import type { Address } from "thirdweb/utils";
import { CONFIG } from "../../config";
import type { setupEngine } from "../../utils/engine";
import { pollTransactionStatus } from "../../utils/transactions";
import { setup } from "../setup";

describe("readContractRoute", () => {
  let engine: ReturnType<typeof setupEngine>;
  let backendWallet: Address;
  let tokenContractAddress: string;

  beforeAll(async () => {
    const { engine: _engine, backendWallet: _backendWallet } = await setup();
    engine = _engine;
    backendWallet = _backendWallet as Address;

    const res = await engine.deploy.deployToken(
      CONFIG.CHAIN.id.toString(),
      backendWallet,
      {
        contractMetadata: {
          name: "test token",
          platform_fee_basis_points: 0,
          platform_fee_recipient: ZERO_ADDRESS,
          symbol: "TT",
          trusted_forwarders: [],
        },
      },
    );

    expect(res.result.queueId).toBeDefined();
    assert(res.result.queueId, "queueId must be defined");
    expect(res.result.deployedAddress).toBeDefined();

    const transactionStatus = await pollTransactionStatus(
      engine,
      res.result.queueId,
      true,
    );

    expect(transactionStatus.minedAt).toBeDefined();
    assert(res.result.deployedAddress, "deployedAddress must be defined");
    tokenContractAddress = res.result.deployedAddress;
  });

  test("readContract with function name", async () => {
    const res = await engine.contract.read(
      "name",
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
    );

    expect(res.result).toEqual("test token");
  });

  test("readContract with function signature", async () => {
    const res = await engine.contract.read(
      "function symbol() public view returns (string memory)",
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
    );

    expect(res.result).toEqual("TT");
  });

  test("readContract with function signature", async () => {
    const res = await engine.contract.read(
      "function totalSupply() public view returns (uint256)",
      CONFIG.CHAIN.id.toString(),
      tokenContractAddress,
    );

    expect(res.result).toEqual("0");
  });
});
