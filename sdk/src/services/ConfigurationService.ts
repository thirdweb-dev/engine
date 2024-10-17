/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class ConfigurationService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get wallets configuration
     * Get wallets configuration
     * @returns any Default Response
     * @throws ApiError
     */
    public getWalletsConfiguration(): CancelablePromise<{
        result: {
            type: ('local' | 'aws-kms' | 'gcp-kms');
            awsAccessKeyId: (string | null);
            awsRegion: (string | null);
            gcpApplicationProjectId: (string | null);
            gcpKmsLocationId: (string | null);
            gcpKmsKeyRingId: (string | null);
            gcpApplicationCredentialEmail: (string | null);
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/configuration/wallets',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Update wallets configuration
     * Update wallets configuration
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public updateWalletsConfiguration(
        requestBody?: ({
            awsAccessKeyId: string;
            awsSecretAccessKey: string;
            awsRegion: string;
        } | {
            gcpApplicationProjectId: string;
            gcpKmsLocationId: string;
            gcpKmsKeyRingId: string;
            gcpApplicationCredentialEmail: string;
            gcpApplicationCredentialPrivateKey: string;
        }),
    ): CancelablePromise<{
        result: {
            type: ('local' | 'aws-kms' | 'gcp-kms');
            awsAccessKeyId: (string | null);
            awsRegion: (string | null);
            gcpApplicationProjectId: (string | null);
            gcpKmsLocationId: (string | null);
            gcpKmsKeyRingId: (string | null);
            gcpApplicationCredentialEmail: (string | null);
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/configuration/wallets',
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
     * Get chain overrides configuration
     * Get chain overrides configuration
     * @returns any Default Response
     * @throws ApiError
     */
    public getChainsConfiguration(): CancelablePromise<{
        result: Array<{
            /**
             * Chain name
             */
            name?: string;
            /**
             * Chain name
             */
            chain?: string;
            rpc?: Array<string>;
            nativeCurrency?: {
                /**
                 * Native currency name
                 */
                name: string;
                /**
                 * Native currency symbol
                 */
                symbol: string;
                /**
                 * Native currency decimals
                 */
                decimals: number;
            };
            /**
             * Chain short name
             */
            shortName?: string;
            /**
             * Chain ID
             */
            chainId?: number;
            /**
             * Is testnet
             */
            testnet?: boolean;
            /**
             * Chain slug
             */
            slug?: string;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/configuration/chains',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Update chain overrides configuration
     * Update chain overrides configuration
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public updateChainsConfiguration(
        requestBody: {
            chainOverrides: Array<{
                /**
                 * Chain name
                 */
                name?: string;
                /**
                 * Chain name
                 */
                chain?: string;
                rpc?: Array<string>;
                nativeCurrency?: {
                    /**
                     * Native currency name
                     */
                    name: string;
                    /**
                     * Native currency symbol
                     */
                    symbol: string;
                    /**
                     * Native currency decimals
                     */
                    decimals: number;
                };
                /**
                 * Chain short name
                 */
                shortName?: string;
                /**
                 * Chain ID
                 */
                chainId?: number;
                /**
                 * Is testnet
                 */
                testnet?: boolean;
                /**
                 * Chain slug
                 */
                slug?: string;
            }>;
        },
    ): CancelablePromise<{
        result: Array<{
            /**
             * Chain name
             */
            name?: string;
            /**
             * Chain name
             */
            chain?: string;
            rpc?: Array<string>;
            nativeCurrency?: {
                /**
                 * Native currency name
                 */
                name: string;
                /**
                 * Native currency symbol
                 */
                symbol: string;
                /**
                 * Native currency decimals
                 */
                decimals: number;
            };
            /**
             * Chain short name
             */
            shortName?: string;
            /**
             * Chain ID
             */
            chainId?: number;
            /**
             * Is testnet
             */
            testnet?: boolean;
            /**
             * Chain slug
             */
            slug?: string;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/configuration/chains',
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
     * Get transaction processing configuration
     * Get transactions processing configuration
     * @returns any Default Response
     * @throws ApiError
     */
    public getTransactionConfiguration(): CancelablePromise<{
        result: {
            minTxsToProcess: number;
            maxTxsToProcess: number;
            minedTxListenerCronSchedule: (string | null);
            maxTxsToUpdate: number;
            retryTxListenerCronSchedule: (string | null);
            minEllapsedBlocksBeforeRetry: number;
            maxFeePerGasForRetries: string;
            maxPriorityFeePerGasForRetries: string;
            maxRetriesPerTx: number;
            clearCacheCronSchedule: (string | null);
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/configuration/transactions',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Update transaction processing configuration
     * Update transaction processing configuration
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public updateTransactionConfiguration(
        requestBody?: {
            minTxsToProcess?: number;
            maxTxsToProcess?: number;
            minedTxListenerCronSchedule?: (string | null);
            maxTxsToUpdate?: number;
            retryTxListenerCronSchedule?: (string | null);
            minEllapsedBlocksBeforeRetry?: number;
            maxFeePerGasForRetries?: string;
            maxPriorityFeePerGasForRetries?: string;
            maxRetriesPerTx?: number;
        },
    ): CancelablePromise<{
        result: {
            minTxsToProcess: number;
            maxTxsToProcess: number;
            minedTxListenerCronSchedule: (string | null);
            maxTxsToUpdate: number;
            retryTxListenerCronSchedule: (string | null);
            minEllapsedBlocksBeforeRetry: number;
            maxFeePerGasForRetries: string;
            maxPriorityFeePerGasForRetries: string;
            maxRetriesPerTx: number;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/configuration/transactions',
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
     * Get auth configuration
     * Get auth configuration
     * @returns any Default Response
     * @throws ApiError
     */
    public getAuthConfiguration(): CancelablePromise<{
        result: {
            domain: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/configuration/auth',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Update auth configuration
     * Update auth configuration
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public updateAuthConfiguration(
        requestBody: {
            domain: string;
        },
    ): CancelablePromise<{
        result: {
            domain: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/configuration/auth',
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
     * Get wallet-balance configuration
     * Get wallet-balance configuration
     * @returns any Default Response
     * @throws ApiError
     */
    public getBackendWalletBalanceConfiguration(): CancelablePromise<{
        result: {
            /**
             * Minimum wallet balance in wei
             */
            minWalletBalance: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/configuration/backend-wallet-balance',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Update backend wallet balance configuration
     * Update backend wallet balance configuration
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public updateBackendWalletBalanceConfiguration(
        requestBody?: {
            /**
             * Minimum wallet balance in wei
             */
            minWalletBalance?: string;
        },
    ): CancelablePromise<{
        result: {
            /**
             * Minimum wallet balance in wei
             */
            minWalletBalance: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/configuration/backend-wallet-balance',
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
     * Get CORS configuration
     * Get CORS configuration
     * @returns any Default Response
     * @throws ApiError
     */
    public getCorsConfiguration(): CancelablePromise<{
        result: Array<string>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/configuration/cors',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Add a CORS URL
     * Add a URL to allow client-side calls to Engine
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public addUrlToCorsConfiguration(
        requestBody: {
            urlsToAdd: Array<string>;
        },
    ): CancelablePromise<{
        result: Array<string>;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/configuration/cors',
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
     * Remove CORS URLs
     * Remove URLs from CORS configuration
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public removeUrlToCorsConfiguration(
        requestBody: {
            urlsToRemove: Array<string>;
        },
    ): CancelablePromise<{
        result: Array<string>;
    }> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/configuration/cors',
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
     * Set CORS URLs
     * Replaces the CORS URLs to allow client-side calls to Engine
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public setUrlsToCorsConfiguration(
        requestBody: {
            urls: Array<string>;
        },
    ): CancelablePromise<{
        result: Array<string>;
    }> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/configuration/cors',
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
     * Get cache configuration
     * Get cache configuration
     * @returns any Default Response
     * @throws ApiError
     */
    public getCacheConfiguration(): CancelablePromise<{
        result: {
            clearCacheCronSchedule: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/configuration/cache',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Update cache configuration
     * Update cache configuration
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public updateCacheConfiguration(
        requestBody: {
            /**
             * Cron expression for clearing cache. It should be in the format of 'ss mm hh * * *' where ss is seconds, mm is minutes and hh is hours. Seconds should not be '*' or less than 10
             */
            clearCacheCronSchedule: string;
        },
    ): CancelablePromise<{
        result: {
            clearCacheCronSchedule: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/configuration/cache',
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
     * Get Contract Subscriptions configuration
     * Get the configuration for Contract Subscriptions
     * @returns any Default Response
     * @throws ApiError
     */
    public getContractSubscriptionsConfiguration(): CancelablePromise<{
        result: {
            maxBlocksToIndex: number;
            contractSubscriptionsRequeryDelaySeconds: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/configuration/contract-subscriptions',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Update Contract Subscriptions configuration
     * Update the configuration for Contract Subscriptions
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public updateContractSubscriptionsConfiguration(
        requestBody?: {
            maxBlocksToIndex?: number;
            contractSubscriptionsRequeryDelaySeconds?: string;
        },
    ): CancelablePromise<{
        result: {
            maxBlocksToIndex: number;
            contractSubscriptionsRequeryDelaySeconds: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/configuration/contract-subscriptions',
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
     * Get Allowed IP Addresses
     * Get the list of allowed IP addresses
     * @returns any Default Response
     * @throws ApiError
     */
    public getIpAllowlist(): CancelablePromise<{
        result: Array<string>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/configuration/ip-allowlist',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Set IP Allowlist
     * Replaces the IP Allowlist array to allow calls to Engine
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public setIpAllowlist(
        requestBody: {
            /**
             * Array of IP addresses to allowlist
             */
            ips: Array<string>;
        },
    ): CancelablePromise<{
        result: Array<string>;
    }> {
        return this.httpRequest.request({
            method: 'PUT',
            url: '/configuration/ip-allowlist',
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
