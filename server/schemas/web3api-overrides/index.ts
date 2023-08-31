import { Type } from "@sinclair/typebox";

export const web3APIOverridesForWriteRequest = Type.Object({
  web3api_overrides: Type.Optional(
    Type.Object({
      from: Type.Optional(
        Type.String({
          examples: ["0x..."],
          description: "Add Wallet Address",
        }),
      ),
      value: Type.Optional(
        Type.String({
          examples: ["0"],
          description: "Native Currency Value",
        }),
      ),
    }),
  ),
});
