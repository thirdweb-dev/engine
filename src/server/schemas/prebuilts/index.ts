import { Type } from "@sinclair/typebox";
import { constants } from "ethers";
import { AddressSchema } from "../address";
import { chainIdOrSlugSchema } from "../chain";

export const commonContractSchema = Type.Object({
  name: Type.String(),
  description: Type.Optional(Type.String()),
  image: Type.Optional(Type.String()),
  external_link: Type.Optional(Type.String()),
  app_uri: Type.Optional(Type.String()),
  defaultAdmin: Type.Optional(Type.String()),
});

export const splitRecipientInputSchema = Type.Object({
  address: AddressSchema,
  sharesBps: Type.Integer({
    minimum: 0,
    maximum: 10_000,
  }),
});

const percentSchema = Type.Number({
  maximum: 100,
  minimum: 0,
  default: 0,
});

export const commonRoyaltySchema = Type.Object({
  seller_fee_basis_points: Type.Integer({
    maximum: 10_000,
    minimum: 0,
    default: 0,
  }),

  fee_recipient: Type.String({
    default: constants.AddressZero,
  }),
});

export const merkleSchema = Type.Optional(
  Type.Object({
    merkle: Type.Optional(Type.Record(Type.String(), Type.String())),
  }),
);

export const commonSymbolSchema = Type.Object({
  symbol: Type.String({
    default: "",
  }),
});

export const voteSettingsInputSchema = Type.Object({
  voting_delay_in_blocks: Type.Integer({
    minimum: 0,
    default: 0,
  }),
  voting_period_in_blocks: Type.Integer({
    minimum: 1,
    default: 1,
  }),
  voting_token_address: AddressSchema,
  voting_quorum_fraction: percentSchema,
  proposal_token_threshold: Type.String({
    default: "0",
  }),
});

export const commonPrimarySaleSchema = Type.Object({
  primary_sale_recipient: Type.Optional(Type.String()),
});

export const commonPlatformFeeSchema = Type.Object({
  platform_fee_basis_points: Type.Integer({
    maximum: 10_000,
    minimum: 0,
    default: 0,
  }),
  platform_fee_recipient: Type.String({
    default: constants.AddressZero,
  }),
});

export const commonTrustedForwarderSchema = Type.Object({
  trusted_forwarders: Type.Array(Type.String(), { default: [] }),
});

export const prebuiltDeployContractParamSchema = Type.Object({
  chain: chainIdOrSlugSchema,
});

export const prebuiltDeployResponseSchema = Type.Object({
  result: Type.Object({
    queueId: Type.Optional(Type.String()),
    deployedAddress: Type.Optional(AddressSchema),
  }),
});
