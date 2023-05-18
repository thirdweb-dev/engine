import { Type } from '@sinclair/typebox';
import { baseReplyErrorSchema } from '../../../sharedApiSchemas';

export const balanceReplyBodySchema = Type.Object({
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