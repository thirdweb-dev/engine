import { Static } from "@sinclair/typebox";
import { WalletType } from "../../../src/schema/wallet";
import { EngineConfigSchema } from "../../schemas/config";

export const addLocalConfig = async (
  data: Static<typeof EngineConfigSchema>[WalletType.local],
) => {
  // if (
  //   !data?.privateKey ||
  //   (!data?.encryptedJson && !data?.password) ||
  //   !data?.mnemonic
  // ) {
  //   throw new Error(`Missing Values for Local Config Storage`);
  // }
  // const { privateKey, encryptedJson, password, mnemonic } = data;
  // const encryptedPrivateKey = encryptText(privateKey!);
  // const _encryptedJson = encryptText(encryptedJson!);
  // const _password = encryptText(password!);
  // const _mnemonic = encryptText(mnemonic!);
  // return await createConfig({
  //   local: {
  //     privateKey: encryptedPrivateKey,
  //     encryptedJson: _encryptedJson,
  //     password: _password,
  //     mnemonic: _mnemonic,
  //   },
  // });
  throw new Error(`Local Config Storage is not yet supported`);
};
