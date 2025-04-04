import type { Permission } from "../../../db/types.js";

export type AuthContext = {
  Variables: {
    user?: {
      address: string;
      permissions: Permission[];
    };
    keypair?: {
      createdAt: Date;
      hash: string;
      label: string | null;
      updatedAt: Date;
      deletedAt: Date | null;
      publicKey: string;
      algorithm: "RS256" | "ES256" | "PS256";
    };
  };
};