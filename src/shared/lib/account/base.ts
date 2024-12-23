import { z } from "zod";
import { zodEvmAddressSchema } from "../../schemas/address";

// Base schemas all wallet types build from
export const baseWalletSchema = z.object({
  address: zodEvmAddressSchema,
  label: z.string().nullable(),
});

export const smartWalletSchema = z.object({
  accountSignerAddress: zodEvmAddressSchema,
  accountFactoryAddress: zodEvmAddressSchema.nullable(),
  entrypointAddress: zodEvmAddressSchema.nullable(),
});

// Core interface each wallet type implements
export interface WalletTypeDefinition<
  TBase extends z.ZodType,
  TSmart extends z.ZodType,
> {
  // Schemas for validation
  baseSchema: TBase;
  smartSchema: TSmart;

  // DB operations
  create: (params: {
    config: z.infer<TBase>;
  }) => Promise<z.infer<TBase>>;

  createSmart: (params: {
    config: z.infer<TSmart>;
  }) => Promise<z.infer<TSmart>>;

  // Parse from DB + decrypt + global config fallbacks
  parse: (
    details: WalletDetails,
    globalConfig: ParsedConfig,
  ) => Promise<z.infer<TBase>>;

  // Convert to Account
  getAccount: (
    parsed: z.infer<TBase>,
    baseConfig: { client: ThirdwebClient; chain: Chain },
  ) => Promise<Account>;
}
