import { Static, Type } from '@sinclair/typebox';
import { baseReplyErrorSchema, schemaTypes } from '../../../helpers/sharedApiSchemas';

/**
 * Basic schema for ERC20 - BalanceOf Request Query String
 */
export const balanceOfRequestQuerySchema = Type.Object({
  wallet_address: Type.String({
    description: 'Address of the wallet to check token balance',
    examples: ["0x1946267d81Fb8aDeeEa28e6B98bcD446c8248473"]
  }),
});

export interface balanceOfRouteSchema extends schemaTypes {
  Querystring: Static<typeof balanceOfRequestQuerySchema>;
}

export const balanceOfReplyBodySchema = Type.Object({
  result: Type.Optional(Type.Object({
    data: Type.Object({
      "name": Type.String(),
      "symbol": Type.String(),
      "decimals": Type.String(),
      "value": Type.String({
        description: "Balance Value"
      }),
      "displayValue": Type.String()
    }),
  })),
  error: Type.Optional(baseReplyErrorSchema),
});