import { beforeAll, describe, test } from "bun:test";
import { sepolia } from "thirdweb/chains";
import { expect } from "vitest";
import type { setupEngine } from "../utils/engine";
import { setup } from "./setup";

const structContractAddress = "0x83ca896ef0a66d39f0e6fcc1a93c0a09366b85b1";
const chainIdString = sepolia.id.toString();

describe("Read Tests", () => {
  let engine: ReturnType<typeof setupEngine>;

  beforeAll(async () => {
    const { engine: _engine, backendWallet: _backendWallet } = await setup();
    engine = _engine;
  });

  test("Write to a contract with function name", async () => {
    const structValues = {
      name: "test",
      value: 123,
    };

    const structString = JSON.stringify(structValues);

    const { result } = await engine.contract.read(
      "readStructAndInts",
      chainIdString,
      structContractAddress,
      `${structString},1,2`,
    );

    expect(result[0]).toEqual("test");
    expect(result[1]).toEqual("123");
    expect(result[2]).toEqual("1");
    expect(result[3]).toEqual("2");
  });
});
