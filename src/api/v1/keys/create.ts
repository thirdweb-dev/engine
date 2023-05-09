import { FastifyInstance, RouteGenericInterface } from 'fastify';
import { Static, Type } from '@sinclair/typebox';
import { baseReplyErrorSchema } from '../../../sharedApiSchemas';
import { StatusCodes } from 'http-status-codes';
// import { ApiKeyService } from '../../../services/ApiKeyService';
import { API_KEY_REPLY_ERRORS } from '../../../constants/errors';
import { FastifySchema } from 'fastify/types/schema';
// import { AnalyticsService } from '../../../services/AnalyticsService';
import { GenericThirdwebRequestContext } from '../../../types/fastify';
import { ThirdwebAuthUser } from '@thirdweb-dev/auth/dist/declarations/src/express/types';

const requestBodySchema = Type.Object({});

const replyBodySchema = Type.Object({
  key: Type.Optional(Type.String()),
  error: baseReplyErrorSchema,
});

const fullRouteSchema: FastifySchema = {
  body: requestBodySchema,
  response: {
    [StatusCodes.OK]: replyBodySchema,
  },
};

interface schemaTypes extends RouteGenericInterface {
  Body: Static<typeof requestBodySchema>;
  Reply: Static<typeof replyBodySchema>;
}

export async function createApiKeyRoute(fastify: FastifyInstance) {
  fastify.route<schemaTypes, GenericThirdwebRequestContext>({
    method: 'POST',
    url: '/v1/keys',
    schema: fullRouteSchema,
    handler: async (request, reply) => {
      const user = request.context.config.apiCallerIdentity
        .thirdwebAuthUser as ThirdwebAuthUser;
      // Don't allow users to create more than the max number of keys
      // if (
      //   await ApiKeyService.checkReachedApiKeyLimit({
      //     creatorWalletAddress: user.address,
      //   })
      // ) {
      //   reply.status(API_KEY_REPLY_ERRORS.TOO_MANY_KEYS.statusCode).send({
      //     error: API_KEY_REPLY_ERRORS.TOO_MANY_KEYS,
      //   });
      //   return;
      // }

      // Create the key
      // const apiKeyInfo = await ApiKeyService.createApiKey({
      //   creatorWalletAddress: user.address,
      // });

      // // Track event
      // AnalyticsService.trackEvent({
      //   apiCallerIdentity: request.context.config.apiCallerIdentity,
      //   eventName: 'api_keys.create',
      // });

      reply.status(StatusCodes.OK).send({
        key: 'apiKeyInfo.key',
        error: null,
      });
    },
  });
}
