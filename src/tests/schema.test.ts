import { Value } from "@sinclair/typebox/value";
import { describe, expect, it } from "vitest";
import {
  AddressSchema,
  HexSchema,
  TransactionHashSchema,
} from "../server/schemas/address";
import { chainIdOrSlugSchema } from "../server/schemas/chain";

// Test cases
describe("chainIdOrSlugSchema", () => {
  it("should validate valid chain IDs", () => {
    expect(Value.Check(chainIdOrSlugSchema, "137")).toBe(true);
    expect(Value.Check(chainIdOrSlugSchema, "80002")).toBe(true);
  });

  it("should validate valid slugs", () => {
    expect(Value.Check(chainIdOrSlugSchema, "polygon")).toBe(true);
    expect(Value.Check(chainIdOrSlugSchema, "arbitrum-nova")).toBe(true);
    expect(Value.Check(chainIdOrSlugSchema, "polygon-amoy-testnet")).toBe(true);
    expect(Value.Check(chainIdOrSlugSchema, "some_slug_with_underscore")).toBe(
      true,
    );
  });

  it("should validate valid mixed slugs", () => {
    expect(Value.Check(chainIdOrSlugSchema, "polygon-test-123")).toBe(true);
    expect(Value.Check(chainIdOrSlugSchema, "arbitrum-1-test")).toBe(true);
  });

  it("should invalidate invalid inputs", () => {
    expect(Value.Check(chainIdOrSlugSchema, "")).toBe(false); // Empty string
    expect(Value.Check(chainIdOrSlugSchema, "!invalid")).toBe(false); // Invalid characters
    expect(Value.Check(chainIdOrSlugSchema, "space test")).toBe(false); // Spaces not allowed
    expect(
      Value.Check(
        chainIdOrSlugSchema,
        "too-long-slug-abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz",
      ),
    ).toBe(false); // Exceeds length
    expect(Value.Check(chainIdOrSlugSchema, "123-!@#")).toBe(false); // Special characters not allowed
  });
});

describe("AddressSchema", () => {
  it("should validate valid addresses", () => {
    expect(
      Value.Check(AddressSchema, "0x000000000000000000000000000000000000dead"),
    ).toBe(true);
  });

  it("should invalidate invalid addresses", () => {
    expect(
      Value.Check(AddressSchema, "0xG1234567890abcdef1234567890abcdef12345678"),
    ).toBe(false); // Invalid character 'G'
    expect(
      Value.Check(AddressSchema, "1234567890abcdef1234567890abcdef12345678"),
    ).toBe(false); // Missing '0x' prefix
    expect(Value.Check(AddressSchema, "0x12345")).toBe(false); // Too short
    expect(
      Value.Check(AddressSchema, "0x1234567890abcdef1234567890abcdef123456789"),
    ).toBe(false); // Too long
  });
});

describe("TransactionHashSchema", () => {
  it("should validate valid transaction hashes", () => {
    expect(
      Value.Check(
        TransactionHashSchema,
        "0x1f31b57601a6f90312fd5e57a2924bc8333477de579ee37b197a0681ab438431",
      ),
    ).toBe(true);
    expect(
      Value.Check(
        TransactionHashSchema,
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      ),
    ).toBe(true);
  });

  it("should invalidate invalid transaction hashes", () => {
    expect(
      Value.Check(
        TransactionHashSchema,
        "0xG1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      ),
    ).toBe(false); // Invalid character 'G'
    expect(
      Value.Check(
        TransactionHashSchema,
        "0x1234567890abcdef1234567890abcdef12345678",
      ),
    ).toBe(false); // Too short
    expect(
      Value.Check(
        TransactionHashSchema,
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1",
      ),
    ).toBe(false); // Too long
  });
});

describe("HexSchema", () => {
  it("should validate valid hex strings", () => {
    expect(Value.Check(HexSchema, "0x68656c6c6f20776f726c64")).toBe(true);
    expect(Value.Check(HexSchema, "0x")).toBe(true); // Empty hex string is valid
  });

  it("should invalidate invalid hex strings", () => {
    expect(Value.Check(HexSchema, "0xG123")).toBe(false); // Invalid character 'G'
    expect(Value.Check(HexSchema, "123456")).toBe(false); // Missing '0x' prefix
  });
});
