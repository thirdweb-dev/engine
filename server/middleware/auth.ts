import { ThirdwebAuthUser } from "@thirdweb-dev/auth/fastify";

export type TAuthData = never;
export type TAuthSession = { permissions: string };

declare module "fastify" {
  interface FastifyRequest {
    user: ThirdwebAuthUser<TAuthData, TAuthSession>;
  }
}
