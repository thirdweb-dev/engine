/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class BalanceSubscriptionsService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get balance subscriptions
     * Get all balance subscriptions.
     * @returns any Default Response
     * @throws ApiError
     */
    public getAllBalanceSubscriptions(): CancelablePromise<{
        result: Array<{
            id: string;
            /**
             * A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
             */
            chain: string;
            /**
             * A contract or wallet address
             */
            tokenAddress?: string;
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            config: {
                threshold?: {
                    /**
                     * Minimum balance threshold
                     */
                    min?: string;
                    /**
                     * Maximum balance threshold
                     */
                    max?: string;
                };
            };
            webhook?: {
                url: string;
            };
            createdAt: string;
            updatedAt: string;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/balance-subscriptions/get-all',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Add balance subscription
     * Subscribe to balance changes for a wallet.
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public addBalanceSubscription(
        requestBody?: ({
            /**
             * A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
             */
            chain: string;
            /**
             * A contract or wallet address
             */
            tokenAddress?: string;
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            config: {
                threshold?: {
                    /**
                     * Minimum balance threshold
                     */
                    min?: string;
                    /**
                     * Maximum balance threshold
                     */
                    max?: string;
                };
            };
        } & ({
            /**
             * Webhook URL to create a new webhook
             */
            webhookUrl: string;
            /**
             * Optional label for the webhook when creating a new one
             */
            webhookLabel?: string;
        } | {
            /**
             * ID of an existing webhook to use
             */
            webhookId: number;
        })),
    ): CancelablePromise<{
        result: {
            id: string;
            /**
             * A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
             */
            chain: string;
            /**
             * A contract or wallet address
             */
            tokenAddress?: string;
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            config: {
                threshold?: {
                    /**
                     * Minimum balance threshold
                     */
                    min?: string;
                    /**
                     * Maximum balance threshold
                     */
                    max?: string;
                };
            };
            webhook?: {
                url: string;
            };
            createdAt: string;
            updatedAt: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/balance-subscriptions/add',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Update balance subscription
     * Update an existing balance subscription.
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public updateBalanceSubscription(
        requestBody: {
            /**
             * The ID of the balance subscription to update.
             */
            balanceSubscriptionId: string;
            /**
             * A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
             */
            chain?: string;
            tokenAddress?: (string | null);
            /**
             * A contract or wallet address
             */
            walletAddress?: string;
            config?: {
                threshold?: {
                    /**
                     * Minimum balance threshold
                     */
                    min?: string;
                    /**
                     * Maximum balance threshold
                     */
                    max?: string;
                };
            };
            webhookId?: (number | null);
        },
    ): CancelablePromise<{
        result: {
            id: string;
            /**
             * A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
             */
            chain: string;
            /**
             * A contract or wallet address
             */
            tokenAddress?: string;
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            config: {
                threshold?: {
                    /**
                     * Minimum balance threshold
                     */
                    min?: string;
                    /**
                     * Maximum balance threshold
                     */
                    max?: string;
                };
            };
            webhook?: {
                url: string;
            };
            createdAt: string;
            updatedAt: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/balance-subscriptions/update',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Remove balance subscription
     * Remove an existing balance subscription
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public removeBalanceSubscription(
        requestBody: {
            /**
             * The ID for an existing balance subscription.
             */
            balanceSubscriptionId: string;
        },
    ): CancelablePromise<{
        result: {
            status: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/balance-subscriptions/remove',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

}
