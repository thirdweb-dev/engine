/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class ContractMetadataService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get ABI
     * Get the ABI of a contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getAbi(
chain: string,
contractAddress: string,
): CancelablePromise<{
result: Array<{
type: string;
name?: string;
inputs?: Array<{
type?: string;
name?: string;
internalType?: string;
stateMutability?: string;
components?: Array<{
type?: string;
name?: string;
internalType?: string;
}>;
}>;
outputs?: Array<{
type?: string;
name?: string;
internalType?: string;
stateMutability?: string;
components?: Array<{
type?: string;
name?: string;
internalType?: string;
}>;
}>;
stateMutability?: string;
}>;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/metadata/abi',
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
     * Get events
     * Get details of all events implemented by a contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getEvents(
chain: string,
contractAddress: string,
): CancelablePromise<{
result: Array<{
name: string;
inputs: Array<{
type?: string;
name?: string;
internalType?: string;
stateMutability?: string;
components?: Array<{
type?: string;
name?: string;
internalType?: string;
}>;
}>;
outputs: Array<{
type?: string;
name?: string;
internalType?: string;
stateMutability?: string;
components?: Array<{
type?: string;
name?: string;
internalType?: string;
}>;
}>;
comment?: string;
}>;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/metadata/events',
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
     * Get extensions
     * Get all detected extensions for a contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getExtensions(
chain: string,
contractAddress: string,
): CancelablePromise<{
/**
 * Array of detected extension names
 */
result: Array<string>;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/metadata/extensions',
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
     * Get functions
     * Get details of all functions implemented by the contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getFunctions(
chain: string,
contractAddress: string,
): CancelablePromise<{
result: Array<{
name: string;
inputs: Array<{
type?: string;
name?: string;
internalType?: string;
stateMutability?: string;
components?: Array<{
type?: string;
name?: string;
internalType?: string;
}>;
}>;
outputs: Array<{
type?: string;
name?: string;
internalType?: string;
stateMutability?: string;
components?: Array<{
type?: string;
name?: string;
internalType?: string;
}>;
}>;
comment?: string;
signature: string;
stateMutability: string;
}>;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/metadata/functions',
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

}
