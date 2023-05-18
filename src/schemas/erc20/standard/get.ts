import { Static, Type } from '@sinclair/typebox';
import { schemaTypes, baseReplyErrorSchema } from '../../../sharedApiSchemas';

export const getReplyBodySchema = Type.Object({
  result: Type.Optional(Type.Object({
    data: Type.Object({
      "name": Type.String(),
      "symbol": Type.String(),
      "decimals": Type.String(),
    }),
  })),
  error: Type.Optional(baseReplyErrorSchema),
});

export interface getRouteSchema extends schemaTypes {
  Reply: Static<typeof getReplyBodySchema>
}