import { FastifyInstance } from 'fastify';
import { useApiKeyRoute } from './v1/keys/use';
import { readContract } from './contracts/read/read';
import { revokeApiKeyRoute } from './v1/keys/revoke';

export const apiRoutes = async (fastify: FastifyInstance) => {
  await fastify.register(readContract);
  await fastify.register(revokeApiKeyRoute);
  await fastify.register(useApiKeyRoute);
};
