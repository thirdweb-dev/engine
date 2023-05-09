import { FastifyInstance, RouteGenericInterface } from 'fastify';
import { Static, Type } from '@sinclair/typebox';
import { baseReplyErrorSchema } from '../../../sharedApiSchemas';
import { StatusCodes } from 'http-status-codes';
// import { ApiKeyService } from '../../../services/ApiKeyService';
import { FastifySchema } from 'fastify/types/schema';
// import { AnalyticsService } from '../../../services/AnalyticsService';
import { GenericThirdwebRequestContext } from '../../../types/fastify';
import { ThirdwebAuthUser } from '@thirdweb-dev/auth/dist/declarations/src/express/types';

const replyBodySchema = Type.Object({
  keys: Type.Array(
    Type.Object({
      key: Type.String(),
      creatorWalletAddress: Type.String(),
      revoked: Type.Boolean(),
    })
  ),
  error: baseReplyErrorSchema,
});

const fullRouteSchema: FastifySchema = {
  response: {
    [StatusCodes.OK]: replyBodySchema,
  },
};

interface schemaTypes extends RouteGenericInterface {
  Reply: Static<typeof replyBodySchema>;
}

export async function listApiKeysRoute(fastify: FastifyInstance) {
  fastify.route<schemaTypes, GenericThirdwebRequestContext>({
    method: 'GET',
    url: '/v1/keys',
    schema: fullRouteSchema,
    handler: async (request, reply) => {
      const user = request.context.config.apiCallerIdentity
        .thirdwebAuthUser as ThirdwebAuthUser;

      // const apiKeyInfo = await ApiKeyService.prisma.apiKeyInfo.findMany({
      //   where: {
      //     creatorWalletAddress: user.address,
      //   },
      // });

      // Track event
      // AnalyticsService.trackEvent({
      //   apiCallerIdentity: request.context.config.apiCallerIdentity,
      //   eventName: 'api_keys.list',
      // });

      reply.status(StatusCodes.OK).send({
        // keys: apiKeyInfo.map((keyInfo) => ({
        //   key: keyInfo.key,
        //   creatorWalletAddress: keyInfo.creatorWalletAddress,
        //   revoked: keyInfo.revoked,
        // })),
        keys: [],
        error: null,
      });
    },
  });
}
