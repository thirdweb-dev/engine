import { LocalWallet } from "@thirdweb-dev/wallets";
import { WalletType } from "../../../schema/wallet";
import { env } from "../../../utils/env";
import { createThirdwebClient, defineChain } from "thirdweb";
import { smartWallet, privateKeyToAccount } from "thirdweb/wallets";
import { createWalletDetails } from "../../../db/wallets/createWalletDetails";

interface CreateSmartBackendWallet {
  label?: string;
}

const client = createThirdwebClient({
  secretKey: env.THIRDWEB_API_SECRET_KEY,
});

export const createSmartBackendWallet = async ({
  label,
}: CreateSmartBackendWallet): Promise<string> => {
  const wallet = new LocalWallet();
  const walletAddress = await wallet.generate();

  const encryptedPkey = await wallet.export({
    strategy: "privateKey",
    encryption: { password: env.ENCRYPTION_PASSWORD },
  });

  const pkey = await wallet.export({
    strategy: "privateKey",
    encryption: false,
  });

  const account = privateKeyToAccount({ client, privateKey: pkey });
  const smartAccount = smartWallet({ chain: defineChain(1), gasless: true });
  const connectedAccount = await smartAccount.connect({
    client,
    personalAccount: account,
  });
  const smartAccountAddress = connectedAccount.address;

  await createWalletDetails({
    type: WalletType.smart,
    address: smartAccountAddress,
    smartAccountEOAAddress: walletAddress,
    encryptedJson: encryptedPkey,
    label,
  });

  return smartAccountAddress;
};
