import { Static, Type } from "@sinclair/typebox";
import { contractSchemaTypes } from "../../helpers/sharedApiSchemas";

/**
 * Basic schema for all Request Query String
 */
export const readRequestQuerySchema = Type.Object({
  function_name: Type.String({
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
  stateMutability: Type.Optional(Type.String()),
  components: Type.Optional(
    Type.Object({
      type: Type.Optional(Type.String()),
      name: Type.Optional(Type.String()),
    }),
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
  name: Type.String(),
  inputs: Type.Array(
    Type.Object({
      type: Type.String(),
      name: Type.String(),
      stateMutability: Type.Optional(Type.String()),
      components: Type.Optional(
        Type.Array(
          Type.Object({
            type: Type.String(),
            name: Type.String(),
          }),
        ),
      ),
    }),
  ),
});

export const contractEventSchema = Type.Record(Type.String(), Type.Any());
