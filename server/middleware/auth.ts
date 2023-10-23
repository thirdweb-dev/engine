import { Json, User, authenticateJWT } from "@thirdweb-dev/auth";
import { ThirdwebAuthUser } from "@thirdweb-dev/auth/fastify";
import { GenericAuthWallet } from "@thirdweb-dev/wallets";
import { utils } from "ethers";

export type TAuthData = never;
export type TAuthSession = { permissions: string };

declare module "fastify" {
  interface FastifyRequest {
    user: ThirdwebAuthUser<TAuthData, TAuthSession>;
  }
}

export const authWithApiServer = async (jwt: string, domain: string) => {
  let user: User<Json> | null = null;
  try {
    user = await authenticateJWT({
      wallet: {
        type: "evm",
        getAddress: async () => "0x016757dDf2Ab6a998a4729A80a091308d9059E17",
        verifySignature: async (
          message: string,
          signature: string,
          address: string,
        ) => {
          try {
            const messageHash = utils.hashMessage(message);
            const messageHashBytes = utils.arrayify(messageHash);
            const recoveredAddress = utils.recoverAddress(
              messageHashBytes,
              signature,
            );

            if (recoveredAddress === address) {
              return true;
            }
          } catch {
            // no-op
          }

          return false;
        },
      } as GenericAuthWallet,
      jwt,
      options: {
        domain,
      },
    });
  } catch {
    // no-op
  }

  return user;
};
