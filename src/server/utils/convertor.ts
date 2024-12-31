import type { Static } from "@sinclair/typebox";
import { BigNumber } from "ethers";
import type { FastifyRequest } from "fastify";
import type { EcosystemWalletId } from "thirdweb/dist/types/wallets/wallet-types";
import type { EnclaveWalletParams } from "../../shared/utils/cache/get-enclave-wallet";
import type { enclaveWalletHeaderSchema } from "../schemas/wallet";

const isHexBigNumber = (value: unknown) => {
  const isNonNullObject = typeof value === "object" && value !== null;
  const hasType = isNonNullObject && "type" in value;
  return hasType && value.type === "BigNumber" && "hex" in value;
};
export const bigNumberReplacer = (value: unknown): unknown => {
  // if we find a BigNumber then make it into a string (since that is safe)
  if (BigNumber.isBigNumber(value) || isHexBigNumber(value)) {
    return BigNumber.from(value).toString();
  }

  if (Array.isArray(value)) {
    return value.map(bigNumberReplacer);
  }

  return value;
};

export const parseEnclaveHeaders = async (
  headers: FastifyRequest["headers"],
  chain: string,
): Promise<EnclaveWalletParams> => {
  const {
    "x-enclave-wallet-auth-token": authToken = "",
    "x-client-id": clientId = "",
    "x-ecosystem-id": id,
    "x-ecosystem-partner-id": partnerId,
  } = headers as Static<typeof enclaveWalletHeaderSchema>;
  let ecosystem: EnclaveWalletParams["ecosystem"];
  if (id) {
    ecosystem = { id: id as EcosystemWalletId, partnerId };
  }

  return {
    authToken,
    clientId,
    ecosystem,
    chain,
  };
};
