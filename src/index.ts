import { getEnv } from './helpers/loadEnv';
import fastify, { FastifyInstance } from 'fastify';
import fastifyExpress from '@fastify/express';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import * as fs from 'fs';
import fastifyCors from '@fastify/cors';
import { openapi } from './helpers/openapi';
import { errorHandler } from './errorHandler';
import { apiRoutes } from './api';

const logSettings: any = {
  local: {
    redact: ["headers.authorization",],
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname,reqId',
        singleLine: true,
        minimumLevel: 'debug',
      },
    },
  },
  production: true,
  development: {
    
  },
};

const main = async () => {
  const server: FastifyInstance = fastify({
    logger: logSettings[getEnv('NODE_ENV')] ?? true,
    disableRequestLogging: true,
    
  }).withTypeProvider<TypeBoxTypeProvider>();

  server.addHook("onRequest", (request, reply, done) => {
    request.log.info(`Request received - ${request.method} - ${request.routerPath}`);
    done();
  });

  server.addHook('preHandler', function (req, reply, done) {
    if (req.body) {
      req.log.info({ ...req.body }, 'Request Body : ')
    }

    if (req.params) {
      req.log.info({ ...req.params }, 'Request Params : ')
    }

    if (req.query) {
      req.log.info({ ...req.query }, 'Request Querystring : ')
    }
    done()
  })

  server.addHook("onResponse", (request, reply, done) => {
    request.log.info(
      `Request completed - ${request.method} - ${reply.request.routerPath} - StatusCode: ${reply.statusCode} - Response Time: ${reply.getResponseTime().toFixed(2)}ms`
    );
    done();
  });

  await server.register(errorHandler);

  await server.register(fastifyCors);

  await server.register(fastifyExpress);
  
  openapi(server);
  
  await server.register(apiRoutes);

  await server.ready();
  
  // Command to Generate Swagger File
  // Needs to be called post Fastify Server is Ready
  server.swagger();
  
  // To Generate Swagger YAML File
  if (getEnv('NODE_ENV') === "local") {
    const yaml = server.swagger({ yaml: true });
    fs.writeFileSync('./swagger.yml', yaml);
  }

  await server.listen({
    host: getEnv('HOST'),
    port: Number(getEnv('PORT')),
  });
};

main();
