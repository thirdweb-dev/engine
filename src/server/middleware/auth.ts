import { parseJWT } from "@thirdweb-dev/auth";
import {
  ThirdwebAuth,
  ThirdwebAuthUser,
  getToken as getJWT,
} from "@thirdweb-dev/auth/fastify";
import { AsyncWallet } from "@thirdweb-dev/wallets/evm/wallets/async";
import { FastifyInstance } from "fastify";
import { FastifyRequest } from "fastify/types/request";
import jsonwebtoken from "jsonwebtoken";
import { validate as uuidValidate } from "uuid";
import { getPermissions } from "../../db/permissions/getPermissions";
import { createToken } from "../../db/tokens/createToken";
import { revokeToken } from "../../db/tokens/revokeToken";
import { WebhooksEventTypes } from "../../schema/webhooks";
import { THIRDWEB_DASHBOARD_ISSUER, handleSiwe } from "../../utils/auth";
import { getAccessToken } from "../../utils/cache/accessToken";
import { getAuthWallet } from "../../utils/cache/authWallet";
import { getConfig } from "../../utils/cache/getConfig";
import { getWebhooksByEventType } from "../../utils/cache/getWebhook";
import { getKeypair } from "../../utils/cache/keypair";
import { env } from "../../utils/env";
import { logger } from "../../utils/logger";
import { sendWebhookRequest } from "../../utils/webhook";
import { Permission } from "../schemas/auth";

export type TAuthData = never;
export type TAuthSession = { permissions: string };

interface AuthResponse {
  isAuthed: boolean;
  user?: ThirdwebAuthUser<TAuthData, TAuthSession>;
  // If error is provided, return an error immediately.
  error?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user: ThirdwebAuthUser<TAuthData, TAuthSession>;
  }
}

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
    let message =
      "Please provide a valid access token or other authentication. See: https://portal.thirdweb.com/engine/features/access-tokens";

    try {
      const { isAuthed, user, error } = await onRequest({ req, getUser });
      if (isAuthed) {
        if (user) {
          req.user = user;
        }
        // Allow this request to proceed.
        return;
      } else if (error) {
        message = error;
      }
    } catch (err: any) {
      logger({
        service: "server",
        level: "warn",
        message: "Error authenticating user",
        error: err,
      });
    }

    return res.status(401).send({
      error: "Unauthorized",
      message,
    });
  });
};

export const onRequest = async ({
  req,
  getUser,
}: {
  req: FastifyRequest;
  getUser: ReturnType<typeof ThirdwebAuth<TAuthData, TAuthSession>>["getUser"];
}): Promise<AuthResponse> => {
  // Handle websocket auth separately.
  if (req.headers.upgrade?.toLowerCase() === "websocket") {
    return handleWebsocketAuth(req, getUser);
  }

  const publicRoutesResp = handlePublicEndpoints(req);
  if (publicRoutesResp.isAuthed) {
    return publicRoutesResp;
  }

  const jwt = getJWT(req);
  if (jwt) {
    const payload = jsonwebtoken.decode(jwt, { json: true });

    // The `iss` field determines the auth type.
    if (payload?.iss) {
      const authWallet = await getAuthWallet();
      if (payload.iss === (await authWallet.getAddress())) {
        return await handleAccessToken(jwt, req, getUser);
      } else if (payload.iss === THIRDWEB_DASHBOARD_ISSUER) {
        return await handleDashboardAuth(jwt);
      } else {
        return await handleKeypairAuth(jwt, payload.iss);
      }
    }
  }

  const secretKeyResp = await handleSecretKey(req);
  if (secretKeyResp.isAuthed) {
    return secretKeyResp;
  }

  const authWebhooksResp = await handleAuthWebhooks(req);
  if (authWebhooksResp.isAuthed) {
    return authWebhooksResp;
  }

  // Unauthorized: no auth patterns matched.
  return { isAuthed: false };
};

/**
 * Handles unauthed routes.
 * @param req FastifyRequest
 * @returns AuthResponse
 */
const handlePublicEndpoints = (req: FastifyRequest): AuthResponse => {
  if (req.method === "GET") {
    if (
      req.url === "/favicon.ico" ||
      req.url === "/" ||
      req.url === "/system/health" ||
      req.url === "/json" ||
      req.url.startsWith("/auth/user") ||
      req.url.startsWith("/transaction/status")
    ) {
      return { isAuthed: true };
    }
  } else if (req.method === "POST") {
    if (
      req.url.startsWith("/auth/payload") ||
      req.url.startsWith("/auth/login") ||
      req.url.startsWith("/auth/switch-account") ||
      req.url.startsWith("/auth/logout")
    ) {
      return { isAuthed: true };
    }

    if (req.url.startsWith("/relayer/")) {
      const relayerId = req.url.slice("/relayer/".length);
      if (uuidValidate(relayerId)) {
        // "Relay transaction" endpoint which handles its own authentication.
        return { isAuthed: true };
      }
    }
  }

  return { isAuthed: false };
};

/**
 * Handle websocket request: auth via access token
 * Allow a request that provides a non-revoked access token for an owner/admin
 * Handle websocket auth separately.
 * @param req FastifyRequest
 * @param getUser
 * @returns AuthResponse
 * @async
 */
const handleWebsocketAuth = async (
  req: FastifyRequest,
  getUser: ReturnType<typeof ThirdwebAuth<TAuthData, TAuthSession>>["getUser"],
): Promise<AuthResponse> => {
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
};

/**
 * Auth via keypair.
 * Allow a request that provides a JWT signed by an ES256 private key
 * matching the configured public key.
 * @param req FastifyRequest
 * @returns AuthResponse
 */
const handleKeypairAuth = async (
  jwt: string,
  iss: string,
): Promise<AuthResponse> => {
  // The keypair auth feature must be explicitly enabled.
  if (!env.ENABLE_KEYPAIR_AUTH) {
    return { isAuthed: false };
  }

  let error: string | undefined;
  try {
    const keypair = await getKeypair({ publicKey: iss });
    if (!keypair || keypair.publicKey !== iss) {
      error = "The provided public key is incorrect or not added to Engine.";
      throw error;
    }

    // The JWT is valid if `verify` did not throw.
    jsonwebtoken.verify(jwt, keypair.publicKey, {
      algorithms: [keypair.algorithm as jsonwebtoken.Algorithm],
    }) as jsonwebtoken.JwtPayload;

    return { isAuthed: true };
  } catch (e) {
    if (e instanceof jsonwebtoken.TokenExpiredError) {
      error = "Keypair token is expired.";
    } else if (!error) {
      // Default error.
      error =
        'Error parsing "Authorization" header. See: https://portal.thirdweb.com/engine/features/access-tokens';
    }
  }

  return { isAuthed: false, error };
};

/**
 * Auth via access token.
 * Allow a request that provides a non-revoked access token for an owner/admin.
 * @param jwt string
 * @param req FastifyRequest
 * @param getUser
 * @returns AuthResponse
 * @async
 */
const handleAccessToken = async (
  jwt: string,
  req: FastifyRequest,
  getUser: ReturnType<typeof ThirdwebAuth<TAuthData, TAuthSession>>["getUser"],
): Promise<AuthResponse> => {
  try {
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
  } catch (e) {
    // Missing or invalid signature. This will occur if the JWT not intended for this auth pattern.
  }

  return { isAuthed: false };
};

/**
 * Auth via dashboard.
 * Allow a request that provides a dashboard JWT.
 * @param jwt string
 * @returns AuthResponse
 * @async
 */
const handleDashboardAuth = async (jwt: string): Promise<AuthResponse> => {
  const user =
    (await handleSiwe(jwt, "thirdweb.com", THIRDWEB_DASHBOARD_ISSUER)) ||
    (await handleSiwe(jwt, "thirdweb-preview.com", THIRDWEB_DASHBOARD_ISSUER));
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

  return { isAuthed: false };
};

/**
 * Auth via thirdweb secret key.
 * Allow a request that provides the thirdweb secret key used to init Engine.
 *
 * @param req FastifyRequest
 * @returns
 */
const handleSecretKey = async (req: FastifyRequest): Promise<AuthResponse> => {
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

  return { isAuthed: false };
};

/**
 * Auth via auth webhooks
 * Allow a request if it satisfies all configured auth webhooks.
 * Must have at least one auth webhook.
 * @param req FastifyRequest
 * @returns AuthResponse
 * @async
 */
const handleAuthWebhooks = async (
  req: FastifyRequest,
): Promise<AuthResponse> => {
  const authWebhooks = await getWebhooksByEventType(WebhooksEventTypes.AUTH);
  if (authWebhooks.length > 0) {
    const authResponses = await Promise.all(
      authWebhooks.map(async (webhook) => {
        const { ok } = await sendWebhookRequest(webhook, {
          url: req.url,
          method: req.method,
          headers: req.headers,
          params: req.params,
          query: req.query,
          cookies: req.cookies,
          body: req.body,
        });
        return ok;
      }),
    );

    if (authResponses.every((ok) => !!ok)) {
      return { isAuthed: true };
    }
  }

  return { isAuthed: false };
};
