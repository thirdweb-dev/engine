import { Static } from "@sinclair/typebox";
import { WalletType } from "../../../src/schema/wallet";
import { env } from "../../../src/utils/env";
import { EngineConfigSchema } from "../../schemas/config";

export const addLocalConfig = async (
  data: Static<(typeof EngineConfigSchema)["local"]>,
): Promise<string> => {
  if (env.WALLET_CONFIGURATION.type !== WalletType.local) {
    throw new Error(`Server was not configured for AWS KMS wallet creation`);
  }

  /// ToDo

  return "";
};
