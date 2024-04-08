import { Json, User, authenticateJWT, parseJWT } from "@thirdweb-dev/auth";
import {
  ThirdwebAuth,
  ThirdwebAuthUser,
  getToken as getJWT,
} from "@thirdweb-dev/auth/fastify";
import { GenericAuthWallet } from "@thirdweb-dev/wallets";
import { AsyncWallet } from "@thirdweb-dev/wallets/evm/wallets/async";
import { utils } from "ethers";
import { FastifyInstance } from "fastify";
import { FastifyRequest } from "fastify/types/request";
import { validate as uuidValidate } from "uuid";
import { getPermissions } from "../../db/permissions/getPermissions";
import { createToken } from "../../db/tokens/createToken";
import { revokeToken } from "../../db/tokens/revokeToken";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { getAccessToken } from "../../utils/cache/accessToken";
import { getAuthWallet } from "../../utils/cache/authWallet";
import { getConfig } from "../../utils/cache/getConfig";
import { getWebhook } from "../../utils/cache/getWebhook";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";
import { sendWebhookRequest } from "../../utils/webhook";
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
      options: {
        secretKey: env.THIRDWEB_API_SECRET_KEY,
      },
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
  const config = await getConfig();

  // Configure the ThirdwebAuth fastify plugin
  const { authRouter, authMiddleware, getUser } = ThirdwebAuth<
    TAuthData,
    TAuthSession
  >({
    // TODO: Domain needs to be pulled from config as well
    domain: config.authDomain,
    // We use an async wallet here to load wallet from config every time
    wallet: new AsyncWallet({
      getSigner: async () => {
        const authWallet = await getAuthWallet();
        return authWallet.getSigner();
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
          logger({
            service: "worker",
            level: "error",
            message: `[Auth] Failed to revoke token ${payload.jti}`,
          });
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
<<<<<<< HEAD
    if (
      req.url === "/favicon.ico" ||
      req.url === "/" ||
      req.url === "/health" ||
      req.url === "/static" ||
      req.url === "/json" ||
      req.url.startsWith("/auth/payload") ||
      req.url.startsWith("/auth/login") ||
      req.url.startsWith("/auth/user") ||
      req.url.startsWith("/auth/switch-account") ||
      req.url.startsWith("/auth/logout") ||
      req.url.startsWith("/transaction/status")
    ) {
      // We skip auth check for static endpoints and auth routes
      return;
    }

    if (
      req.url.startsWith("/relayer/") &&
      req.method === "POST" &&
      !req.url.startsWith("/relayer/create") &&
      !req.url.startsWith("/relayer/revoke") &&
      !req.url.startsWith("/relayer/update")
    ) {
      // Relayer endpoints can handle their own authentication
      return;
    }

    if (
      req.url.startsWith("/bundler/") &&
      req.method === "POST" &&
      !req.url.startsWith("/bundler/create") &&
      !req.url.startsWith("/bundler/revoke") &&
      !req.url.startsWith("/bundler/update")
    ) {
      // Bundler endpoints can handle their own authentication
      return;
    }

    // TODO: Enable authentication check for websocket requests
    if (
      req.headers.upgrade &&
      req.headers.upgrade.toLowerCase() === "websocket"
    ) {
      return;
    }

=======
>>>>>>> main
    try {
      const { isAuthed, user } = await onRequest({ req, getUser });
      if (isAuthed) {
        if (user) {
          req.user = user;
        }
        // Allow this request to proceed.
        return;
      }
    } catch (err: any) {
      logger({
        service: "server",
        level: "warn",
        message: "Error authenticating user",
        error: err,
      });
    }

    // Return 401 if:
    // - There was an error authenticating this request.
    // - No auth credentials were provided.
    // - The auth credentials were invalid or revoked.
    return res.status(401).send({
      error: "Unauthorized",
      message:
        "Please provide a valid access token or other authentication. See: https://portal.thirdweb.com/engine/features/permissions",
    });
  });
};

export const onRequest = async ({
  req,
  getUser,
}: {
  req: FastifyRequest;
  getUser: ReturnType<typeof ThirdwebAuth<TAuthData, TAuthSession>>["getUser"];
}): Promise<{
  isAuthed: boolean;
  user?: ThirdwebAuthUser<TAuthData, TAuthSession>;
}> => {
  if (
    req.url === "/favicon.ico" ||
    req.url === "/" ||
    req.url === "/system/health" ||
    req.url === "/json" ||
    req.url.startsWith("/auth/payload") ||
    req.url.startsWith("/auth/login") ||
    req.url.startsWith("/auth/user") ||
    req.url.startsWith("/auth/switch-account") ||
    req.url.startsWith("/auth/logout") ||
    req.url.startsWith("/transaction/status")
  ) {
    // Skip auth check for static endpoints and Thirdweb Auth routes.
    return { isAuthed: true };
  }

  if (req.method === "POST" && req.url.startsWith("/relayer/")) {
    const relayerId = req.url.slice("/relayer/".length);
    if (uuidValidate(relayerId)) {
      // The "relay transaction" endpoint handles its own authentication.
      return { isAuthed: true };
    }
  }

  // Handle websocket request: auth via access token
  // Allow a request that provides a non-revoked access token for an owner/admin.
  if (
    req.headers.upgrade &&
    req.headers.upgrade.toLowerCase() === "websocket"
  ) {
    const { token: jwt } = req.query as { token: string };

    const token = await getAccessToken({ jwt });
    if (token && token.revokedAt === null) {
      // Set as a header for `getUsers` to parse the token.
      req.headers.authorization = `Bearer ${jwt}`;
      const user = await getUser(req);
      if (
        user?.session?.permissions === Permission.Owner ||
        user?.session?.permissions === Permission.Admin
      ) {
        return { isAuthed: true, user };
      }
    }

    // Destroy the websocket connection.
    req.raw.socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    req.raw.socket.destroy();
    return { isAuthed: false };
  }

  try {
    const jwt = getJWT(req);
    if (jwt) {
      // Auth via access token
      // Allow a request that provides a non-revoked access token for an owner/admin.
      const token = await getAccessToken({ jwt });
      if (token && token.revokedAt === null) {
        const user = await getUser(req);
        if (
          user?.session?.permissions === Permission.Owner ||
          user?.session?.permissions === Permission.Admin
        ) {
          return { isAuthed: true, user };
        }
      }

      // Auth via dashboard
      // Allow a request that provides a dashboard JWT.
      const user =
        (await authWithApiServer(jwt, "thirdweb.com")) ||
        (await authWithApiServer(jwt, "thirdweb-preview.com"));
      if (user) {
        const res = await getPermissions({ walletAddress: user.address });
        if (
          res?.permissions === Permission.Owner ||
          res?.permissions === Permission.Admin
        ) {
          return {
            isAuthed: true,
            user: {
              address: user.address,
              session: {
                permissions: res.permissions,
              },
            },
          };
        }
      }
    }
  } catch {
    // This throws if no JWT is provided. Continue to check other auth mechanisms.
  }

  // Auth via thirdweb secret key
  // Allow a request that provides the thirdweb secret key used to init Engine.
  const thirdwebApiSecretKey = req.headers.authorization?.split(" ")[1];
  if (thirdwebApiSecretKey === env.THIRDWEB_API_SECRET_KEY) {
    const authWallet = await getAuthWallet();
    return {
      isAuthed: true,
      user: {
        address: await authWallet.getAddress(),
        session: {
          permissions: Permission.Admin,
        },
      },
    };
  }

  // Auth via auth webhooks
  // Allow a request if it satisfies all configured auth webhooks.
  // Must have at least one auth webhook.
  const authWebhooks = await getWebhook(WebhooksEventTypes.AUTH);
  if (authWebhooks.length > 0) {
    const authResponses = await Promise.all(
      authWebhooks.map((webhook) =>
        sendWebhookRequest(webhook, {
          url: req.url,
          method: req.method,
          headers: req.headers,
          params: req.params,
          query: req.query,
          cookies: req.cookies,
          body: req.body,
        }),
      ),
    );

    if (authResponses.every((ok) => !!ok)) {
      return { isAuthed: true };
    }
  }

  return { isAuthed: false };
};
