import { err, ok, ResultAsync } from "neverthrow";
import {
  getContract,
  type Address,
  type Chain,
  type Hex,
  type ThirdwebClient,
  type ThirdwebContract,
} from "thirdweb";
import { isZkSyncChain } from "thirdweb/utils";
import { accountActionErrorMapper, type ValidationErr } from "../errors";
import { predictAccountAddress } from "thirdweb/extensions/erc4337";

export function isZkSyncChainResult(chain: Chain) {
  return ResultAsync.fromPromise(
    isZkSyncChain(chain),
    accountActionErrorMapper({
      code: "chain_determination_failed",
    }),
  );
}

export function getContractResult({
  address,
  chain,
  client,
}: {
  address: Address;
  chain: Chain;
  client: ThirdwebClient;
}) {
  try {
    const contract = getContract({
      address,
      chain,
      client,
    });

    return ok(contract);
  } catch (e) {
    return err({
      kind: "validation",
      code: "invalid_contract_details",
      status: 400,
      source: e instanceof Error ? e : undefined,
    } satisfies ValidationErr as ValidationErr);
  }
}

export function predictAccountAddressResult({
  adminSigner,
  contract,
  data,
}: {
  adminSigner: Address;
  contract: ThirdwebContract;
  data: Hex;
}) {
  return ResultAsync.fromPromise(
    predictAccountAddress({
      adminSigner,
      contract,
      data,
    }),
    accountActionErrorMapper({
      code: "smart_account_determination_failed",
      status: 500,
      address: adminSigner,
      chainId: contract.chain.id.toString(),
    }),
  );
}
