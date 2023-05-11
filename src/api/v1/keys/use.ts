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
import { replyBodySchema, requestBodySchemaForUse, fullRouteSchema } from "../../../sharedApiSchemas";
import { logger } from "../../../utilities/logger";

interface schemaTypes extends RouteGenericInterface {
  Headers: Static<typeof developerRequestHeaderSchema>;
  Body: Static<typeof requestBodySchemaForUse>;
  Reply: Static<typeof replyBodySchema>;
}

export async function useApiKeyRoute(fastify: FastifyInstance) {
  fastify.route<schemaTypes, GenericThirdwebRequestContext>({
    method: 'POST',
    url: '/v1/keys/use',
    schema: {
      description: 'Keys Use End-Point',
      tags: ['api'],
      ...fullRouteSchema
    },
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
