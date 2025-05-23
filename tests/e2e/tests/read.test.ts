import { beforeAll, describe, expect, test } from "bun:test";
import { sepolia } from "thirdweb/chains";
import type { ApiError } from "../../../sdk/dist/thirdweb-dev-engine.cjs.js";
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

  test("Read a contract method with struct and number params", async () => {
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

  test("Incorrectly read a contract should 400 (incorrect arity)", async () => {
    const structValues = {
      name: "test",
      value: 123,
    };

    const structString = JSON.stringify(structValues);

    try {
      await engine.contract.read(
        "readStructAndInts",
        chainIdString,
        structContractAddress,
        [structString, 1].join(","),
      );
      throw new Error("Expected method to throw");
    } catch (error) {
      expect((error as ApiError).status).toBe(400);
    }
  });
});
