import { Static, Type } from '@sinclair/typebox';
import { schemaTypes } from '../../../sharedApiSchemas';

/**
 * Basic schema for ERC20 - Transfer Request Query String
 */
export const transferRequestQuerySchema = Type.Object({
  to_address: Type.String({
    description: 'Address of the wallet you want to send the tokens to',
    examples: ["0x3EcDBF3B911d0e9052b64850693888b008e18373"]
  }),
  amount: Type.String({
   description: 'The amount of tokens you want to send',
   examples: ["0.1"]
  }),
});

export interface transferRouteSchema extends schemaTypes {
  Querystring: Static<typeof transferRequestQuerySchema>;
}