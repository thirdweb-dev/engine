import type { FastifyInstance } from "fastify";
import { getAllAdmins } from "./read/get-all-admins.js";
import { getAllSessions } from "./read/get-all-sessions.js";
import { grantAdmin } from "./write/grant-admin.js";
import { grantSession } from "./write/grant-session.js";
import { revokeAdmin } from "./write/revoke-admin.js";
import { revokeSession } from "./write/revoke-session.js";
import { updateSession } from "./write/update-session.js";

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
