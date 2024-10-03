import { Type, type Static } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import { StatusCodes } from "http-status-codes";
import { isDatabaseReachable } from "../../../db/client";
import { env } from "../../../utils/env";
import { isRedisReachable } from "../../../utils/redis/redis";
import { createCustomError } from "../../middleware/error";

type EngineFeature = "KEYPAIR_AUTH" | "CONTRACT_SUBSCRIPTIONS" | "IP_ALLOWLIST";

const ReplySchemaOk = Type.Object({
  status: Type.String(),
  engineVersion: Type.Optional(Type.String()),
  engineTier: Type.Optional(Type.String()),
  features: Type.Array(
    Type.Union([
      Type.Literal("KEYPAIR_AUTH"),
      Type.Literal("CONTRACT_SUBSCRIPTIONS"),
      Type.Literal("IP_ALLOWLIST"),
    ]),
  ),
});

const ReplySchemaError = Type.Object({
  error: Type.String(),
});

const responseBodySchema = Type.Union([ReplySchemaOk, ReplySchemaError]);

export async function healthCheck(fastify: FastifyInstance) {
  fastify.route<{
    Reply: Static<typeof responseBodySchema>;
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
        [StatusCodes.OK]: ReplySchemaOk,
        [StatusCodes.SERVICE_UNAVAILABLE]: ReplySchemaError,
      },
    },
    handler: async (req, res) => {
      if (!(await isDatabaseReachable())) {
        throw createCustomError(
          "The database is unreachable.",
          StatusCodes.SERVICE_UNAVAILABLE,
          "FAILED_HEALTHCHECK",
        );
      }

      if (!(await isRedisReachable())) {
        throw createCustomError(
          "Redis is unreachable.",
          StatusCodes.SERVICE_UNAVAILABLE,
          "FAILED_HEALTHCHECK",
        );
      }

      res.status(StatusCodes.OK).send({
        status: "OK",
        engineVersion: env.ENGINE_VERSION,
        engineTier: env.ENGINE_TIER ?? "SELF_HOSTED",
        features: getFeatures(),
      });
    },
  });
}

const getFeatures = (): EngineFeature[] => {
  // IP Allowlist is always available as a feature, but added as a feature for backwards compatibility.
  const features: EngineFeature[] = ["CONTRACT_SUBSCRIPTIONS", "IP_ALLOWLIST"];

  if (env.ENABLE_KEYPAIR_AUTH) features.push("KEYPAIR_AUTH");

  return features;
};
