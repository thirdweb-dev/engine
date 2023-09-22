import { Type, Static } from "@sinclair/typebox";

export const TransactionTypeConst = {
  TRANSACTION: Type.Literal("TRANSACTION"),
  USER_OPERATION: Type.Literal("USER_OPERATION"),
};

export const TransactionType = Type.KeyOf(Type.Object(TransactionTypeConst));

export type TransactionTypeType = Static<typeof TransactionType>;
