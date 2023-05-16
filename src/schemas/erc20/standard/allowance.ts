import { Static, Type } from '@sinclair/typebox';
import { baseReplyErrorSchema, schemaTypes } from '../../../sharedApiSchemas';

/**
 * Basic schema for ERC20 - Allowance Request Query String
 */
export const allowanceRequestQuerySchema = Type.Object({
  spender_wallet: Type.String({
    description: 'Address of the wallet to check token allowance',
    examples: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"]
  }),
});

export interface allowanceRouteSchema extends schemaTypes {
  Querystring: Static<typeof allowanceRequestQuerySchema>;
}

export const allowanceReplyBodySchema = Type.Object({
  result: Type.Optional(Type.Object({
    data: Type.Object({
      "name": Type.String(),
      "symbol": Type.String(),
      "decimals": Type.String(),
      "value": Type.String({
        description: "Allowance Value"
      }),
      "displayValue": Type.String()
    }),
  })),
  error: baseReplyErrorSchema,
});