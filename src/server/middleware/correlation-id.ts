import { createMiddleware } from "hono/factory";

export const correlationId = createMiddleware<{
  Variables: { correlationId: string };
}>(async (ctx, next) => {
  // Check if the correlation-id header exists
  let correlationId = ctx.req.header("x-correlation-id");

  // If the header does not exist, generate a new one
  if (!correlationId) {
    correlationId = crypto.randomUUID();
  }

  // Set the correlationId in the context
  ctx.set("correlationId", correlationId);

  // Proceed to the next middleware or route handler
  await next();

  // Ensure the correlation-id header is set in the response
  ctx.header("x-correlation-id", correlationId);
});
