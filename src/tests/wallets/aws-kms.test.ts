import { beforeAll, expect, test, vi } from "vitest";

import { ANVIL_CHAIN, anvilTestClient } from "../shared/chain.ts";

import { TEST_AWS_KMS_CONFIG } from "../config/aws-kms.ts";

import { typedData } from "../shared/typed-data.ts";

import { verifyTypedData } from "thirdweb";
import { verifyEOASignature } from "thirdweb/auth";
import {
  prepareTransaction,
  sendAndConfirmTransaction,
} from "thirdweb/transaction";
import { toUnits, toWei } from "thirdweb/utils";
import { getWalletBalance } from "thirdweb/wallets";
import { getAwsKmsAccount } from "../../server/utils/wallets/getAwsKmsAccount.js";
import { TEST_CLIENT } from "../shared/client.ts";

let account: Awaited<ReturnType<typeof getAwsKmsAccount>>;

vi.mock("../../utils/chain", () => ({
  getChain: async () => ANVIL_CHAIN,
}));

beforeAll(async () => {
  account = await getAwsKmsAccount({
    keyId: TEST_AWS_KMS_CONFIG.keyId,
    client: TEST_CLIENT,
    config: {
      credentials: {
        accessKeyId: TEST_AWS_KMS_CONFIG.accessKeyId,
        secretAccessKey: TEST_AWS_KMS_CONFIG.secretAccessKey,
      },
      region: TEST_AWS_KMS_CONFIG.region,
    },
  });
});

test("account address is valid", () => {
  expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
});

test("sign message", async () => {
  const message = "hello world";
  const signature = await account.signMessage({ message });

  expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);

  const isValid = await verifyEOASignature({
    address: account.address,
    message,
    signature,
  });
  expect(isValid).toBe(true);
});

test("sign transaction", async () => {
  const tx = {
    chainId: ANVIL_CHAIN.id,
    maxFeePerGas: toUnits("20", 9),
    gas: 21000n,
    to: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    value: toUnits("1", 18),
  };

  expect(account.signTransaction).toBeDefined();

  const signedTx = await account.signTransaction?.(tx);
  expect(signedTx).toMatch(/^0x[a-fA-F0-9]+$/);
});

test("sign typed data", async () => {
  const signature = await account.signTypedData({
    ...typedData.basic,
    primaryType: "Mail",
  });

  expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);

  const isValid = await verifyTypedData({
    address: account.address,
    ...typedData.basic,
    primaryType: "Mail",
    signature,
    client: TEST_CLIENT,
    chain: ANVIL_CHAIN,
  });
  expect(isValid).toBe(true);
});

test("send transaction", async () => {
  const recipient = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

  await anvilTestClient.setBalance({
    address: account.address,
    value: toWei("10"),
  });

  const startingBalance = await getWalletBalance({
    address: account.address,
    chain: ANVIL_CHAIN,
    client: TEST_CLIENT,
  });

  const startingBalanceRecipient = await getWalletBalance({
    address: recipient,
    chain: ANVIL_CHAIN,
    client: TEST_CLIENT,
  });

  const tx = prepareTransaction({
    client: TEST_CLIENT,
    chain: ANVIL_CHAIN,
    to: recipient,
    value: toUnits("1", 18),
  });

  const result = await sendAndConfirmTransaction({
    account,
    transaction: tx,
  });

  expect(result.transactionHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

  const endingBalance = await getWalletBalance({
    address: account.address,
    client: TEST_CLIENT,
    chain: ANVIL_CHAIN,
  });
  const endingBalanceRecipient = await getWalletBalance({
    address: recipient,
    client: TEST_CLIENT,
    chain: ANVIL_CHAIN,
  });

  expect(endingBalance.value).toBeLessThan(startingBalance.value);
  expect(endingBalanceRecipient.value).toBeGreaterThan(
    startingBalanceRecipient.value,
  );
});
