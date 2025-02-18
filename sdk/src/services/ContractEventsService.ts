/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class ContractEventsService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get all events
     * Get a list of all blockchain events for this contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param fromBlock
     * @param toBlock
     * @param order
     * @returns any Default Response
     * @throws ApiError
     */
    public getAllEvents(
        chain: string,
        contractAddress: string,
        fromBlock?: (number | 'latest' | 'earliest' | 'pending' | 'safe' | 'finalized'),
        toBlock?: (number | 'latest' | 'earliest' | 'pending' | 'safe' | 'finalized'),
        order?: ('asc' | 'desc'),
    ): CancelablePromise<{
        result: Array<Record<string, any>>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/events/get-all',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'fromBlock': fromBlock,
                'toBlock': toBlock,
                'order': order,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get events
     * Get a list of specific blockchain events emitted from this contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param requestBody Specify the from and to block numbers to get events for, defaults to all blocks
     * @returns any Default Response
     * @throws ApiError
     */
    public getEvents(
        chain: string,
        contractAddress: string,
        requestBody: {
            eventName: string;
            fromBlock?: (number | 'latest' | 'earliest' | 'pending' | 'safe' | 'finalized');
            toBlock?: (number | 'latest' | 'earliest' | 'pending' | 'safe' | 'finalized');
            order?: ('asc' | 'desc');
            filters?: any;
        },
    ): CancelablePromise<{
        result: Array<Record<string, any>>;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/contract/{chain}/{contractAddress}/events/get',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
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

}
