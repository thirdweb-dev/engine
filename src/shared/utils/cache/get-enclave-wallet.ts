import type { Address } from "thirdweb";
import { ecosystemWallet, inAppWallet } from "thirdweb/wallets";
import { getChainIdFromChain } from "../../../server/utils/chain";
import { getChain } from "../chain";
import { thirdwebClient as client } from "../sdk";

export interface EnclaveWalletParams {
  chain: string;
  authToken: string;
  clientId: string;
  ecosystem?: {
    id: `ecosystem.${string}`;
    partnerId?: string;
  };
}

export const getEnclaveWalletAccount = async ({
  chain: chainSlug,
  authToken,
  clientId,
  ecosystem,
}: EnclaveWalletParams) => {
  const wallet = ecosystem
    ? ecosystemWallet(ecosystem.id, { partnerId: ecosystem.partnerId })
    : inAppWallet();
  const chainId = await getChainIdFromChain(chainSlug);
  const chain = await getChain(chainId);
  return wallet.autoConnect({
    client,
    authResult: {
      storedToken: {
        jwtToken: "",
        authProvider: "Cognito",
        authDetails: {
          userWalletId: "",
          recoveryShareManagement: "ENCLAVE",
        },
        developerClientId: clientId,
        cookieString: authToken,
        shouldStoreCookieString: false,
        isNewUser: false,
      },
    },
    chain,
  });
};

export const getEnclaveWalletAddress = async (params: EnclaveWalletParams) => {
  const account = await getEnclaveWalletAccount(params);
  return account.address as Address;
};
