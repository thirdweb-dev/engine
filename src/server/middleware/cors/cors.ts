import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from "fastify";
import { getConfig } from "../../../utils/cache/getConfig";
import {
  addAccessControlRequestHeadersToVaryHeader,
  addOriginToVaryHeader,
} from "./vary";

declare module "fastify" {
  interface FastifyRequest {
    corsPreflightEnabled: boolean;
  }
}

interface ArrayOfValueOrArray<T> extends Array<ValueOrArray<T>> {}

type OriginCallback = (
  err: Error | null,
  origin: ValueOrArray<OriginType>,
) => void;
type OriginType = string | boolean | RegExp;
type ValueOrArray<T> = T | ArrayOfValueOrArray<T>;
type OriginFunction = (
  origin: string | undefined,
  callback: OriginCallback,
) => void;

interface FastifyCorsOptions {
  /**
   * Configures the Access-Control-Allow-Origin CORS header.
   */
  origin?: ValueOrArray<OriginType> | OriginFunction;
  /**
   * Configures the Access-Control-Allow-Credentials CORS header.
   * Set to true to pass the header, otherwise it is omitted.
   */
  credentials?: boolean;
  /**
   * Configures the Access-Control-Expose-Headers CORS header.
   * Expects a comma-delimited string (ex: 'Content-Range,X-Content-Range')
   * or an array (ex: ['Content-Range', 'X-Content-Range']).
   * If not specified, no custom headers are exposed.
   */
  exposedHeaders?: string | string[];
  /**
   * Configures the Access-Control-Allow-Headers CORS header.
   * Expects a comma-delimited string (ex: 'Content-Type,Authorization')
   * or an array (ex: ['Content-Type', 'Authorization']). If not
   * specified, defaults to reflecting the headers specified in the
   * request's Access-Control-Request-Headers header.
   */
  allowedHeaders?: string | string[];
  /**
   * Configures the Access-Control-Allow-Methods CORS header.
   * Expects a comma-delimited string (ex: 'GET,PUT,POST') or an array (ex: ['GET', 'PUT', 'POST']).
   */
  methods?: string | string[];
  /**
   * Configures the Access-Control-Max-Age CORS header.
   * Set to an integer to pass the header, otherwise it is omitted.
   */
  maxAge?: number;
  /**
   * Configures the Cache-Control header for CORS preflight responses.
   * Set to an integer to pass the header as `Cache-Control: max-age=${cacheControl}`,
   * or set to a string to pass the header as `Cache-Control: ${cacheControl}` (fully define
   * the header value), otherwise the header is omitted.
   */
  cacheControl?: number | string | null;
  /**
   * Pass the CORS preflight response to the route handler (default: false).
   */
  preflightContinue?: boolean;
  /**
   * Provides a status code to use for successful OPTIONS requests,
   * since some legacy browsers (IE11, various SmartTVs) choke on 204.
   */
  optionsSuccessStatus?: number;
  /**
   * Pass the CORS preflight response to the route handler (default: false).
   */
  preflight?: boolean;
  /**
   * Enforces strict requirement of the CORS preflight request headers (Access-Control-Request-Method and Origin).
   * Preflight requests without the required headers will result in 400 errors when set to `true` (default: `true`).
   */
  strictPreflight?: boolean;
  /**
   * Hide options route from the documentation built using fastify-swagger (default: true).
   */
  hideOptionsRoute?: boolean;
}

const defaultOptions = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
  credentials: false,
  exposedHeaders: undefined,
  allowedHeaders: undefined,
  maxAge: undefined,
  preflight: true,
  strictPreflight: true,
};

export const sanitizeOrigin = (data: string): string | RegExp => {
  if (data.startsWith("/") && data.endsWith("/")) {
    return new RegExp(data.slice(1, -1));
  }

  if (data.startsWith("*.")) {
    const regex = data.replace("*.", ".*.");
    return new RegExp(regex);
  }

  if (data.includes("thirdweb-preview.com")) {
    return new RegExp(/^https?:\/\/.*\.thirdweb-preview\.com$/);
  }
  if (data.includes("thirdweb-dev.com")) {
    return new RegExp(/^https?:\/\/.*\.thirdweb-dev\.com$/);
  }

  // Remove trailing slashes.
  // The origin header does not include a trailing slash.
  if (data.endsWith("/")) {
    return data.slice(0, -1);
  }

  return data;
};

export const fastifyCors = async (
  fastify: FastifyInstance,
  req: FastifyRequest,
  reply: FastifyReply,
  opts: FastifyCorsOptions,
  next: HookHandlerDoneFunction,
) => {
  const config = await getConfig();

  const originArray = config.accessControlAllowOrigin.split(",") as string[];
  opts.origin = originArray.map(sanitizeOrigin);

  let hideOptionsRoute = true;
  if (opts.hideOptionsRoute !== undefined) {
    hideOptionsRoute = opts.hideOptionsRoute;
  }
  const corsOptions = normalizeCorsOptions(opts);
  addCorsHeadersHandler(fastify, corsOptions, req, reply, next);

  next();
};

function normalizeCorsOptions(opts: FastifyCorsOptions) {
  const corsOptions = { ...defaultOptions, ...opts };
  if (Array.isArray(opts.origin) && opts.origin.indexOf("*") !== -1) {
    corsOptions.origin = "*";
  }
  if (Number.isInteger(corsOptions.cacheControl)) {
    // integer numbers are formatted this way
    corsOptions.cacheControl = `max-age=${corsOptions.cacheControl}`;
  } else if (typeof corsOptions.cacheControl !== "string") {
    // strings are applied directly and any other value is ignored
    corsOptions.cacheControl = undefined;
  }
  return corsOptions;
}

const addCorsHeadersHandler = (
  fastify: FastifyInstance,
  options: FastifyCorsOptions,
  req: FastifyRequest,
  reply: FastifyReply,
  next: HookHandlerDoneFunction,
) => {
  // Always set Vary header
  // https://github.com/rs/cors/issues/10
  addOriginToVaryHeader(reply);

  const resolveOriginOption =
    typeof options.origin === "function"
      ? resolveOriginWrapper(fastify, options.origin)
      : (_: any, cb: any) => cb(null, options.origin);

  resolveOriginOption(
    req,
    (error: Error | null, resolvedOriginOption: boolean) => {
      if (error !== null) {
        return next(error);
      }

      // Disable CORS and preflight if false
      if (resolvedOriginOption === false) {
        return next();
      }

      // Falsy values are invalid
      if (!resolvedOriginOption) {
        return next(new Error("Invalid CORS origin option"));
      }

      addCorsHeaders(req, reply, resolvedOriginOption, options);

      if (req.raw.method === "OPTIONS" && options.preflight === true) {
        // Strict mode enforces the required headers for preflight
        if (
          options.strictPreflight === true &&
          (!req.headers.origin || !req.headers["access-control-request-method"])
        ) {
          reply
            .status(400)
            .type("text/plain")
            .send("Invalid Preflight Request");
          return;
        }

        req.corsPreflightEnabled = true;

        addPreflightHeaders(req, reply, options);

        if (!options.preflightContinue) {
          // Do not call the hook callback and terminate the request
          // Safari (and potentially other browsers) need content-length 0,
          // for 204 or they just hang waiting for a body
          reply
            .code(options.optionsSuccessStatus!)
            .header("Content-Length", "0")
            .send();
          return;
        }
      }

      return;
    },
  );
};

const addCorsHeaders = (
  req: FastifyRequest,
  reply: FastifyReply,
  originOption: any,
  corsOptions: FastifyCorsOptions,
) => {
  const origin = getAccessControlAllowOriginHeader(
    req.headers.origin!,
    originOption,
  );

  // In the case of origin not allowed the header is not
  // written in the response.
  // https://github.com/fastify/fastify-cors/issues/127
  if (origin) {
    reply.header("Access-Control-Allow-Origin", origin);
  }

  if (corsOptions.credentials) {
    reply.header("Access-Control-Allow-Credentials", "true");
  }

  if (corsOptions.exposedHeaders !== null) {
    reply.header(
      "Access-Control-Expose-Headers",
      Array.isArray(corsOptions.exposedHeaders)
        ? corsOptions.exposedHeaders.join(", ")
        : corsOptions.exposedHeaders,
    );
  }
};

function addPreflightHeaders(
  req: FastifyRequest,
  reply: FastifyReply,
  corsOptions: FastifyCorsOptions,
) {
  reply.header(
    "Access-Control-Allow-Methods",
    Array.isArray(corsOptions.methods)
      ? corsOptions.methods.join(", ")
      : corsOptions.methods,
  );

  if (!corsOptions.allowedHeaders) {
    addAccessControlRequestHeadersToVaryHeader(reply);
    const reqAllowedHeaders = req.headers["access-control-request-headers"];
    if (reqAllowedHeaders !== undefined) {
      reply.header("Access-Control-Allow-Headers", reqAllowedHeaders);
    }
  } else {
    reply.header(
      "Access-Control-Allow-Headers",
      Array.isArray(corsOptions.allowedHeaders)
        ? corsOptions.allowedHeaders.join(", ")
        : corsOptions.allowedHeaders,
    );
  }

  if (corsOptions.maxAge !== null) {
    reply.header("Access-Control-Max-Age", String(corsOptions.maxAge));
  }

  if (corsOptions.cacheControl) {
    reply.header("Cache-Control", corsOptions.cacheControl);
  }
}

const resolveOriginWrapper = (fastify: FastifyInstance, origin: any) => {
  return (req: FastifyRequest, cb: any) => {
    const result = origin.call(fastify, req.headers.origin, cb);

    // Allow for promises
    if (result && typeof result.then === "function") {
      result.then((res: any) => cb(null, res), cb);
    }
  };
};

const getAccessControlAllowOriginHeader = (
  reqOrigin: string | undefined,
  originOption: string,
) => {
  if (originOption === "*") {
    // allow any origin
    return "*";
  }

  if (typeof originOption === "string") {
    // fixed origin
    return originOption;
  }

  // reflect origin
  return isRequestOriginAllowed(reqOrigin, originOption) ? reqOrigin : false;
};

const isRequestOriginAllowed = (
  reqOrigin: string | undefined,
  allowedOrigin: string | RegExp,
) => {
  if (Array.isArray(allowedOrigin)) {
    for (let i = 0; i < allowedOrigin.length; ++i) {
      if (isRequestOriginAllowed(reqOrigin, allowedOrigin[i])) {
        return true;
      }
    }
    return false;
  } else if (typeof allowedOrigin === "string") {
    return reqOrigin === allowedOrigin;
  } else if (allowedOrigin instanceof RegExp && reqOrigin) {
    allowedOrigin.lastIndex = 0;
    return allowedOrigin.test(reqOrigin);
  } else {
    return !!allowedOrigin;
  }
};
