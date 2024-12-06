import { describe, expect, test } from "bun:test";
import { polygon } from "thirdweb/chains";
import { getBlockTimeSeconds } from "../../../../src/utils/indexer/getBlockTime";

describe("getBlockTimeSeconds", () => {
  test("Returns roughly 2 seconds for Polygon", async () => {
    const result = await getBlockTimeSeconds(polygon.id, 100);
    // May be off slightly due to not having subsecond granularity.
    expect(Math.round(result)).toEqual(2);
  });
});
