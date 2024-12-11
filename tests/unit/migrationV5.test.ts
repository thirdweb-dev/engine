import { describe, expect, it } from "vitest";

import { getSdk } from "../../src/shared/utils/cache/get-sdk";
import { getChain } from "../../src/shared/utils/chain";
import { thirdwebClient } from "../../src/shared/utils/sdk";
import { getWalletBalance } from "thirdweb/wallets";

/**
 * need to pass THIRDWEB_API_SECRET_KEY as env when running test case
 *
 * todo: remove all dependencies including tests after everything is migrated properly.
 */
describe("migration to v5", () => {
  it("get-balance", async () => {
    const chainId = 137;
    const walletAddress = "0xE52772e599b3fa747Af9595266b527A31611cebd";

    // v4
    const sdk = await getSdk({ chainId });
    const balanceV4 = await sdk.getBalance(walletAddress);

    // v5.
    const balanceV5 = await getWalletBalance({
      client: thirdwebClient,
      address: walletAddress,
      chain: await getChain(chainId),
    });

    console.log(balanceV4, balanceV5);
    expect(balanceV4.name).eq(balanceV5.name);
    expect(balanceV4.symbol).eq(balanceV5.symbol);
    expect(balanceV4.decimals).eq(balanceV5.decimals);
    expect(balanceV4.displayValue).eq(balanceV5.displayValue);
    expect(balanceV4.value.toString()).eq(balanceV5.value.toString());
  });
});
