import { FastifyInstance, RouteGenericInterface } from 'fastify';
import { Static, Type } from '@sinclair/typebox';
import {
  baseReplyErrorSchema,
  developerRequestHeaderSchema,
} from '../../../sharedApiSchemas';
import { StatusCodes } from 'http-status-codes';
// import { AnalyticsService } from '../../../services/AnalyticsService';
import { FastifySchema } from 'fastify/types/schema';
import { GenericThirdwebRequestContext } from '../../../types/fastify';

const requestBodySchema = Type.Object({
  scope: Type.String(),
});

const replyBodySchema = Type.Object({
  authorized: Type.Optional(Type.Boolean()),
  error: baseReplyErrorSchema,
});

const fullRouteSchema: FastifySchema = {
  headers: developerRequestHeaderSchema,
  body: requestBodySchema,
  response: {
    [StatusCodes.OK]: replyBodySchema,
  },
};

interface schemaTypes extends RouteGenericInterface {
  Headers: Static<typeof developerRequestHeaderSchema>;
  Body: Static<typeof requestBodySchema>;
  Reply: Static<typeof replyBodySchema>;
}

export async function useApiKeyRoute(fastify: FastifyInstance) {
  fastify.route<schemaTypes, GenericThirdwebRequestContext>({
    method: 'POST',
    url: '/v1/keys/use',
    schema: fullRouteSchema,
    handler: async (request, reply) => {
      // Track event
      const apiCallerIdentity = request.context.config.apiCallerIdentity;
      // AnalyticsService.trackEvent({
      //   eventName: `${request.body.scope}`,
      //   apiCallerIdentity,
      // });

      /* If the request made it this far, the API key is valid */
      reply.status(StatusCodes.OK).send({
        authorized: true,
        error: null,
      });
    },
  });
}
