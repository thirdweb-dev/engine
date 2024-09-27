import { Type } from "@sinclair/typebox";
import { getAddress, type Address } from "thirdweb";
import { env } from "../../../utils/env";
import { badAddressError } from "../../middleware/error";
import { AddressSchema } from "../address";

export const walletHeaderSchema = Type.Object({
  "x-backend-wallet-address": {
    ...AddressSchema,
    description: "Backend wallet address",
  },
  "x-idempotency-key": Type.Optional(
    Type.String({
      description: `Transactions submitted with the same idempotency key will be de-duplicated. Only the last ${env.TRANSACTION_HISTORY_COUNT} transactions are compared.`,
    }),
  ),
});

export const walletWithAAHeaderSchema = Type.Object({
  ...walletHeaderSchema.properties,
  "x-account-address": Type.Optional({
    ...AddressSchema,
    description: "Smart account address",
  }),
  "x-account-factory-address": Type.Optional({
    ...AddressSchema,
    description:
      "Smart account factory address. If omitted, engine will try to resolve it from the chain.",
  }),
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
  chain: Type.String({
    examples: ["80002"],
    description: "Chain ID",
  }),
});

export const walletWithAddressParamSchema = Type.Object({
  ...walletChainParamSchema.properties,
  walletAddress: {
    ...AddressSchema,
    description: "Backend wallet address",
  },
});
