import { FastifyInstance } from 'fastify';
import { readContract } from './contract/read/read';
import { writeToContract } from './contract/write/write';

export const apiRoutes = async (fastify: FastifyInstance) => {
  await fastify.register(readContract);
  await fastify.register(writeToContract);
};
