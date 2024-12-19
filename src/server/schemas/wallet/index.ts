import { Type } from "@sinclair/typebox";
import { type Address, getAddress } from "thirdweb";
import { env } from "../../../shared/utils/env";
import { badAddressError } from "../../middleware/error";
import { AddressSchema } from "../address";
import { chainIdOrSlugSchema } from "../chain";

export const idempotentHeaderSchema = Type.Object({
  "x-idempotency-key": Type.Optional(
    Type.String({
      maxLength: 200,
      description: `Transactions submitted with the same idempotency key will be de-duplicated. Only the last ${env.TRANSACTION_HISTORY_COUNT} transactions are compared.`,
    }),
  ),
});
export const enclaveWalletHeaderSchema = Type.Object({
  "x-enclave-wallet-auth-token": Type.Optional(
    Type.String({
      description:
        "Auth token of an enclave wallet. mutually exclusive with other wallet headers",
    }),
  ),
  "x-client-id": Type.Optional(
    Type.String({
      description:
        "Client id of an enclave wallet. mutually exclusive with other wallet headers",
    }),
  ),
  "x-ecosystem-id": Type.Optional(
    Type.RegExp(/^ecosystem\.[a-zA-Z0-9_-]+$/, {
      description:
        "Ecosystem id of an enclave wallet. mutually exclusive with other wallet headers",
    }),
  ),
  "x-ecosystem-partner-id": Type.Optional(
    Type.String({
      description:
        "Ecosystem partner id of an enclave wallet. mutually exclusive with other wallet headers",
    }),
  ),
});

export const walletHeaderSchema = Type.Object({
  "x-backend-wallet-address": {
    ...AddressSchema,
    description: "Backend wallet address",
  },
  ...idempotentHeaderSchema.properties,
});

export const walletWithAAHeaderSchema = Type.Object({
  ...walletHeaderSchema.properties,
  "x-account-address": Type.Optional({
    ...AddressSchema,
    description: "Smart account address",
    examples: [],
  }),
  "x-account-factory-address": Type.Optional({
    ...AddressSchema,
    description:
      "Smart account factory address. If omitted, Engine will try to resolve it from the contract.",
    examples: [],
  }),
  "x-account-salt": Type.Optional(
    Type.String({
      description:
        "Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.",
    }),
  ),
});

export const walletWithAAOrEnclaveHeaderSchema = Type.Object({
  ...walletWithAAHeaderSchema.properties,
  ...enclaveWalletHeaderSchema.properties,
});

/**
 * Helper function to parse an address string.
 * Returns undefined if the address is undefined.
 *
 * Throws a custom 422 INVALID_ADDRESS error with variableName if the address is invalid (other than undefined).
 */
export function maybeAddress(
  address: string | undefined,
  variableName: string,
): Address | undefined {
  if (!address) return undefined;
  try {
    return getAddress(address);
  } catch {
    throw badAddressError(variableName);
  }
}

/**
 * Same as maybeAddress, but throws if the address is undefined.
 */
export function requiredAddress(
  address: string | undefined,
  variableName: string,
): Address {
  const parsedAddress = maybeAddress(address, variableName);
  if (!parsedAddress) throw badAddressError(variableName);
  return parsedAddress;
}

export const walletChainParamSchema = Type.Object({
  chain: chainIdOrSlugSchema,
});

export const walletWithAddressParamSchema = Type.Object({
  ...walletChainParamSchema.properties,
  walletAddress: {
    ...AddressSchema,
    description: "Backend wallet address",
  },
});
