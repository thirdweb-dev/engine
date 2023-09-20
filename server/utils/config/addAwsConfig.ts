import { Static } from "@sinclair/typebox";
import { EngineConfigSchema } from "../../schemas/config";

export const addAwsConfig = async (
  data: Static<(typeof EngineConfigSchema)["aws"]>,
): Promise<string> => {
  return "";
};
