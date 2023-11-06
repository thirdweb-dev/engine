import { Json, User, authenticateJWT, parseJWT } from "@thirdweb-dev/auth";
import {
  ThirdwebAuth,
  ThirdwebAuthUser,
  getToken as getJWT,
} from "@thirdweb-dev/auth/fastify";
import { GenericAuthWallet, LocalWallet } from "@thirdweb-dev/wallets";
import { AsyncWallet } from "@thirdweb-dev/wallets/evm/wallets/async";
import { utils } from "ethers";
import { FastifyInstance } from "fastify";
import { getConfiguration } from "../../db/configuration/getConfiguration";
import { updateConfiguration } from "../../db/configuration/updateConfiguration";
import { getPermissions } from "../../db/permissions/getPermissions";
import { createToken } from "../../db/tokens/createToken";
import { getToken } from "../../db/tokens/getToken";
import { revokeToken } from "../../db/tokens/revokeToken";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";
import { Permission } from "../schemas/auth";

export type TAuthData = never;
export type TAuthSession = { permissions: string };

declare module "fastify" {
  interface FastifyRequest {
    user: ThirdwebAuthUser<TAuthData, TAuthSession>;
  }
}

const authWithApiServer = async (jwt: string, domain: string) => {
  let user: User<Json> | null = null;
  try {
    user = await authenticateJWT({
      wallet: {
        type: "evm",
        getAddress: async () => "0x016757dDf2Ab6a998a4729A80a091308d9059E17",
        verifySignature: async (
          message: string,
          signature: string,
          address: string,
        ) => {
          try {
            const messageHash = utils.hashMessage(message);
            const messageHashBytes = utils.arrayify(messageHash);
            const recoveredAddress = utils.recoverAddress(
              messageHashBytes,
              signature,
            );

            if (recoveredAddress === address) {
              return true;
            }
          } catch {
            // no-op
          }

          return false;
        },
      } as GenericAuthWallet,
      jwt,
      options: {
        domain,
      },
    });
  } catch {
    // no-op
  }

  return user;
};

export const withAuth = async (server: FastifyInstance) => {
  const config = await getConfiguration();

  // Configure the ThirdwebAuth fastify plugin
  const { authRouter, authMiddleware, getUser } = ThirdwebAuth<
    TAuthData,
    TAuthSession
  >({
    // TODO: Domain needs to be pulled from config as well
    domain: config.authDomain,
    // We use an async wallet here to load wallet from config every time
    wallet: new AsyncWallet({
      // TODO: Use caching for the signer
      getSigner: async () => {
        const config = await getConfiguration();
        const wallet = new LocalWallet();

        try {
          // First, we try to load the wallet with the encryption password
          await wallet.import({
            encryptedJson: config.authWalletEncryptedJson,
            password: env.ENCRYPTION_PASSWORD,
          });
        } catch {
          // If that fails, we try to load the wallet with the secret key
          await wallet.import({
            encryptedJson: config.authWalletEncryptedJson,
            password: env.THIRDWEB_API_SECRET_KEY,
          });

          // And then update the auth wallet to use encryption password instead
          const encryptedJson = await wallet.export({
            strategy: "encryptedJson",
            password: env.ENCRYPTION_PASSWORD,
          });

          logger.worker.info(
            `[Encryption] Updating authWalletEncryptedJson to use ENCRYPTION_PASSWORD`,
          );
          await updateConfiguration({
            authWalletEncryptedJson: encryptedJson,
          });
        }

        return wallet.getSigner();
      },
      cacheSigner: false,
    }),
    callbacks: {
      onLogin: async (walletAddress) => {
        // When a user logs in, we check for their permissions in the database
        const res = await getPermissions({ walletAddress });

        // And we add their permissions as a scope to their JWT
        return {
          // TODO: Replace with default permissions
          permissions: res?.permissions || "none",
        };
      },
      onToken: async (jwt) => {
        // When a new JWT is generated, we save it in the database
        await createToken({ jwt, isAccessToken: false });
      },
      onLogout: async (_, req) => {
        const jwt = getJWT(req);
        if (!jwt) {
          return;
        }

        const { payload } = parseJWT(jwt);

        try {
          await revokeToken({ id: payload.jti });
        } catch {
          logger.worker.error(`[Auth] Failed to revoke token ${payload.jti}`);
        }
      },
    },
  });

  // Setup the auth router and auth middleware
  await server.register(authRouter, { prefix: "/auth" });
  await server.register(authMiddleware);

  // Decorate the request with a null user
  server.decorateRequest("user", null);

  // Add auth validation middleware to check for authenticated requests
  server.addHook("onRequest", async (req, res) => {
    if (
      req.url === "/favicon.ico" ||
      req.url === "/" ||
      req.url === "/health" ||
      req.url.startsWith("/static") ||
      req.url.startsWith("/json") ||
      req.url.includes("/auth/payload") ||
      req.url.includes("/auth/login") ||
      req.url.includes("/auth/user") ||
      req.url.includes("/auth/switch-account") ||
      req.url.includes("/auth/logout") ||
      req.url.includes("/transaction/status")
    ) {
      // We skip auth check for static endpoints and auth routes
      return;
    }

    if (
      req.url.includes("/relayer") &&
      !req.url.includes("/create") &&
      !req.url.includes("/revoke")
    ) {
      // Relayer endpoints can handle their own authentication
      return;
    }

    // TODO: Enable authentication check for websocket requests
    if (
      req.headers.upgrade &&
      req.headers.upgrade.toLowerCase() === "websocket"
    ) {
      return;
    }

    // If we have a valid secret key, skip authentication check
    const thirdwebApiSecretKey = req.headers.authorization?.split(" ")[1];
    if (thirdwebApiSecretKey === env.THIRDWEB_API_SECRET_KEY) {
      // If the secret key is being used, treat the user as the auth wallet
      const config = await getConfiguration();
      const wallet = new LocalWallet();
      await wallet.import({
        encryptedJson: config.authWalletEncryptedJson,
        password: env.THIRDWEB_API_SECRET_KEY,
      });

      req.user = {
        address: await wallet.getAddress(),
        session: {
          permissions: Permission.Admin,
        },
      };
      return;
    }

    // Otherwise, check for an authenticated user
    const jwt = getJWT(req);
    if (jwt) {
      // 1. Check if the token is a valid engine JWT
      const token = await getToken({ jwt });

      // First, we ensure that the token hasn't been revoked
      if (token?.revokedAt === null) {
        // Then we perform our standard auth checks for the user
        const user = await getUser(req);

        // Ensure that the token user is an admin or owner
        if (
          (user && user?.session?.permissions === Permission.Owner) ||
          user?.session?.permissions === Permission.Admin
        ) {
          req.user = user;
          return;
        }
      }

      // 2. Otherwise, check if the token is a valid api-server JWT
      const user =
        (await authWithApiServer(jwt, "thirdweb.com")) ||
        (await authWithApiServer(jwt, "thirdweb-preview.com"));

      // If we have an api-server user, return it with the proper permissions
      if (user) {
        const res = await getPermissions({ walletAddress: user.address });

        if (
          res?.permissions === Permission.Owner ||
          res?.permissions === Permission.Admin
        ) {
          req.user = {
            address: user.address,
            session: {
              permissions: res.permissions,
            },
          };
          return;
        }
      }
    }

    // If we have no secret key or authenticated user, return 401
    return res.status(401).send({
      error: "Unauthorized",
      message: "Please provide a valid secret key or JWT",
    });
  });
};
