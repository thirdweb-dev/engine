import fastifyCors from "@fastify/cors";
import { FastifyInstance } from "fastify";
import { env } from "../../src/utils/env";

export const withCors = async (server: FastifyInstance) => {
  const originArray = env.ACCESS_CONTROL_ALLOW_ORIGIN.split(",") as string[];
  await server.register(fastifyCors, {
    origin: originArray.map((data) => {
      if (data.startsWith("/") && data.endsWith("/")) {
        return new RegExp(data.slice(1, -1));
      }

      if (data.startsWith("*.")) {
        const regex = data.replace("*.", ".*.");
        return new RegExp(regex);
      }
      return data;
    }),
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Access-Control-Allow-Origin",
      "Cache-Control",
      "Authorization",
    ],
    credentials: true,
  });
};
