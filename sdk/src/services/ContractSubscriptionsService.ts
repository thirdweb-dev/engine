/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class ContractSubscriptionsService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get contract subscriptions
     * Get all contract subscriptions.
     * @returns any Default Response
     * @throws ApiError
     */
    public getContractSubscriptions(): CancelablePromise<{
        result: Array<{
            id: string;
            chainId: number;
            /**
             * A contract or wallet address
             */
            contractAddress: string;
            webhook?: {
                id: number;
                url: string;
                name: (string | null);
                secret?: string;
                eventType: string;
                active: boolean;
                createdAt: string;
            };
            processEventLogs: boolean;
            filterEvents: Array<string>;
            processTransactionReceipts: boolean;
            filterFunctions: Array<string>;
            createdAt: string;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract-subscriptions/get-all',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Add contract subscription
     * Subscribe to event logs and transaction receipts for a contract.
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public addContractSubscription(
        requestBody: {
            /**
             * A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
             */
            chain: string;
            /**
             * The address for the contract.
             */
            contractAddress: string;
            /**
             * The ID of an existing webhook to use for this contract subscription. Either `webhookId` or `webhookUrl` must be provided.
             */
            webhookId?: number;
            /**
             * Creates a new webhook to call when new onchain data is detected. Either `webhookId` or `webhookUrl` must be provided.
             */
            webhookUrl?: string;
            /**
             * If true, parse event logs for this contract.
             */
            processEventLogs: boolean;
            /**
             * A case-sensitive list of event names to filter event logs. Parses all event logs by default.
             */
            filterEvents?: Array<string>;
            /**
             * If true, parse transaction receipts for this contract.
             */
            processTransactionReceipts: boolean;
            /**
             * A case-sensitive list of function names to filter transaction receipts. Parses all transaction receipts by default.
             */
            filterFunctions?: Array<string>;
        },
    ): CancelablePromise<{
        result: {
            id: string;
            chainId: number;
            /**
             * A contract or wallet address
             */
            contractAddress: string;
            webhook?: {
                id: number;
                url: string;
                name: (string | null);
                secret?: string;
                eventType: string;
                active: boolean;
                createdAt: string;
            };
            processEventLogs: boolean;
            filterEvents: Array<string>;
            processTransactionReceipts: boolean;
            filterFunctions: Array<string>;
            createdAt: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/contract-subscriptions/add',
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
     * Remove contract subscription
     * Remove an existing contract subscription
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public removeContractSubscription(
        requestBody: {
            /**
             * The ID for an existing contract subscription.
             */
            contractSubscriptionId: string;
        },
    ): CancelablePromise<{
        result: {
            status: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/contract-subscriptions/remove',
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
     * Get subscribed contract indexed block range
     * Gets the subscribed contract's indexed block range
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getContractIndexedBlockRange(
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result: {
            /**
             * A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
             */
            chain: string;
            /**
             * A contract or wallet address
             */
            contractAddress: string;
            fromBlock: number;
            toBlock: number;
            status: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/subscriptions/get-indexed-blocks',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get last processed block
     * Get the last processed block for a chain.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @returns any Default Response
     * @throws ApiError
     */
    public getLatestBlock(
        chain: string,
    ): CancelablePromise<{
        result: {
            lastBlock: number;
            status: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract-subscriptions/last-block',
            query: {
                'chain': chain,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

}
