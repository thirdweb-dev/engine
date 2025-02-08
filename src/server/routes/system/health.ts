import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { isDatabaseReachable } from "../../../shared/db/client";
import { env } from "../../../shared/utils/env";
import { isRedisReachable } from "../../../shared/utils/redis/redis";
import { thirdwebClientId } from "../../../shared/utils/sdk";

type EngineFeature =
  | "KEYPAIR_AUTH"
  | "CONTRACT_SUBSCRIPTIONS"
  | "IP_ALLOWLIST"
  | "HETEROGENEOUS_WALLET_TYPES"
  | "SMART_BACKEND_WALLETS";

const ReplySchema = Type.Object({
  db: Type.Boolean(),
  redis: Type.Boolean(),
  auth: Type.Boolean(),
  engineVersion: Type.Optional(Type.String()),
  engineTier: Type.Optional(Type.String()),
  features: Type.Array(
    Type.Union([
      Type.Literal("KEYPAIR_AUTH"),
      Type.Literal("CONTRACT_SUBSCRIPTIONS"),
      Type.Literal("IP_ALLOWLIST"),
      Type.Literal("HETEROGENEOUS_WALLET_TYPES"),
      Type.Literal("SMART_BACKEND_WALLETS"),
    ]),
  ),
  clientId: Type.String(),
});

export async function healthCheck(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof ReplySchema>;
  }>({
    method: "GET",
    url: "/system/health",
    schema: {
      hide: true,
      summary: "Check health",
      description: "Check the system health of Engine",
      tags: ["System"],
      operationId: "checkHealth",
      response: {
        [StatusCodes.OK]: ReplySchema,
        [StatusCodes.SERVICE_UNAVAILABLE]: ReplySchema,
      },
    },
    handler: async (_, res) => {
      const db = await isDatabaseReachable();
      const redis = await isRedisReachable();
      const auth = await isAuthValid();
      const isHealthy = db && redis && auth;

      res
        .status(isHealthy ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE)
        .send({
          db,
          redis,
          auth,
          engineVersion: env.ENGINE_VERSION,
          engineTier: env.ENGINE_TIER ?? "SELF_HOSTED",
          features: getFeatures(),
          clientId: thirdwebClientId,
        });
    },
  });
}

const getFeatures = (): EngineFeature[] => {
  // Default list is populated with features that are always enabled.
  // Added here to make dashboard UI backwards compatible.
  const features: EngineFeature[] = [
    "IP_ALLOWLIST",
    "HETEROGENEOUS_WALLET_TYPES",
    "CONTRACT_SUBSCRIPTIONS",
    "SMART_BACKEND_WALLETS",
  ];

  if (env.ENABLE_KEYPAIR_AUTH) features.push("KEYPAIR_AUTH");

  return features;
};

async function isAuthValid() {
  try {
    const resp = await fetch("https://api.thirdweb.com/v2/keys/use", {
      headers: {
        "x-secret-key": env.THIRDWEB_API_SECRET_KEY,
      },
    });
    return resp.ok;
  } catch {
    return false;
  }
}
