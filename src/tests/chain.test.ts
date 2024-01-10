import { getChainIdFromChain } from "../server/utils/chain";

describe("getChainIdFromChain", () => {
  it("returns chain that exists in chains db", async () => {
    const chainId = 1;
    const resolvedChainId = await getChainIdFromChain(chainId.toString());
    expect(resolvedChainId).toEqual(chainId);
  });

  it("returns resolves chain that doesn't exists in chains db but not chains package", async () => {
    const chainId = 1918988905;
    const resolvedChainId = await getChainIdFromChain(chainId.toString());
    expect(resolvedChainId).toEqual(chainId);
  });

  it("fails to get chain that doesn't exist", async () => {
    const chainId = 92145157591021810;
    try {
      await getChainIdFromChain(chainId.toString());
      throw new Error("This test should have failed");
    } catch (e) {
      if (!(e instanceof Error)) {
        throw new Error("unknown error");
      }
      expect(e?.message?.toLowerCase()).toContain("invalid chain");
    }
  });
});
