import { getConfiguration } from "../../../src/db/configuration/getConfiguration";

interface WebhookConfig {
  webhookUrl: string;
  webhookAuthBearerToken: string | null;
}

export const webhookCache = new Map<string, WebhookConfig>();

export const getWebhookConfig = async (): Promise<WebhookConfig> => {
  const cacheKey = `webhookConfig`;
  if (webhookCache.has(cacheKey)) {
    return webhookCache.get(cacheKey)! as WebhookConfig;
  }

  const config = await getConfiguration();

  if (config.webhookAuthBearerToken || config.webhookUrl) {
    webhookCache.set(cacheKey, {
      webhookUrl: config.webhookUrl!,
      webhookAuthBearerToken: config.webhookAuthBearerToken,
    });
  }

  return {
    webhookUrl: config.webhookUrl!,
    webhookAuthBearerToken: config.webhookAuthBearerToken,
  };
};
