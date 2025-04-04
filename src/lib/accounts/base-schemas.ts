import * as z from "zod";
import { timestampsSchema, evmAddressSchema } from "../zod.js";

export const baseAccountCreateSchema = z.object({
  label: z.string().openapi({
    description: "The label of the account",
  }),
});

export const baseCredentialIdSchema = z.object({
  credentialId: z.string().uuid().openapi({
    description:
      "The ID of the credential used to create the account. Only not present for local accounts.",
    example: "1e87e873-3ca4-411b-bfdc-4657bac4802e",
  }),
});

export const smartAccountSchema = z.object({
  address: evmAddressSchema,
  signerAddress: evmAddressSchema.openapi({
    description: "The address of the signer account",
  }),
  factoryAddress: evmAddressSchema.openapi({
    description: "The address of the factory contract",
  }),
  entrypointAddress: evmAddressSchema.openapi({
    description: "The address of the entry point contract",
  }),
  accountSalt: z.string().openapi({
    description:
      "The salt used to generate the account address. Default smart accounts are created with a null salt. Smart account address is deterministically generated from the signer address, factory address and salt.",
    example: "any",
  }),
});

export const smartAccountResponseSchema =
  smartAccountSchema.merge(timestampsSchema);

export const baseAccountResponseSchema = z
  .object({
    address: evmAddressSchema,
    label: z.string().openapi({
      description: "The label of the account",
    }),
    credentialId: z.string().openapi({
      description:
        "The ID of the credential used to create the account. Only not present for local accounts.",
      example: "1e87e873-3ca4-411b-bfdc-4657bac4802e",
    }),
    smartAccounts: z.array(smartAccountResponseSchema).openapi({
      description:
        "The smart accounts associated with the account. Engine will automatically create a default smart account with your newly created account",
    }),
  })
  .merge(timestampsSchema);
