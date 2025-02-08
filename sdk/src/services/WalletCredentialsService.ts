/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class WalletCredentialsService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Create wallet credentials
     * Create a new set of wallet credentials.
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public createWalletCredential(
        requestBody: {
            label: string;
            type: 'circle';
            /**
             * 32-byte hex string. If not provided, a random one will be generated.
             */
            entitySecret?: string;
            /**
             * Whether this credential should be set as the default for its type. Only one credential can be default per type.
             */
            isDefault?: boolean;
        },
    ): CancelablePromise<{
        result: {
            id: string;
            type: string;
            label: string;
            isDefault: (boolean | null);
            createdAt: string;
            updatedAt: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/wallet-credentials',
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
     * Get all wallet credentials
     * Get all wallet credentials with pagination.
     * @param page Specify the page number.
     * @param limit Specify the number of results to return per page.
     * @returns any Default Response
     * @throws ApiError
     */
    public getAllWalletCredentials(
        page: number = 1,
        limit: number = 100,
    ): CancelablePromise<{
        result: Array<{
            id: string;
            type: string;
            label: (string | null);
            isDefault: (boolean | null);
            createdAt: string;
            updatedAt: string;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/wallet-credentials',
            query: {
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
     * Get wallet credential
     * Get a wallet credential by ID.
     * @param id The ID of the wallet credential to get.
     * @returns any Default Response
     * @throws ApiError
     */
    public getWalletCredential(
        id: string,
    ): CancelablePromise<{
        result: {
            id: string;
            type: string;
            label: (string | null);
            isDefault: boolean;
            createdAt: string;
            updatedAt: string;
            deletedAt: (string | null);
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/wallet-credentials/{id}',
            path: {
                'id': id,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

}
