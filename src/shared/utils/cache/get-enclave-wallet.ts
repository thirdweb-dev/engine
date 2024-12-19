import { thirdwebClient as client } from "../sdk";
import { EnclaveWallet } from "thirdweb/dist/types/wallets/in-app/core/wallet/enclave-wallet";
import { getUserStatus } from "thirdweb/dist/types/wallets/in-app/core/actions/get-enclave-user-status";
import type { Ecosystem } from "thirdweb/dist/types/wallets/in-app/core/wallet/types";
import { ClientScopedStorage } from "thirdweb/dist/types/wallets/in-app/core/authentication/client-scoped-storage";
import { MemoryStorage } from "./memory-storage";
import type { Address } from "thirdweb";

export interface EnclaveWalletParams {
  authToken: string;
  clientId: string;
  ecosystem?: Ecosystem;
}

const getEnclaveUserWallet = async ({ authToken, ecosystem }: EnclaveWalletParams) => {
  const user = await getUserStatus({ authToken, client, ecosystem });
  if (!user) {
    throw new Error("Cannot initialize wallet, no user logged in");
  }
  if (user.wallets.length === 0) {
    throw new Error(
      "Cannot initialize wallet, this user does not have a wallet generated yet",
    );
  }
  const wallet = user.wallets[0];
  if (wallet.type !== "enclave") {
    throw new Error(
      "Cannot initialize wallet, this user does not have an enclave wallet",
    );
  }
  return wallet;
}
export const getEnclaveWallet = async (
  {
    authToken,
    clientId,
    ecosystem,
  }: EnclaveWalletParams,
) => {
  const wallet = await getEnclaveUserWallet({ authToken, clientId, ecosystem });
  return new EnclaveWallet({
    client,
    ecosystem,
    address: wallet.address,
    storage: new ClientScopedStorage({
      storage: new MemoryStorage(),
      clientId,
      ecosystem,
    }),
  });
};

export const getEnclaveWalletAccount = async (params: EnclaveWalletParams) => {
  const wallet = await getEnclaveWallet(params);
  return wallet.getAccount();
};

export const getEnclaveWalletAddress = async (params: EnclaveWalletParams) => {
  const wallet = await getEnclaveUserWallet(params)
  return wallet.address as Address;
};