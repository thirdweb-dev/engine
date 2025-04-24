import { describe, expect, test } from "bun:test";
import { signTypedData } from "thirdweb/utils";
import { ANVIL_PKEY_A } from "../../utils/wallets";
import { setup } from "../setup";

describe("signTypedDataRoute", () => {
	const data = {
		domain: {
			name: "Ether Mail",
			version: "1",
			chainId: 1,
			verifyingContract: "0x0000000000000000000000000000000000000000",
		},
		message: {
			contents: "Hello, Bob!",
			from: {
				name: "Alice",
			},
		},
		primaryType: "Mail",
		types: {
			EIP712Domain: [
				{ name: "name", type: "string" },
				{ name: "version", type: "string" },
				{ name: "chainId", type: "uint256" },
				{ name: "verifyingContract", type: "address" },
			],
			Mail: [
				{ name: "contents", type: "string" },
				{ name: "from", type: "Person" },
			],
			Person: [{ name: "name", type: "string" }],
		},
	} as const;

	test("Sign typed data", async () => {
		const { engine, backendWallet } = await setup();

		const res = await engine.backendWallet.signTypedData(backendWallet, {
			domain: data.domain,
			value: data.message,
			types: data.types,
			primaryType: data.primaryType,
		});

		const expected = signTypedData({
			// @ts-expect-error - bigint serialization
			domain: data.domain,
			message: data.message,
			types: data.types,
			primaryType: data.primaryType,
			privateKey: ANVIL_PKEY_A,
		});

		expect(res.result).toEqual(expected);
	});

	test("Sign typed data without primary type", async () => {
		const { engine, backendWallet } = await setup();

		const res = await engine.backendWallet.signTypedData(backendWallet, {
			domain: data.domain,
			value: data.message,
			types: data.types,
		});

		const expected = signTypedData({
			// @ts-expect-error - bigint serialization
			domain: data.domain,
			message: data.message,
			types: data.types,
			primaryType: data.primaryType,
			privateKey: ANVIL_PKEY_A,
		});

		expect(res.result).toEqual(expected);
	});
});
