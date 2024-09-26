import { Type, type Static } from "@sinclair/typebox";
import type { contractSchemaTypes } from "../sharedApiSchemas";

/**
 * Basic schema for all Request Query String
 */
export const readRequestQuerySchema = Type.Object({
  functionName: Type.String({
    description: "Name of the function to call on Contract",
    examples: ["balanceOf"],
  }),
  args: Type.Optional(
    Type.String({
      description: "Arguments for the function. Comma Separated",
      examples: [""],
    }),
  ),
});

export interface readSchema extends contractSchemaTypes {
  Querystring: Static<typeof readRequestQuerySchema>;
}

const abiTypeSchema = Type.Object({
  type: Type.Optional(Type.String()),
  name: Type.Optional(Type.String()),
  internalType: Type.Optional(Type.String()),
  stateMutability: Type.Optional(Type.String()),
  components: Type.Optional(
    Type.Array(
      Type.Object({
        type: Type.Optional(Type.String()),
        name: Type.Optional(Type.String()),
        internalType: Type.Optional(Type.String()),
      }),
    ),
  ),
});

export const abiFunctionSchema = Type.Object({
  name: Type.String(),
  inputs: Type.Array(abiTypeSchema),
  outputs: Type.Array(abiTypeSchema),
  comment: Type.Optional(Type.String()),
  signature: Type.String(),
  stateMutability: Type.String(),
});

export const abiEventSchema = Type.Object({
  name: Type.String(),
  inputs: Type.Array(abiTypeSchema),
  outputs: Type.Array(abiTypeSchema),
  comment: Type.Optional(Type.String()),
});

export const abiSchema = Type.Object({
  type: Type.String(),
  name: Type.Optional(Type.String()),
  inputs: Type.Optional(Type.Array(abiTypeSchema)),
  outputs: Type.Optional(Type.Array(abiTypeSchema)),
  stateMutability: Type.Optional(Type.String()),
});

export const contractEventSchema = Type.Record(Type.String(), Type.Any());

export const rolesResponseSchema = Type.Object({
  admin: Type.Array(Type.String()),
  transfer: Type.Array(Type.String()),
  minter: Type.Array(Type.String()),
  pauser: Type.Array(Type.String()),
  lister: Type.Array(Type.String()),
  asset: Type.Array(Type.String()),
  unwrap: Type.Array(Type.String()),
  factory: Type.Array(Type.String()),
  signer: Type.Array(Type.String()),
});

export const eventsQuerystringSchema = Type.Object(
  {
    fromBlock: Type.Optional(
      Type.Union([Type.Number(), Type.String()], { default: "0" }),
    ),
    toBlock: Type.Optional(
      Type.Union([Type.Number({ default: 0 }), Type.String({ default: "0" })], {
        default: "latest",
      }),
    ),
    order: Type.Optional(
      Type.Union([Type.Literal("asc"), Type.Literal("desc")], {
        default: "desc",
      }),
    ),
  },
  {
    description:
      "Specify the from and to block numbers to get events for, defaults to all blocks",
  },
);

export const royaltySchema = Type.Object({
  seller_fee_basis_points: Type.Number({
    description: "The royalty fee in BPS (basis points). 100 = 1%.",
  }),
  fee_recipient: Type.String({
    description: "The wallet address that will receive the royalty fees.",
  }),
});

export const contractDeployBasicSchema = Type.Object({
  version: Type.Optional(
    Type.String({
      description: "Version of the contract to deploy. Defaults to latest.",
    }),
  ),
  forceDirectDeploy: Type.Optional(Type.Boolean()),
  saltForProxyDeploy: Type.Optional(Type.String()),
  compilerOptions: Type.Optional(
    Type.Object({
      compilerType: Type.Enum(Type.Literal("solc"), Type.Literal("zksolc")),
      compilerVersion: Type.Optional(Type.String()),
      evmVersion: Type.Optional(Type.String()),
    }),
  ),
});
