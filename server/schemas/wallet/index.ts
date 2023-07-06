import { Type } from "@sinclair/typebox";

export const walletParamSchema = Type.Object({
  network: Type.String({
    examples: ["mumbai"],
    description: "Add Chain ID or Chain Name",
  }),
});
