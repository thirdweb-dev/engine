import { initializeLogger } from "../../lib/logger.js";
import { createMiddleware } from "hono/factory";

const httpLogger = initializeLogger("http");

export const requestLogger = createMiddleware(async (c, next) => {
  const startTime = performance.now();
  const method = c.req.method;
  const path = c.req.path;
  const correlationId = c.get("correlationId");

  // Initialize request metadata
  const requestMetadata: Record<string, unknown> = {
    correlationId,
    method,
    path,
    query: Object.fromEntries(new URL(c.req.url).searchParams.entries()),
  };

  // Handle request body based on content type
  const contentType = c.req.header("content-type");
  if (method !== "GET" && method !== "HEAD") {
    try {
      if (contentType?.includes("application/json")) {
        const bodyClone = await c.req.raw.clone().json();
        requestMetadata.body = bodyClone;
      } else {
        requestMetadata.body = `[${contentType}]`;
      }
    } catch (error) {
      requestMetadata.bodyParseError =
        error instanceof Error ? error.message : "Unknown error";
    }
  }

  // Log the incoming request
  httpLogger.http(`${method} ${path}`, requestMetadata);

  try {
    await next();

    const responseTime = Math.round(performance.now() - startTime);
    const status = c.res.status;

    // For non-200 responses, try to get the response body
    // only log response body if non-200 response
    let responseBody: unknown;
    if (status !== 200) {
      try {
        responseBody = await c.res.clone().json();
      } catch {
        // Response might not be JSON
        responseBody = "Unable to parse response body";
      }
    }

    // Log the response
    httpLogger.http(`${method} ${path} completed`, {
      ...requestMetadata,
      status,
      responseTime,
      ...(responseBody ? { response: responseBody } : {}),
    });
  } catch (error) {
    const responseTime = Math.round(performance.now() - startTime);

    // Log the error with all context
    httpLogger.error(`${method} ${path} failed`, {
      ...requestMetadata,
      responseTime,
      error,
    });

    throw error;
  }
});
