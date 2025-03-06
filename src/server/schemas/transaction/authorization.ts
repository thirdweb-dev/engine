import { type Static, Type } from "@sinclair/typebox";
import { AddressSchema } from "../address";
import { requiredAddress } from "../wallet";
import { requiredBigInt } from "../../../shared/utils/primitive-types";

export const authorizationSchema = Type.Object({
  address: AddressSchema,
  chainId: Type.Integer(),
  nonce: Type.String(),
  r: Type.String(),
  s: Type.String(),
  yParity: Type.Number(),
});

export const authorizationListSchema = Type.Optional(
  Type.Array(authorizationSchema),
);

export const toParsedAuthorization = (
  authorization: Static<typeof authorizationSchema>,
) => {
  return {
    address: requiredAddress(authorization.address, "[Authorization List]"),
    chainId: authorization.chainId,
    nonce: requiredBigInt(authorization.nonce, "[Authorization List] -> nonce"),
    r: requiredBigInt(authorization.r, "[Authorization List] -> r"),
    s: requiredBigInt(authorization.s, "[Authorization List] -> s"),
    yParity: authorization.yParity,
  };
};
