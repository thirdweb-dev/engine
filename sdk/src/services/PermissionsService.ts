/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class PermissionsService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get all permissions
     * Get all users with their corresponding permissions
     * @returns any Default Response
     * @throws ApiError
     */
    public getAll(): CancelablePromise<{
        result: Array<{
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            permissions: string;
            label: (string | null);
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/auth/permissions/get-all',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Grant permissions to user
     * Grant permissions to a user
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public grant(
        requestBody: {
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            permissions: ('ADMIN' | 'OWNER');
            label?: string;
        },
    ): CancelablePromise<{
        result: {
            success: boolean;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/auth/permissions/grant',
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
     * Revoke permissions from user
     * Revoke a user's permissions
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public revoke(
        requestBody: {
            /**
             * A contract or wallet address
             */
            walletAddress: string;
        },
    ): CancelablePromise<{
        result: {
            success: boolean;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/auth/permissions/revoke',
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
