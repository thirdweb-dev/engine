/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class AccessTokensService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get all access tokens
     * Get all access tokens
     * @returns any Default Response
     * @throws ApiError
     */
    public getAll(): CancelablePromise<{
        result: Array<{
            id: string;
            tokenMask: string;
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            createdAt: string;
            expiresAt: string;
            label: (string | null);
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/auth/access-tokens/get-all',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Create a new access token
     * Create a new access token
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public create(
        requestBody?: {
            label?: string;
        },
    ): CancelablePromise<{
        result: {
            id: string;
            tokenMask: string;
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            createdAt: string;
            expiresAt: string;
            label: (string | null);
            accessToken: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/auth/access-tokens/create',
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
     * Revoke an access token
     * Revoke an access token
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public revoke(
        requestBody: {
            id: string;
        },
    ): CancelablePromise<{
        result: {
            success: boolean;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/auth/access-tokens/revoke',
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
     * Update an access token
     * Update an access token
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public update(
        requestBody: {
            id: string;
            label?: string;
        },
    ): CancelablePromise<{
        result: {
            success: boolean;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/auth/access-tokens/update',
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
