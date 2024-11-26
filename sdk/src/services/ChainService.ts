/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class ChainService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get chain details
     * Get details about a chain.
     * @param chain Chain name or ID
     * @returns any Default Response
     * @throws ApiError
     */
    public get(
        chain: string,
    ): CancelablePromise<{
        result: {
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
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/chain/get',
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

    /**
     * Get all chain details
     * Get details about all supported chains.
     * @returns any Default Response
     * @throws ApiError
     */
    public getAll(): CancelablePromise<{
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
            url: '/chain/get-all',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

}
