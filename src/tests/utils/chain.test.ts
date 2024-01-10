import { getChainIdFromChain } from "../../server/utils/chain";

describe("getChainIdFromChain", () => {
  it("returns resolves chain that doesn't exists in chains db but not chains package", async () => {
    const chainId = 1918988905;
    const resolvedChainId = await getChainIdFromChain(chainId.toString());
    expect(resolvedChainId).toEqual(chainId);
  });
});
