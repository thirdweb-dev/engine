import { authenticateJWT } from "@thirdweb-dev/auth";
import { utils } from "ethers";
import { env } from "./env";

export const THIRDWEB_DASHBOARD_ISSUER =
  "0x016757dDf2Ab6a998a4729A80a091308d9059E17";

export const handleSiwe = async (
  jwt: string,
  domain: string,
  issuer: string,
) => {
  try {
    return await authenticateJWT({
      clientOptions: {
        secretKey: env.THIRDWEB_API_SECRET_KEY,
      },
      // A stub implementation of a wallet that can only verify a signature.
      wallet: {
        type: "evm",
        getAddress: async () => issuer,
        verifySignature: async (
          message: string,
          signature: string,
          address: string,
        ) => {
          const messageHash = utils.hashMessage(message);
          const messageHashBytes = utils.arrayify(messageHash);
          const recoveredAddress = utils.recoverAddress(
            messageHashBytes,
            signature,
          );
          return recoveredAddress === address;
        },
        signMessage: async (_: string) => "",
      },
      jwt,
      options: { domain },
    });
  } catch {
    return null;
  }
};
