import { ERC4337EthersSigner } from "@thirdweb-dev/wallets/dist/declarations/src/evm/connectors/smart-wallet/lib/erc4337-signer";
import { BigNumber } from "ethers";
import { PrismaTransaction } from "../../schema/prisma";
import { getSdk } from "../../utils/cache/getSdk";
import { getPrismaWithPostgresTx } from "../client";

interface CreateWalletNonceParams {
  pgtx?: PrismaTransaction;
  chainId: number;
  address: string;
  signerAddress?: string;
}

export const createWalletNonce = async ({
  pgtx,
  chainId,
  address,
  signerAddress,
}: CreateWalletNonceParams) => {
  const prisma = getPrismaWithPostgresTx(pgtx);
  const sdk = await getSdk({ chainId });

  let nonce: number = 0;
  try {
    if (signerAddress) {
      // If the wallet is an account, get the nonce from the contract
      const signer = (
        await getSdk({
          pgtx,
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

  return prisma.walletNonce.create({
    data: {
      address: address.toLowerCase(),
      chainId: chainId.toString(),
      nonce,
    },
  });
};
