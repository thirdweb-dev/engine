import { describe, expect, test } from "bun:test";
import { setup } from "../setup";

describe("signaturePrepareRoute", () => {
  test("Prepare a signature with upload, no uid, no royalty/sale recipients", async () => {
    const { engine, backendWallet } = await setup();

    const res = await engine.erc721.signaturePrepare(
      "84532",
      "0x5002e3bF97F376Fe0480109e26c0208786bCDDd4",
      {
        metadata: {
          description: "Test description",
          image: "ipfs://...",
          name: "My NFT",
          attributes: [
            {
              trait_type: "test type",
              value: "test value",
            },
          ],
        },
        validityEndTimestamp: 1729194714,
        validityStartTimestamp: 1728589914,
        to: backendWallet,
      },
    );

    const expected = {
      result: {
        mintPayload: {
          uri: "DO_NOT_ASSERT",
          to: backendWallet,
          price: "0",
          currency: "0x0000000000000000000000000000000000000000",
          primarySaleRecipient: "0xa5B8492D8223D255dB279C7c3ebdA34Be5eC9D85",
          royaltyRecipient: "0xa5B8492D8223D255dB279C7c3ebdA34Be5eC9D85",
          royaltyBps: "0",
          validityStartTimestamp: 1728589914,
          validityEndTimestamp: 1729194714,
          uid: "DO_NOT_ASSERT",
        },
        typedDataPayload: {
          domain: {
            name: "TokenERC721",
            version: "1",
            chainId: 84532,
            verifyingContract: "0x5002e3bF97F376Fe0480109e26c0208786bCDDd4",
          },
          types: {
            EIP712Domain: [
              {
                name: "name",
                type: "string",
              },
              {
                name: "version",
                type: "string",
              },
              {
                name: "chainId",
                type: "uint256",
              },
              {
                name: "verifyingContract",
                type: "address",
              },
            ],
            MintRequest: [
              {
                name: "to",
                type: "address",
              },
              {
                name: "royaltyRecipient",
                type: "address",
              },
              {
                name: "royaltyBps",
                type: "uint256",
              },
              {
                name: "primarySaleRecipient",
                type: "address",
              },
              {
                name: "uri",
                type: "string",
              },
              {
                name: "price",
                type: "uint256",
              },
              {
                name: "currency",
                type: "address",
              },
              {
                name: "validityStartTimestamp",
                type: "uint128",
              },
              {
                name: "validityEndTimestamp",
                type: "uint128",
              },
              {
                name: "uid",
                type: "bytes32",
              },
            ],
          },
          message: {
            uri: "DO_NOT_ASSERT",
            to: backendWallet,
            price: "0",
            currency: "0x0000000000000000000000000000000000000000",
            primarySaleRecipient: "0xa5B8492D8223D255dB279C7c3ebdA34Be5eC9D85",
            royaltyRecipient: "0xa5B8492D8223D255dB279C7c3ebdA34Be5eC9D85",
            royaltyBps: "0",
            validityStartTimestamp: 1728589914,
            validityEndTimestamp: 1729194714,
            uid: "DO_NOT_ASSERT",
          },
          primaryType: "MintRequest" as const,
        },
      },
    };

    // These fields are dynamic, do not assert them.
    expected.result.mintPayload.uri = res.result.mintPayload.uri;
    expected.result.typedDataPayload.message.uri = res.result.mintPayload.uri;
    expected.result.mintPayload.uid = res.result.mintPayload.uid;
    expected.result.typedDataPayload.message.uid = res.result.mintPayload.uid;

    expect(res).toEqual(expected);
  });

  test("Prepare a signature with provided hex uid", async () => {
    const { engine, backendWallet } = await setup();

    const res = await engine.erc721.signaturePrepare(
      "84532",
      "0x5002e3bF97F376Fe0480109e26c0208786bCDDd4",
      {
        metadata: "ipfs://...",
        validityEndTimestamp: 1729194714,
        validityStartTimestamp: 1728589914,
        to: backendWallet,
        uid: "0x25d29226fc7c310ed308c1eea8a3ed2d9f660d873ba6348b6649da4cae3877a4",
      },
    );

    expect(res.result.mintPayload.uid).toEqual(
      "0x25d29226fc7c310ed308c1eea8a3ed2d9f660d873ba6348b6649da4cae3877a4",
    );
  });

  test("Prepare a signature with string uid", async () => {
    const { engine, backendWallet } = await setup();

    const res = await engine.erc721.signaturePrepare(
      "84532",
      "0x5002e3bF97F376Fe0480109e26c0208786bCDDd4",
      {
        metadata: "ipfs://...",
        validityEndTimestamp: 1729194714,
        validityStartTimestamp: 1728589914,
        to: backendWallet,
        uid: "my-really-long-test-uuid-my-really-long-test-uuid-my-really-long-test-uuid",
      },
    );

    expect(res.result.mintPayload.uid).toEqual(
      "0xa74a3badce5090a5afead99c9d80e08169468a2442a6f79692001aed81acf2bc",
    );
  });

  test("Prepare a signature with invalid hex uid", async () => {
    const { engine, backendWallet } = await setup();

    let threw = false;
    try {
      await engine.erc721.signaturePrepare(
        "84532",
        "0x5002e3bF97F376Fe0480109e26c0208786bCDDd4",
        {
          metadata: "ipfs://...",
          validityEndTimestamp: 1729194714,
          validityStartTimestamp: 1728589914,
          to: backendWallet,
          uid: "0x25d29226fc7c310ed308c1eea8a3ed2d",
        },
      );
    } catch {
      threw = true;
    }

    expect(threw).toBeTrue();
  });
});
