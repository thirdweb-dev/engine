/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class KeypairService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * List public keys
     * List the public keys configured with Engine
     * @returns any Default Response
     * @throws ApiError
     */
    public list(): CancelablePromise<{
result: Array<{
/**
 * A unique identifier for the keypair
 */
hash: string;
/**
 * The public key
 */
publicKey: string;
/**
 * The keypair algorithm.
 */
algorithm: string;
/**
 * A description for the keypair.
 */
label?: string;
/**
 * When the keypair was added
 */
createdAt: string;
/**
 * When the keypair was updated
 */
updatedAt: string;
}>;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/auth/keypair/get-all',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Add public key
     * Add the public key for a keypair
     * @param requestBody 
     * @returns any Default Response
     * @throws ApiError
     */
    public add(
requestBody: {
/**
 * The public key of your keypair beginning with '-----BEGIN PUBLIC KEY-----'.
 */
publicKey: string;
algorithm: ('RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512' | 'PS256' | 'PS384' | 'PS512');
label?: string;
},
): CancelablePromise<{
result: {
keypair: {
/**
 * A unique identifier for the keypair
 */
hash: string;
/**
 * The public key
 */
publicKey: string;
/**
 * The keypair algorithm.
 */
algorithm: string;
/**
 * A description for the keypair.
 */
label?: string;
/**
 * When the keypair was added
 */
createdAt: string;
/**
 * When the keypair was updated
 */
updatedAt: string;
};
};
}> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/auth/keypair/add',
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
     * Remove public key
     * Remove the public key for a keypair
     * @param requestBody 
     * @returns any Default Response
     * @throws ApiError
     */
    public remove(
requestBody: {
hash: string;
},
): CancelablePromise<{
result: {
success: boolean;
};
}> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/auth/keypair/remove',
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
