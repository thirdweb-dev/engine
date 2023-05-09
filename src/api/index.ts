import { FastifyInstance } from 'fastify';
import { useApiKeyRoute } from './v1/keys/use';
import { createApiKeyRoute } from './v1/keys/create';
import { listApiKeysRoute } from './v1/keys/list';
import { revokeApiKeyRoute } from './v1/keys/revoke';

export const apiRoutes = async (fastify: FastifyInstance) => {
  await fastify.register(createApiKeyRoute);
  await fastify.register(listApiKeysRoute);
  await fastify.register(revokeApiKeyRoute);
  await fastify.register(useApiKeyRoute);
};
