import type { FastifyInstance } from "fastify";
import { getAllAdmins } from "./read/get-all-admins";
import { getAllSessions } from "./read/get-all-sessions";
import { grantAdmin } from "./write/grant-admin";
import { grantSession } from "./write/grant-session";
import { revokeAdmin } from "./write/revoke-admin";
import { revokeSession } from "./write/revoke-session";
import { updateSession } from "./write/update-session";

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
