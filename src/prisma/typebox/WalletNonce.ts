import { Type, Static } from "@sinclair/typebox";

export const WalletNonce = Type.Object({
  address: Type.String(),
  chainId: Type.Number(),
  nonce: Type.Optional(Type.Number()),
});

export type WalletNonceType = Static<typeof WalletNonce>;
