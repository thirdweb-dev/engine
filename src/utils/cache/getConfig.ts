import { getConfiguration } from "../../db/configuration/getConfiguration";
import { ParsedConfig } from "../../schema/config";

let _config: ParsedConfig | null = null;

export const getConfig = async (
  retrieveFromCache = true,
): Promise<ParsedConfig> => {
  if (_config && retrieveFromCache) {
    return _config;
  }

  _config = await getConfiguration();
  return _config;
};

export const invalidateConfig = () => {
  _config = null;
};
