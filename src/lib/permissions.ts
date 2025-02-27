import { err, ok, okAsync, ResultAsync } from "neverthrow";
import type { Permission, PermissionDbEntry } from "../db/types";
import type { Address } from "thirdweb";
import {
  mapDbError,
  type AuthErr,
  type DbErr,
  type PermissionsErr,
  type ValidationErr,
} from "./errors";
import { getAddressResult } from "./validation/address";
import { db } from "../db/connection";
import { LRUCache } from "lru-cache";
import { adminAccount } from "./admin-account";

const permissionCache = new LRUCache<string, PermissionDbEntry>({
  max: 1024,
});

export function getPermissions(
  address: Address
): ResultAsync<PermissionDbEntry, DbErr | PermissionsErr> {
  const cached = permissionCache.get(address);
  if (cached) {
    return okAsync(cached);
  }

  return ResultAsync.fromPromise(
    db.query.permissions.findFirst({
      where: (permissions, { eq }) => eq(permissions.accountAddress, address),
    }),
    mapDbError
  )
    .andTee((permission) => {
      permission && permissionCache.set(address, permission);
    })
    .andThen((permission) =>
      permission
        ? ok(permission)
        : err({
            kind: "permissions",
            code: "no_permissions",
            status: 400,
          } as PermissionsErr)
    );
}

export function checkPermissions({
  address: rawAddress,
  allowedPermissions,
}: {
  address: string;
  allowedPermissions: Permission[];
}): ResultAsync<
  { address: Address; permissions: Permission },
  AuthErr | ValidationErr | DbErr
> {
  return getAddressResult("Invalid User Address")(rawAddress)
    .asyncAndThen((address) => {
      if (address === adminAccount.address) {
        return okAsync({
          accountAddress: address,
          permissions: "ADMIN" as const,
          label: "Admin",
        });
      }
      return getPermissions(address);
    })
    .mapErr((error) => {
      if (error.kind === "permissions") {
        return {
          kind: "auth",
          code: "insufficient_permissions",
          status: 401,
        } as AuthErr;
      }
      return error;
    })
    .andThen(({ accountAddress, permissions }) => {
      return allowedPermissions.includes(permissions)
        ? ok({ address: accountAddress, permissions })
        : err({
            kind: "auth",
            code: "insufficient_permissions",
            status: 401,
          } as const);
    });
}
