import { parseJWT } from "@thirdweb-dev/auth";
import {
  ThirdwebAuth,
  getToken as getJWT,
  type ThirdwebAuthUser,
} from "@thirdweb-dev/auth/fastify";
import { AsyncWallet } from "@thirdweb-dev/wallets/evm/wallets/async";
import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { FastifyRequest } from "fastify/types/request";
import jsonwebtoken, { type JwtPayload } from "jsonwebtoken";
import { validate as uuidValidate } from "uuid";
import { getPermissions } from "../../shared/db/permissions/get-permissions";
import { createToken } from "../../shared/db/tokens/create-token";
import { revokeToken } from "../../shared/db/tokens/revoke-token";
import { WebhooksEventTypes } from "../../shared/schemas/webhooks";
import { THIRDWEB_DASHBOARD_ISSUER, handleSiwe } from "../../shared/utils/auth";
import { getAccessToken } from "../../shared/utils/cache/access-token";
import { getAuthWallet } from "../../shared/utils/cache/auth-wallet";
import { getConfig } from "../../shared/utils/cache/get-config";
import { getWebhooksByEventType } from "../../shared/utils/cache/get-webhook";
import { getKeypair } from "../../shared/utils/cache/keypair";
import { env } from "../../shared/utils/env";
import { logger } from "../../shared/utils/logger";
import { sendWebhookRequest } from "../../shared/utils/webhook";
import { Permission } from "../../shared/schemas/auth";
import { ADMIN_QUEUES_BASEPATH } from "./admin-routes";
import { OPENAPI_ROUTES } from "./open-api";
import { StatusCodes } from "http-status-codes";

type TAuthData = never;
type TAuthSession = { permissions: string };

export type AuthenticationType =
  | "public"
  | "dashboard"
  | "access-token"
  | "secret-key"
  /** @deprecated */
  | "webhook"
  /** @deprecated */
  | "websocket"
  | "lite";
const ALLOWED_AUTHENTICATION_TYPES =
  env.ENGINE_MODE === "lite"
    ? new Set<AuthenticationType>(["dashboard", "lite"])
    : new Set<AuthenticationType>([
        "dashboard",
        "access-token",
        "webhook",
        "websocket",
      ]);

type AuthResponse = {
  isAuthed: boolean;
  // If error is provided, return an error immediately.
  error?: string;
};

// Store metadata about the authenticated request on the request object.
declare module "fastify" {
  interface FastifyRequest {
    authentication:
      | {
          type: "dashboard" | "access-token" | "secret-key";
          user: ThirdwebAuthUser<TAuthData, TAuthSession>;
        }
      | {
          type: "lite";
          thirdwebSecretKey: string;
          litePassword: string;
        };
  }
}

export async function withAuth(server: FastifyInstance) {
  // All endpoints in sandbox mode are unauthed.
  if (env.ENGINE_MODE === "sandbox") {
    return;
  }

  const config = await getConfig();

  const { authRouter, authMiddleware, getUser } = ThirdwebAuth<
    TAuthData,
    TAuthSession
  >({
    domain: config.authDomain,
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
            service: "server",
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
  // Note: in the onRequest hook, request.body will always be undefined, because the body parsing happens before the preValidation hook.
  // https://fastify.dev/docs/latest/Reference/Hooks/#onrequest
  server.addHook("preValidation", async (req, res) => {
    try {
      const authResponse = await onRequest({ req, getUser });
      if (authResponse.isAuthed) {
        return;
      }
      if (authResponse.error) {
        return res.status(StatusCodes.UNAUTHORIZED).send({
          error: "UNAUTHORIZED",
          message: authResponse.error,
        });
      }
    } catch (error) {
      logger({
        service: "server",
        level: "warn",
        message: "Error authenticating user",
        error,
      });
    }

    return res.status(StatusCodes.UNAUTHORIZED).send({
      error: "UNAUTHORIZED",
      message:
        "Please provide a valid access token. See: https://portal.thirdweb.com/engine/features/access-tokens",
    });
  });
}

async function onRequest({
  req,
  getUser,
}: {
  req: FastifyRequest;
  getUser: ReturnType<typeof ThirdwebAuth<TAuthData, TAuthSession>>["getUser"];
}): Promise<AuthResponse> {
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
    const decoded = jsonwebtoken.decode(jwt, { complete: true });

    if (decoded) {
      const payload = decoded.payload as JwtPayload;
      const header = decoded.header;

      // Get the public key from the `iss` payload field.
      const publicKey = payload.iss;
      if (publicKey) {
        const authWallet = await getAuthWallet();
        if (publicKey === (await authWallet.getAddress())) {
          return await handleAccessToken(jwt, req, getUser);
        }
        if (publicKey === THIRDWEB_DASHBOARD_ISSUER) {
          return await handleDashboardAuth({ jwt, req });
        }
        return await handleKeypairAuth({ jwt, req, publicKey });
      }

      // Get the public key hash from the `kid` header.
      const publicKeyHash = header.kid;
      if (publicKeyHash) {
        return await handleKeypairAuth({ jwt, req, publicKeyHash });
      }
    }
  }

  const liteModeResp = await handleLiteModeAuth(req);
  if (liteModeResp.isAuthed) {
    return liteModeResp;
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
}

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
      OPENAPI_ROUTES.includes(req.url) ||
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

  // Admin routes enforce their own auth.
  if (req.url.startsWith(ADMIN_QUEUES_BASEPATH)) {
    return { isAuthed: true };
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
async function handleWebsocketAuth(
  req: FastifyRequest,
  getUser: ReturnType<typeof ThirdwebAuth<TAuthData, TAuthSession>>["getUser"],
): Promise<AuthResponse> {
  if (!ALLOWED_AUTHENTICATION_TYPES.has("websocket")) {
    return { isAuthed: false };
  }

  const { token: jwt } = req.query as { token: string };

  const token = await getAccessToken({ jwt });
  if (token && token.revokedAt === null) {
    // Set as a header for `getUsers` to parse the token.
    req.headers.authorization = `Bearer ${jwt}`;
    const user = await getUser(req);

    const { isAllowed, ip } = await checkIpInAllowlist(req);
    if (!isAllowed) {
      logger({
        service: "server",
        level: "error",
        message: `Unauthorized IP address: ${ip}`,
      });
      return {
        isAuthed: false,
        error:
          "Unauthorized IP address. See: https://portal.thirdweb.com/engine/features/security",
      };
    }

    if (
      user?.session?.permissions === Permission.Owner ||
      user?.session?.permissions === Permission.Admin
    ) {
      return { isAuthed: true };
    }
  }

  // Destroy the websocket connection.
  req.raw.socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
  req.raw.socket.destroy();
  return { isAuthed: false };
}

/**
 * Auth via keypair.
 * Allow a request that provides a JWT signed by an ES256 private key
 * matching the configured public key.
 * @param jwt string
 * @param req FastifyRequest
 * @param publicKey string
 * @returns AuthResponse
 */
async function handleKeypairAuth(args: {
  jwt: string;
  req: FastifyRequest;
  publicKey?: string;
  publicKeyHash?: string;
}): Promise<AuthResponse> {
  // The keypair auth feature must be explicitly enabled.
  if (!env.ENABLE_KEYPAIR_AUTH) {
    return { isAuthed: false };
  }

  const { jwt, req, publicKey, publicKeyHash } = args;

  let error: string | undefined;
  try {
    const keypair = await getKeypair({ publicKey, publicKeyHash });
    if (!keypair) {
      error = "The provided public key is incorrect or not added to Engine.";
      throw error;
    }

    // The JWT is valid if `verify` did not throw.
    const payload = jsonwebtoken.verify(jwt, keypair.publicKey, {
      algorithms: [keypair.algorithm as jsonwebtoken.Algorithm],
    }) as jsonwebtoken.JwtPayload;

    // If `bodyHash` is provided, it must match a hash of the POST request body.
    if (
      req.method === "POST" &&
      payload?.bodyHash &&
      payload.bodyHash !== hashRequestBody(req)
    ) {
      error =
        "The request body does not match the hash in the access token. See: https://portal.thirdweb.com/engine/features/keypair-authentication";
      throw error;
    }

    const { isAllowed, ip } = await checkIpInAllowlist(req);
    if (!isAllowed) {
      logger({
        service: "server",
        level: "error",
        message: `Unauthorized IP address: ${ip}`,
      });
      throw new Error(
        "Unauthorized IP address. See: https://portal.thirdweb.com/engine/features/security",
      );
    }
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
}

/**
 * Auth via access token.
 * Allow a request that provides a non-revoked access token for an owner/admin.
 * @param jwt string
 * @param req FastifyRequest
 * @param getUser
 * @returns AuthResponse
 * @async
 */
async function handleAccessToken(
  jwt: string,
  req: FastifyRequest,
  getUser: ReturnType<typeof ThirdwebAuth<TAuthData, TAuthSession>>["getUser"],
): Promise<AuthResponse> {
  if (!ALLOWED_AUTHENTICATION_TYPES.has("access-token")) {
    return { isAuthed: false };
  }

  let token: Awaited<ReturnType<typeof getAccessToken>> = null;
  try {
    token = await getAccessToken({ jwt });
  } catch {
    // Missing or invalid signature. This will occur if the JWT not intended for this auth pattern.
    return { isAuthed: false };
  }

  if (!token || token.revokedAt) {
    return { isAuthed: false };
  }

  const user = await getUser(req);

  if (
    user?.session?.permissions !== Permission.Owner &&
    user?.session?.permissions !== Permission.Admin
  ) {
    return { isAuthed: false };
  }

  const { isAllowed, ip } = await checkIpInAllowlist(req);
  if (!isAllowed) {
    logger({
      service: "server",
      level: "error",
      message: `Unauthorized IP address: ${ip}`,
    });
    return {
      isAuthed: false,
      error:
        "Unauthorized IP address. See: https://portal.thirdweb.com/engine/features/security",
    };
  }

  req.authentication = {
    type: "access-token",
    user,
  };
  return { isAuthed: true };
}

/**
 * Auth via dashboard.
 * Allow a request that provides a dashboard JWT.
 * @param jwt string
 * @returns AuthResponse
 * @async
 */
async function handleDashboardAuth({
  req,
  jwt,
}: { req: FastifyRequest; jwt: string }): Promise<AuthResponse> {
  if (!ALLOWED_AUTHENTICATION_TYPES.has("dashboard")) {
    return { isAuthed: false };
  }

  const user =
    (await handleSiwe(jwt, "thirdweb.com", THIRDWEB_DASHBOARD_ISSUER)) ||
    (await handleSiwe(jwt, "thirdweb-preview.com", THIRDWEB_DASHBOARD_ISSUER));
  if (user) {
    const res = await getPermissions({ walletAddress: user.address });
    if (
      res?.permissions === Permission.Owner ||
      res?.permissions === Permission.Admin
    ) {
      req.authentication = {
        type: "dashboard",
        user: {
          address: user.address,
          session: {
            permissions: res.permissions,
          },
        },
      };
      return { isAuthed: true };
    }
  }

  return { isAuthed: false };
}

/**
 * Auth via thirdweb secret key.
 * Allow a request that provides the thirdweb secret key used to init Engine.
 *
 * @param req FastifyRequest
 * @returns
 */
async function handleSecretKey(req: FastifyRequest): Promise<AuthResponse> {
  const thirdwebApiSecretKey = req.headers.authorization?.split(" ")[1];
  if (thirdwebApiSecretKey === env.THIRDWEB_API_SECRET_KEY) {
    const authWallet = await getAuthWallet();
    req.authentication = {
      type: "secret-key",
      user: {
        address: await authWallet.getAddress(),
        session: {
          permissions: Permission.Admin,
        },
      },
    };
    return { isAuthed: true };
  }

  return { isAuthed: false };
}

/**
 * Auth via auth webhooks
 * Allow a request if it satisfies all configured auth webhooks.
 * Must have at least one auth webhook.
 * @param req FastifyRequest
 * @returns AuthResponse
 * @async
 */
async function handleAuthWebhooks(req: FastifyRequest): Promise<AuthResponse> {
  if (!ALLOWED_AUTHENTICATION_TYPES.has("webhook")) {
    return { isAuthed: false };
  }

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
}

async function handleLiteModeAuth(req: FastifyRequest): Promise<AuthResponse> {
  if (!ALLOWED_AUTHENTICATION_TYPES.has("lite")) {
    return { isAuthed: false };
  }

  const litePassword = req.headers.authorization?.split(" ")[1];
  if (!litePassword) {
    return {
      isAuthed: false,
      error: 'Missing "Authorization" header.',
    };
  }

  const thirdwebSecretKey = req.headers["x-thirdweb-secret-key"];
  if (!thirdwebSecretKey) {
    return {
      isAuthed: false,
      error: 'Missing "x-thirdweb-secret-key" header.',
    };
  }

  req.authentication = {
    type: "lite",
    litePassword,
    thirdwebSecretKey: String(thirdwebSecretKey),
  };
  return { isAuthed: true };
}

function hashRequestBody(req: FastifyRequest): string {
  return createHash("sha256")
    .update(JSON.stringify(req.body), "utf8")
    .digest("hex");
}

/**
 * Check if the request IP is in the allowlist.
 * Fetches cached config if available.
 * @param req FastifyRequest
 * @returns boolean
 * @async
 */
async function checkIpInAllowlist(req: FastifyRequest) {
  let ip = req.ip;
  const trustProxy = env.TRUST_PROXY || !!env.ENGINE_TIER;
  if (trustProxy && req.headers["cf-connecting-ip"]) {
    ip = req.headers["cf-connecting-ip"] as string;
  }

  const config = await getConfig();
  if (config.ipAllowlist.length === 0) {
    return { isAllowed: true, ip };
  }

  return {
    isAllowed: config.ipAllowlist.includes(ip),
    ip,
  };
}
