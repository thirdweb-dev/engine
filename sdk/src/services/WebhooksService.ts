/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class WebhooksService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get all webhooks configured
     * Get all webhooks configuration data set up on Engine
     * @returns any Default Response
     * @throws ApiError
     */
    public getAll(): CancelablePromise<{
        result: Array<{
            url: string;
            name: (string | null);
            secret?: string;
            eventType: string;
            active: boolean;
            createdAt: string;
            id: number;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/webhooks/get-all',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Create a webhook
     * Create a webhook to call when certain blockchain events occur.
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public create(
        requestBody: {
            /**
             * Webhook URL
             */
            url: string;
            name?: string;
            eventType: ('queued_transaction' | 'sent_transaction' | 'mined_transaction' | 'errored_transaction' | 'cancelled_transaction' | 'all_transactions' | 'backend_wallet_balance' | 'auth' | 'contract_subscription');
        },
    ): CancelablePromise<{
        result: {
            url: string;
            name: (string | null);
            secret?: string;
            eventType: string;
            active: boolean;
            createdAt: string;
            id: number;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/webhooks/create',
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
     * Revoke webhook
     * Revoke a Webhook
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public revoke(
        requestBody: {
            id: number;
        },
    ): CancelablePromise<{
        result: {
            success: boolean;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/webhooks/revoke',
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
     * Get webhooks event types
     * Get the all the webhooks event types
     * @returns any Default Response
     * @throws ApiError
     */
    public getEventTypes(): CancelablePromise<{
        result: Array<('queued_transaction' | 'sent_transaction' | 'mined_transaction' | 'errored_transaction' | 'cancelled_transaction' | 'all_transactions' | 'backend_wallet_balance' | 'auth' | 'contract_subscription')>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/webhooks/event-types',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

}
