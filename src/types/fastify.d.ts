import { ApiKeyInfo, PrismaClient } from '@prisma/client';
import { Json } from '@thirdweb-dev/auth/dist/declarations/src/core/schema';
import { Request } from 'express';
import {
  ThirdwebAuthContext,
  ThirdwebAuthUser,
} from '@thirdweb-dev/auth/dist/declarations/src/express/types';
import {
  FastifyReply,
  FastifyRequest,
  RawServerDefault,
  RouteGenericInterface,
} from 'fastify';
import { RawRequestDefaultExpression } from 'fastify/types/utils';
import { FastifySchema } from 'fastify/types/schema';
import { FastifyTypeProviderDefault } from 'fastify/types/type-provider';

declare module 'fastify' {
  interface FastifyInstance {

    getUser<TData extends Json = Json, TSession extends Json = Json>(
      req: Request,
      ctx: ThirdwebAuthContext<TData, TSession>
    ): Promise<ThirdwebAuthUser<TData, TSession> | null>;
  }
}

export interface ApiCallerIdentity {
  identityType: 'thirdwebAuthJwt' | 'thirdwebApiKey' | null;
  thirdwebAuthUser?: ThirdwebAuthUser;
  apiKeyInfo?: ApiKeyInfo;
}
export interface GenericThirdwebRequestContext extends ThirdwebAuthContext {
  apiCallerIdentity: ApiCallerIdentity;
}

export type GenericApiRequest = FastifyRequest<
  RouteGenericInterface,
  RawServerDefault,
  RawRequestDefaultExpression<RawServerDefault>,
  FastifySchema,
  FastifyTypeProviderDefault,
  GenericThirdwebRequestContext,
>;
export type GenericApiReply = FastifyReply;
