import { Static, Type } from "@sinclair/typebox";
import {
  baseReplyErrorSchema,
  contractSchemaTypes,
} from "../../../sharedApiSchemas";

/**
 * Basic schema for ERC20 - AllowanceOf Request Query String
 */
export const allowanceOfRequestQuerySchema = Type.Object({
  owner_wallet: Type.String({
    description: "Address of the wallet who owns the funds",
    examples: ["0x3EcDBF3B911d0e9052b64850693888b008e18373"],
  }),
  spender_wallet: Type.String({
    description: "Address of the wallet to check token allowance",
    examples: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"],
  }),
});

export interface allowanceOfRouteSchema extends contractSchemaTypes {
  Querystring: Static<typeof allowanceOfRequestQuerySchema>;
}

export const allowanceOfReplyBodySchema = Type.Object({
  result: Type.Optional(
    Type.Object({
      data: Type.Object({
        name: Type.String(),
        symbol: Type.String(),
        decimals: Type.String(),
        value: Type.String({
          description: "Allowance Value",
        }),
        displayValue: Type.String(),
      }),
    }),
  ),
  error: Type.Optional(baseReplyErrorSchema),
});
