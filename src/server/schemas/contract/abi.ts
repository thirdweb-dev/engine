import { Static, Type } from "@sinclair/typebox";

const AbiInternalTypeSchema = Type.String();

// Source: https://abitype.dev/api/types#abistatemutability
const AbiStateMutabilitySchema = Type.Union([
  Type.Literal("pure"),
  Type.Literal("view"),
  Type.Literal("nonpayable"),
  Type.Literal("payable"),
]);

// Source: https://abitype.dev/api/types#abiparameter
const AbiParameterSchema = Type.Union([
  Type.Object({
    type: Type.String(),
    name: Type.Optional(Type.String()),
    internalType: Type.Optional(AbiInternalTypeSchema),
  }),
  Type.Object({
    type: Type.Union([
      Type.Literal("tuple"),
      Type.RegExp(/^tuple\[\w+\]$/), // Matches `tuple[someString]`
    ]),
    name: Type.Optional(Type.String()),
    internalType: Type.Optional(AbiInternalTypeSchema),
    components: Type.Array(Type.Any()), // Reference to itself
  }),
]);

// Source: https://abitype.dev/api/types#abieventparameter
const AbiEventParameterSchema = Type.Intersect([
  AbiParameterSchema,
  Type.Object({
    indexed: Type.Optional(Type.Boolean()),
  }),
]);

// Source: https://abitype.dev/api/types#abifunction
export const AbiFunctionSchema = Type.Object({
  type: Type.Literal("function"),
  name: Type.String(),
  constant: Type.Optional(Type.Boolean()),
  gas: Type.Optional(Type.Number()),
  inputs: Type.Readonly(Type.Array(AbiParameterSchema)),
  outputs: Type.Readonly(Type.Array(AbiParameterSchema)),
  payable: Type.Optional(Type.Boolean()),
  stateMutability: AbiStateMutabilitySchema,
});

// Source: https://abitype.dev/api/types#abievent
export const AbiEventSchema = Type.Object({
  type: Type.Literal("event"),
  name: Type.String(),
  anonymous: Type.Optional(Type.Boolean()),
  inputs: Type.Readonly(Type.Array(AbiEventParameterSchema)),
});
type x = Static<typeof AbiEventSchema>;

// Source: https://abitype.dev/api/types#abierror
export const AbiErrorSchema = Type.Object({
  type: Type.Literal("error"),
  inputs: Type.Array(AbiParameterSchema),
  name: Type.String(),
});

// Source: https://abitype.dev/api/types#abiconstructor
export const AbiConstructorSchema = Type.Object({
  type: Type.Literal("constructor"),
  inputs: Type.Array(AbiParameterSchema),
  payable: Type.Optional(Type.Boolean()),
  stateMutability: Type.Union([
    Type.Literal("payable"),
    Type.Literal("nonpayable"),
  ]),
});

// Source: https://abitype.dev/api/types#abifallback
export const AbiFallbackSchema = Type.Object({
  type: Type.Literal("fallback"),
  payable: Type.Optional(Type.Boolean()),
  stateMutability: Type.Union([
    Type.Literal("payable"),
    Type.Literal("nonpayable"),
  ]),
});

// Source: https://abitype.dev/api/types#abireceive
export const AbiReceiveSchema = Type.Object({
  type: Type.Literal("receive"),
  stateMutability: Type.Literal("payable"),
});

// Source: https://abitype.dev/api/types#abi
export const AbiSchema = Type.Array(
  Type.Union([
    AbiConstructorSchema,
    AbiErrorSchema,
    AbiEventSchema,
    AbiFallbackSchema,
    AbiFunctionSchema,
    AbiReceiveSchema,
  ]),
);
