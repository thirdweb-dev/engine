/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class RelayerService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get all meta-transaction relayers
     * Get all meta-transaction relayers
     * @returns any Default Response
     * @throws ApiError
     */
    public getAll(): CancelablePromise<{
result: Array<{
id: string;
name: (string | null);
chainId: string;
/**
 * A contract or wallet address
 */
backendWalletAddress: string;
allowedContracts: (Array<string> | null);
allowedForwarders: (Array<string> | null);
}>;
}> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/relayer/get-all',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Create a new meta-transaction relayer
     * Create a new meta-transaction relayer
     * @param requestBody 
     * @returns any Default Response
     * @throws ApiError
     */
    public create(
requestBody: {
name?: string;
/**
 * A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
 */
chain: string;
/**
 * The address of the backend wallet to use for relaying transactions.
 */
backendWalletAddress: string;
allowedContracts?: Array<string>;
allowedForwarders?: Array<string>;
},
): CancelablePromise<{
result: {
relayerId: string;
};
}> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/relayer/create',
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
     * Revoke a relayer
     * Revoke a relayer
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
            url: '/relayer/revoke',
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
     * Update a relayer
     * Update a relayer
     * @param requestBody 
     * @returns any Default Response
     * @throws ApiError
     */
    public update(
requestBody: {
id: string;
name?: string;
/**
 * A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
 */
chain?: string;
/**
 * A contract or wallet address
 */
backendWalletAddress?: string;
allowedContracts?: Array<string>;
allowedForwarders?: Array<string>;
},
): CancelablePromise<{
result: {
success: boolean;
};
}> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/relayer/update',
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
     * Relay a meta-transaction
     * Relay an EIP-2771 meta-transaction
     * @param relayerId 
     * @param requestBody 
     * @returns any Default Response
     * @throws ApiError
     */
    public relay(
relayerId: string,
requestBody?: ({
type: 'forward';
request: {
from: string;
to: string;
value: string;
gas: string;
nonce: string;
data: string;
chainid?: string;
};
signature: string;
/**
 * A contract or wallet address
 */
forwarderAddress: string;
} | {
type: 'permit';
request: {
to: string;
owner: string;
spender: string;
value: string;
nonce: string;
deadline: string;
};
signature: string;
} | {
type: 'execute-meta-transaction';
request: {
from: string;
to: string;
data: string;
};
signature: string;
}),
): CancelablePromise<{
result: {
/**
 * Queue ID
 */
queueId: string;
};
}> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/relayer/{relayerId}',
            path: {
                'relayerId': relayerId,
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
