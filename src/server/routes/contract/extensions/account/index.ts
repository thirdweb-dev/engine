import type { FastifyInstance } from "fastify";
import { getAllAdmins } from "./read/getAllAdmins";
import { getAllSessions } from "./read/getAllSessions";
import { grantAdmin } from "./write/grantAdmin";
import { grantSession } from "./write/grantSession";
import { revokeAdmin } from "./write/revokeAdmin";
import { revokeSession } from "./write/revokeSession";
import { updateSession } from "./write/updateSession";

export const accountRoutes = async (fastify: FastifyInstance) => {
  // GET
  await fastify.register(getAllAdmins);
  await fastify.register(getAllSessions);

  // POST
  await fastify.register(grantAdmin);
  await fastify.register(revokeAdmin);
  await fastify.register(grantSession);
  await fastify.register(revokeSession);
  await fastify.register(updateSession);
};
