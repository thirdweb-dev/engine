import type { FastifyReply, FastifyRequest } from "fastify";

import { env } from "../../core";

export const performAuthentication = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  // v0.1.0
  // Next version will be more comprehensive and will use JWT with our AUTH SDK
  const auth = request.headers.authorization;
  const token = auth?.split(" ")[1];

  if (token !== env.THIRDWEB_SDK_SECRET_KEY) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Please provide a valid secret key",
    });
  }
};
