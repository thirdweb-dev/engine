import { ERC4337EthersSigner } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/erc4337-signer";
import { BigNumber } from "ethers";
import { getSdk } from "../../utils/cache/getSdk";
import { redis } from "../../utils/redis/redis";

interface CreateWalletNonceParams {
  chainId: number;
  address: string;
  signerAddress?: string;
}

export const createWalletNonce = async ({
  chainId,
  address,
  signerAddress,
}: CreateWalletNonceParams) => {
  const sdk = await getSdk({ chainId });

  let nonce: number = 0;
  try {
    if (signerAddress) {
      // If the wallet is an account, get the nonce from the contract
      const signer = (
        await getSdk({
          chainId: chainId!,
          walletAddress: signerAddress,
          accountAddress: address,
        })
      ).getSigner() as ERC4337EthersSigner;
      nonce = (await signer.smartAccountAPI.getNonce()).toNumber();
    } else {
      // If the wallet is a regular EOA, get the nonce
      nonce = BigNumber.from(
        (await sdk
          .getProvider()
          .getTransactionCount(address.toLowerCase(), "pending")) ?? 0,
      ).toNumber();
    }
  } catch {
    // If we error, just default to 0
  }

  await redis.set(`nonce:${chainId}:${address}`, nonce);
  return { chainId: chainId.toString(), address, nonce };
};
