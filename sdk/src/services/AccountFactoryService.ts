/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class AccountFactoryService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get all smart accounts
     * Get all the smart accounts for this account factory.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getAllAccounts(
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        /**
         * The account addresses of all the accounts in this factory
         */
        result: Array<string>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/account-factory/get-all-accounts',
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
     * Get associated smart accounts
     * Get all the smart accounts for this account factory associated with the specific admin wallet.
     * @param signerAddress The address of the signer to get associated accounts from
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getAssociatedAccounts(
        signerAddress: string,
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        /**
         * The account addresses of all the accounts with a specific signer in this factory
         */
        result: Array<string>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/account-factory/get-associated-accounts',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'signerAddress': signerAddress,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Check if deployed
     * Check if a smart account has been deployed to the blockchain.
     * @param adminAddress The address of the admin to check if the account address is deployed
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param extraData Extra data to use in predicting the account address
     * @returns any Default Response
     * @throws ApiError
     */
    public isAccountDeployed(
        adminAddress: string,
        chain: string,
        contractAddress: string,
        extraData?: string,
    ): CancelablePromise<{
        /**
         * Whether or not the account has been deployed
         */
        result: boolean;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/account-factory/is-account-deployed',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'adminAddress': adminAddress,
                'extraData': extraData,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Predict smart account address
     * Get the counterfactual address of a smart account.
     * @param adminAddress The address of the admin to predict the account address for
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param extraData Extra data (account salt) to add to use in predicting the account address
     * @returns any Default Response
     * @throws ApiError
     */
    public predictAccountAddress(
        adminAddress: string,
        chain: string,
        contractAddress: string,
        extraData?: string,
    ): CancelablePromise<{
        /**
         * New account counter-factual address.
         */
        result: string;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/account-factory/predict-account-address',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'adminAddress': adminAddress,
                'extraData': extraData,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Create smart account
     * Create a smart account for this account factory.
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
    public createAccount(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * The admin address to create an account for
             */
            adminAddress: string;
            /**
             * Extra data to add to use in creating the account address
             */
            extraData?: string;
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
            queueId?: string;
            /**
             * A contract or wallet address
             */
            deployedAddress?: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/contract/{chain}/{contractAddress}/account-factory/create-account',
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
