import { PostHog } from 'posthog-node';
import { getEnv } from '../loadEnv';
import { ApiCallerIdentity } from '../types/fastify';

const posthogClient = new PostHog(getEnv('POSTHOG_API_KEY'), {
  host: 'https://a.thirdweb.com',
});

export class AnalyticsService {
  static trackEvent(args: {
    eventName: string;
    apiCallerIdentity: ApiCallerIdentity;
    data?: any;
  }) {
    try {
      const apiCallerIdentity = args.apiCallerIdentity;
      const distinctId = (
        apiCallerIdentity.identityType === 'thirdwebAuthJwt'
          ? apiCallerIdentity.thirdwebAuthUser?.address
          : apiCallerIdentity.apiKeyInfo?.key
      ) as string;
      posthogClient.capture({
        distinctId,
        event: args.eventName,
        properties: {
          ...args.data,
          authenticationType: apiCallerIdentity.identityType,
          jwtWalletAddress: apiCallerIdentity.thirdwebAuthUser?.address,
          apiKeyCreatorWalletAddress:
            apiCallerIdentity.apiKeyInfo?.creatorWalletAddress,
          distinctId,
        },
      });
    } catch (e: any) {
      console.error(
        `AnalyticsService: Failed to send analytics to 3rd party service:`,
        e
      );
    }
  }
}
