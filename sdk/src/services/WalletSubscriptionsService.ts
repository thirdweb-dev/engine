/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class WalletSubscriptionsService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get wallet subscriptions
     * Get all wallet subscriptions.
     * @param page Specify the page number.
     * @param limit Specify the number of results to return per page.
     * @returns any Default Response
     * @throws ApiError
     */
    public getAllWalletSubscriptions(
        page: number = 1,
        limit: number = 100,
    ): CancelablePromise<{
        result: Array<{
            id: string;
            /**
             * The chain ID of the subscription.
             */
            chainId: string;
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            /**
             * Array of conditions to monitor for this wallet
             */
            conditions: Array<({
                type: 'token_balance_lt';
                tokenAddress: (string | 'native');
                /**
                 * The threshold value in wei
                 */
                value: string;
            } | {
                type: 'token_balance_gt';
                tokenAddress: (string | 'native');
                /**
                 * The threshold value in wei
                 */
                value: string;
            })>;
            webhook?: {
                url: string;
            };
            createdAt: string;
            updatedAt: string;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/wallet-subscriptions/get-all',
            path: {
                'page': page,
                'limit': limit,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Add wallet subscription
     * Subscribe to wallet conditions.
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public addWalletSubscription(
        requestBody?: ({
            /**
             * A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
             */
            chain: string;
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            /**
             * Array of conditions to monitor for this wallet
             */
            conditions: Array<({
                type: 'token_balance_lt';
                tokenAddress: (string | 'native');
                /**
                 * The threshold value in wei
                 */
                value: string;
            } | {
                type: 'token_balance_gt';
                tokenAddress: (string | 'native');
                /**
                 * The threshold value in wei
                 */
                value: string;
            })>;
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
             * The chain ID of the subscription.
             */
            chainId: string;
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            /**
             * Array of conditions to monitor for this wallet
             */
            conditions: Array<({
                type: 'token_balance_lt';
                tokenAddress: (string | 'native');
                /**
                 * The threshold value in wei
                 */
                value: string;
            } | {
                type: 'token_balance_gt';
                tokenAddress: (string | 'native');
                /**
                 * The threshold value in wei
                 */
                value: string;
            })>;
            webhook?: {
                url: string;
            };
            createdAt: string;
            updatedAt: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/wallet-subscriptions',
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
     * Update wallet subscription
     * Update an existing wallet subscription.
     * @param subscriptionId The ID of the wallet subscription to update.
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public updateWalletSubscription(
        subscriptionId: string,
        requestBody?: {
            /**
             * A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
             */
            chain?: string;
            /**
             * A contract or wallet address
             */
            walletAddress?: string;
            /**
             * Array of conditions to monitor for this wallet
             */
            conditions?: Array<({
                type: 'token_balance_lt';
                tokenAddress: (string | 'native');
                /**
                 * The threshold value in wei
                 */
                value: string;
            } | {
                type: 'token_balance_gt';
                tokenAddress: (string | 'native');
                /**
                 * The threshold value in wei
                 */
                value: string;
            })>;
            webhookId?: (number | null);
        },
    ): CancelablePromise<{
        result: {
            id: string;
            /**
             * The chain ID of the subscription.
             */
            chainId: string;
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            /**
             * Array of conditions to monitor for this wallet
             */
            conditions: Array<({
                type: 'token_balance_lt';
                tokenAddress: (string | 'native');
                /**
                 * The threshold value in wei
                 */
                value: string;
            } | {
                type: 'token_balance_gt';
                tokenAddress: (string | 'native');
                /**
                 * The threshold value in wei
                 */
                value: string;
            })>;
            webhook?: {
                url: string;
            };
            createdAt: string;
            updatedAt: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/wallet-subscriptions/{subscriptionId}',
            path: {
                'subscriptionId': subscriptionId,
            },
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
     * Delete wallet subscription
     * Delete an existing wallet subscription.
     * @param subscriptionId The ID of the wallet subscription to update.
     * @returns any Default Response
     * @throws ApiError
     */
    public deleteWalletSubscription(
        subscriptionId: string,
    ): CancelablePromise<{
        result: {
            id: string;
            /**
             * The chain ID of the subscription.
             */
            chainId: string;
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            /**
             * Array of conditions to monitor for this wallet
             */
            conditions: Array<({
                type: 'token_balance_lt';
                tokenAddress: (string | 'native');
                /**
                 * The threshold value in wei
                 */
                value: string;
            } | {
                type: 'token_balance_gt';
                tokenAddress: (string | 'native');
                /**
                 * The threshold value in wei
                 */
                value: string;
            })>;
            webhook?: {
                url: string;
            };
            createdAt: string;
            updatedAt: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/wallet-subscriptions/{subscriptionId}',
            path: {
                'subscriptionId': subscriptionId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

}
