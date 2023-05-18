import { Static, Type } from '@sinclair/typebox';
import { baseReplyErrorSchema, schemaTypes } from '../../../sharedApiSchemas';

/**
 * Basic schema for ERC20 - Normalize Request Query String
 */
export const normalizeRequestQuerySchema = Type.Object({
  amount: Type.String({
   description: 'Convert a number of tokens to a number of wei.',
   examples: ["100"]
  }),
});

export const getReplyBodySchema = Type.Object({
  result: Type.Optional(Type.Object({
    data: Type.String(),
  })),
  error: Type.Optional(baseReplyErrorSchema),
});

export interface normalizeAmountRouteSchema extends schemaTypes {
  Reply: Static<typeof getReplyBodySchema>;
  Querystring: Static<typeof normalizeRequestQuerySchema>;
}