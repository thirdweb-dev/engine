import { FastifyInstance, RouteGenericInterface } from 'fastify';
import { Static, Type } from '@sinclair/typebox';
import { StatusCodes } from 'http-status-codes';
// import { AnalyticsService } from '../../../services/AnalyticsService';
import { GenericThirdwebRequestContext } from '../../../types/fastify';
import { ThirdwebAuthUser } from '@thirdweb-dev/auth/dist/declarations/src/express/types';
import { replyBodySchema, requestBodySchemaForRevoke, fullRouteSchema } from "../../../sharedApiSchemas";
import { logger } from "../../../utilities/logger";

interface schemaTypes extends RouteGenericInterface {
  Body: Static<typeof requestBodySchemaForRevoke>;
  Reply: Static<typeof replyBodySchema>;
}

export async function revokeApiKeyRoute(fastify: FastifyInstance) {
  fastify.route<schemaTypes, GenericThirdwebRequestContext>({
    method: 'POST',
    url: '/v1/keys/revoke',
    schema: {
      description: 'Keys Revoke End-Point',
      tags: ['api'],
      ...fullRouteSchema
    },
    handler: async (request, reply) => {
      // console.log('routeConfig', request.context)
      const user = request.context.config.apiCallerIdentity
        .thirdwebAuthUser as ThirdwebAuthUser;

      // const apiKeyInfo = await ApiKeyService.prisma.apiKeyInfo.findFirst({
      //   where: {
      //     key: request.body.key,
      //     revoked: false,
      //   },
      // });

      // Make sure the API key exists
      // if (!apiKeyInfo) {
      //   reply.status(API_KEY_REPLY_ERRORS.INVALID_API_KEY.statusCode).send({
      //     error: API_KEY_REPLY_ERRORS.INVALID_API_KEY,
      //   });
      //   return;
      // }

      // Make sure the user owns the API key
      // if (apiKeyInfo?.creatorWalletAddress !== user?.address) {
      //   reply
      //     .status(API_KEY_REPLY_ERRORS.UNAUTHORIZED_REVOCATION.statusCode)
      //     .send({
      //       error: API_KEY_REPLY_ERRORS.UNAUTHORIZED_REVOCATION,
      //     });
      //   return;
      // }

      // // Revoke
      // await ApiKeyService.revokeApiKey({
      //   apiKey: request.body.key,
      // });

      // // Track event
      // AnalyticsService.trackEvent({
      //   apiCallerIdentity: request.context.config.apiCallerIdentity,
      //   eventName: 'api_keys.revoke',
      // });

      reply.status(StatusCodes.OK).send({
        error: null,
      });
    },
  });
}
