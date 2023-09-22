import { Type, Static } from "@sinclair/typebox";

export const WalletNonceInput = Type.Object({
  address: Type.String(),
  chainId: Type.Number(),
  nonce: Type.Optional(Type.Number()),
});

export type WalletNonceInputType = Static<typeof WalletNonceInput>;
