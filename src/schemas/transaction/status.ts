import { Static, Type } from "@sinclair/typebox";
import { FastifySchema, RouteGenericInterface } from "fastify";
import { baseReplyErrorSchema, standardResponseSchema } from "../../helpers/sharedApiSchemas";

const txStatusRequestParamSchema = Type.Object({
  tx_queue_id: Type.String({
    description: "Transaction Queue ID",
    examples: ["9eb88b00-f04f-409b-9df7-7dcc9003bc35"],
  }),
});

export const txStatusReplyBodySchema = Type.Object({
  result: Type.Object({
    tx_queue_id: Type.String(),
    txprocessed: Type.Boolean(),
    txsubmitted: Type.Boolean(),
    txerrored: Type.Boolean(),
    txmined: Type.Boolean(),
  }),
  error: Type.Optional(baseReplyErrorSchema),
});

export interface txStatusSchema extends RouteGenericInterface {
  Params: Static<typeof txStatusRequestParamSchema>;
  Reply: Static<typeof txStatusReplyBodySchema>;
}

export const txStatusRouteSchema: FastifySchema = {
  params: txStatusRequestParamSchema,
  response: standardResponseSchema,
};

export interface TransactionStatusSchema {
  txprocessed: boolean;
  txsubmitted: boolean;
  txerrored: boolean;
  txmined: boolean;
}