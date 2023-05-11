import { FastifyInstance } from 'fastify';
import { useApiKeyRoute } from './v1/keys/use';
import { readContract } from './contract/read/read';
import { revokeApiKeyRoute } from './v1/keys/revoke';
import { writeToContract } from './contract/write/write';

export const apiRoutes = async (fastify: FastifyInstance) => {
  await fastify.register(readContract);
  await fastify.register(writeToContract);
  await fastify.register(revokeApiKeyRoute);
  await fastify.register(useApiKeyRoute);
};
