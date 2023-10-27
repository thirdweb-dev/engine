import fastifyExpress from "@fastify/express";
import { FastifyInstance } from "fastify";

export const withExpress = async (server: FastifyInstance) => {
  await server.register(fastifyExpress);
};
