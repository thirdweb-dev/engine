import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    corsPreflightEnabled: boolean;
  }
}
