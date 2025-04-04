import { Result } from "neverthrow";
import { getAddress } from "thirdweb";
import type { ValidationErr } from "../errors.js";

export const getAddressResult = (message?: string) =>
  Result.fromThrowable(getAddress, () => {
    return {
      kind: "validation",
      code: "invalid_address",
      status: 400,
      message,
    } as ValidationErr;
  });
