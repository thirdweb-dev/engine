/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class AccountService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get all admins
     * Get all admins for a smart account.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getAllAdmins(
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        /**
         * The address of the admins on this account
         */
        result: Array<string>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/account/admins/get-all',
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
     * Get all session keys
     * Get all session keys for a smart account.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getAllSessions(
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result: Array<{
            /**
             * A contract or wallet address
             */
            signerAddress: string;
            startDate: string;
            expirationDate: string;
            nativeTokenLimitPerTransaction: string;
            approvedCallTargets: Array<string>;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/account/sessions/get-all',
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
     * Grant admin
     * Grant a smart account's admin permission.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public grantAdmin(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * Address to grant admin permissions to
             */
            signerAddress: string;
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
                /**
                 * Gas price for the transaction. Do not use this if maxFeePerGas is set or if you want to use EIP-1559 type transactions. Only use this if you want to use legacy transactions.
                 */
                gasPrice?: string;
                /**
                 * Maximum fee per gas
                 */
                maxFeePerGas?: string;
                /**
                 * Maximum priority fee per gas
                 */
                maxPriorityFeePerGas?: string;
                /**
                 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
                 */
                timeoutSeconds?: number;
                /**
                 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
                 */
                value?: string;
            };
        },
        simulateTx: boolean = false,
        xIdempotencyKey?: string,
        xAccountAddress?: string,
        xAccountFactoryAddress?: string,
        xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/account/admins/grant',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
            },
            query: {
                'simulateTx': simulateTx,
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

    /**
     * Revoke admin
     * Revoke a smart account's admin permission.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public revokeAdmin(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * Address to revoke admin permissions from
             */
            walletAddress: string;
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
                /**
                 * Gas price for the transaction. Do not use this if maxFeePerGas is set or if you want to use EIP-1559 type transactions. Only use this if you want to use legacy transactions.
                 */
                gasPrice?: string;
                /**
                 * Maximum fee per gas
                 */
                maxFeePerGas?: string;
                /**
                 * Maximum priority fee per gas
                 */
                maxPriorityFeePerGas?: string;
                /**
                 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
                 */
                timeoutSeconds?: number;
                /**
                 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
                 */
                value?: string;
            };
        },
        simulateTx: boolean = false,
        xIdempotencyKey?: string,
        xAccountAddress?: string,
        xAccountFactoryAddress?: string,
        xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/account/admins/revoke',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
            },
            query: {
                'simulateTx': simulateTx,
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

    /**
     * Create session key
     * Create a session key for a smart account.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public grantSession(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * A contract or wallet address
             */
            signerAddress: string;
            startDate: string;
            expirationDate: string;
            nativeTokenLimitPerTransaction: string;
            approvedCallTargets: Array<string>;
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
                /**
                 * Gas price for the transaction. Do not use this if maxFeePerGas is set or if you want to use EIP-1559 type transactions. Only use this if you want to use legacy transactions.
                 */
                gasPrice?: string;
                /**
                 * Maximum fee per gas
                 */
                maxFeePerGas?: string;
                /**
                 * Maximum priority fee per gas
                 */
                maxPriorityFeePerGas?: string;
                /**
                 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
                 */
                timeoutSeconds?: number;
                /**
                 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
                 */
                value?: string;
            };
        },
        simulateTx: boolean = false,
        xIdempotencyKey?: string,
        xAccountAddress?: string,
        xAccountFactoryAddress?: string,
        xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/account/sessions/create',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
            },
            query: {
                'simulateTx': simulateTx,
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

    /**
     * Revoke session key
     * Revoke a session key for a smart account.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public revokeSession(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * Address to revoke session from
             */
            walletAddress: string;
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
                /**
                 * Gas price for the transaction. Do not use this if maxFeePerGas is set or if you want to use EIP-1559 type transactions. Only use this if you want to use legacy transactions.
                 */
                gasPrice?: string;
                /**
                 * Maximum fee per gas
                 */
                maxFeePerGas?: string;
                /**
                 * Maximum priority fee per gas
                 */
                maxPriorityFeePerGas?: string;
                /**
                 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
                 */
                timeoutSeconds?: number;
                /**
                 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
                 */
                value?: string;
            };
        },
        simulateTx: boolean = false,
        xIdempotencyKey?: string,
        xAccountAddress?: string,
        xAccountFactoryAddress?: string,
        xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/account/sessions/revoke',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
            },
            query: {
                'simulateTx': simulateTx,
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

    /**
     * Update session key
     * Update a session key for a smart account.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public updateSession(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * A contract or wallet address
             */
            signerAddress: string;
            approvedCallTargets: Array<string>;
            startDate?: string;
            expirationDate?: string;
            nativeTokenLimitPerTransaction?: string;
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
                /**
                 * Gas price for the transaction. Do not use this if maxFeePerGas is set or if you want to use EIP-1559 type transactions. Only use this if you want to use legacy transactions.
                 */
                gasPrice?: string;
                /**
                 * Maximum fee per gas
                 */
                maxFeePerGas?: string;
                /**
                 * Maximum priority fee per gas
                 */
                maxPriorityFeePerGas?: string;
                /**
                 * Maximum duration that a transaction is valid. If a transaction cannot be sent before the timeout, the transaction will be set to 'errored'. Default: no timeout
                 */
                timeoutSeconds?: number;
                /**
                 * Amount of native currency in wei to send with this transaction. Used to transfer funds or pay a contract.
                 */
                value?: string;
            };
        },
        simulateTx: boolean = false,
        xIdempotencyKey?: string,
        xAccountAddress?: string,
        xAccountFactoryAddress?: string,
        xAccountSalt?: string,
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
            url: '/contract/{chain}/{contractAddress}/account/sessions/update',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
            },
            query: {
                'simulateTx': simulateTx,
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
