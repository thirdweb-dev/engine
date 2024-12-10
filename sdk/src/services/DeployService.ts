/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class DeployService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Deploy Edition
     * Deploy an Edition contract.
     * @param chain Chain ID or name
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, engine will try to resolve it from the chain.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public deployEdition(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            contractMetadata: {
                name: string;
                description?: string;
                image?: string;
                external_link?: string;
                app_uri?: string;
                defaultAdmin?: string;
                seller_fee_basis_points: number;
                fee_recipient: string;
                symbol: string;
                platform_fee_basis_points: number;
                platform_fee_recipient: string;
                primary_sale_recipient?: string;
                trusted_forwarders: Array<string>;
            };
            /**
             * Version of the contract to deploy. Defaults to latest.
             */
            version?: string;
            forceDirectDeploy?: boolean;
            saltForProxyDeploy?: string;
            compilerOptions?: {
                compilerType: 'zksolc';
                compilerVersion?: string;
                evmVersion?: string;
            };
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
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
            url: '/deploy/{chain}/prebuilts/edition',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Deploy Edition Drop
     * Deploy an Edition Drop contract.
     * @param chain Chain ID or name
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, engine will try to resolve it from the chain.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public deployEditionDrop(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            contractMetadata: {
                name: string;
                description?: string;
                image?: string;
                external_link?: string;
                app_uri?: string;
                defaultAdmin?: string;
                seller_fee_basis_points: number;
                fee_recipient: string;
                merkle?: Record<string, string>;
                symbol: string;
                platform_fee_basis_points: number;
                platform_fee_recipient: string;
                primary_sale_recipient?: string;
                trusted_forwarders: Array<string>;
            };
            /**
             * Version of the contract to deploy. Defaults to latest.
             */
            version?: string;
            forceDirectDeploy?: boolean;
            saltForProxyDeploy?: string;
            compilerOptions?: {
                compilerType: 'zksolc';
                compilerVersion?: string;
                evmVersion?: string;
            };
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
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
            url: '/deploy/{chain}/prebuilts/edition-drop',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Deploy Marketplace
     * Deploy a Marketplace contract.
     * @param chain Chain ID or name
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, engine will try to resolve it from the chain.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public deployMarketplaceV3(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            contractMetadata: {
                name: string;
                description?: string;
                image?: string;
                external_link?: string;
                app_uri?: string;
                defaultAdmin?: string;
                platform_fee_basis_points: number;
                platform_fee_recipient: string;
                trusted_forwarders: Array<string>;
            };
            /**
             * Version of the contract to deploy. Defaults to latest.
             */
            version?: string;
            forceDirectDeploy?: boolean;
            saltForProxyDeploy?: string;
            compilerOptions?: {
                compilerType: 'zksolc';
                compilerVersion?: string;
                evmVersion?: string;
            };
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
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
            url: '/deploy/{chain}/prebuilts/marketplace-v3',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Deploy Multiwrap
     * Deploy a Multiwrap contract.
     * @param chain Chain ID or name
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, engine will try to resolve it from the chain.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public deployMultiwrap(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            contractMetadata: {
                name: string;
                description?: string;
                image?: string;
                external_link?: string;
                app_uri?: string;
                defaultAdmin?: string;
                seller_fee_basis_points: number;
                fee_recipient: string;
                symbol: string;
                trusted_forwarders: Array<string>;
            };
            /**
             * Version of the contract to deploy. Defaults to latest.
             */
            version?: string;
            forceDirectDeploy?: boolean;
            saltForProxyDeploy?: string;
            compilerOptions?: {
                compilerType: 'zksolc';
                compilerVersion?: string;
                evmVersion?: string;
            };
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
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
            url: '/deploy/{chain}/prebuilts/multiwrap',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Deploy NFT Collection
     * Deploy an NFT Collection contract.
     * @param chain Chain ID or name
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, engine will try to resolve it from the chain.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public deployNftCollection(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            contractMetadata: {
                name: string;
                description?: string;
                image?: string;
                external_link?: string;
                app_uri?: string;
                defaultAdmin?: string;
                seller_fee_basis_points: number;
                fee_recipient: string;
                symbol: string;
                platform_fee_basis_points: number;
                platform_fee_recipient: string;
                primary_sale_recipient?: string;
                trusted_forwarders: Array<string>;
            };
            /**
             * Version of the contract to deploy. Defaults to latest.
             */
            version?: string;
            forceDirectDeploy?: boolean;
            saltForProxyDeploy?: string;
            compilerOptions?: {
                compilerType: 'zksolc';
                compilerVersion?: string;
                evmVersion?: string;
            };
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
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
            url: '/deploy/{chain}/prebuilts/nft-collection',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Deploy NFT Drop
     * Deploy an NFT Drop contract.
     * @param chain Chain ID or name
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, engine will try to resolve it from the chain.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public deployNftDrop(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            contractMetadata: {
                name: string;
                description?: string;
                image?: string;
                external_link?: string;
                app_uri?: string;
                defaultAdmin?: string;
                seller_fee_basis_points: number;
                fee_recipient: string;
                merkle?: Record<string, string>;
                symbol: string;
                platform_fee_basis_points: number;
                platform_fee_recipient: string;
                primary_sale_recipient?: string;
                trusted_forwarders: Array<string>;
            };
            /**
             * Version of the contract to deploy. Defaults to latest.
             */
            version?: string;
            forceDirectDeploy?: boolean;
            saltForProxyDeploy?: string;
            compilerOptions?: {
                compilerType: 'zksolc';
                compilerVersion?: string;
                evmVersion?: string;
            };
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
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
            url: '/deploy/{chain}/prebuilts/nft-drop',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Deploy Pack
     * Deploy a Pack contract.
     * @param chain Chain ID or name
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, engine will try to resolve it from the chain.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public deployPack(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            contractMetadata: {
                name: string;
                description?: string;
                image?: string;
                external_link?: string;
                app_uri?: string;
                defaultAdmin?: string;
                seller_fee_basis_points: number;
                fee_recipient: string;
                symbol: string;
                platform_fee_basis_points: number;
                platform_fee_recipient: string;
                trusted_forwarders: Array<string>;
            };
            /**
             * Version of the contract to deploy. Defaults to latest.
             */
            version?: string;
            forceDirectDeploy?: boolean;
            saltForProxyDeploy?: string;
            compilerOptions?: {
                compilerType: 'zksolc';
                compilerVersion?: string;
                evmVersion?: string;
            };
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
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
            url: '/deploy/{chain}/prebuilts/pack',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Deploy Signature Drop
     * Deploy a Signature Drop contract.
     * @param chain Chain ID or name
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, engine will try to resolve it from the chain.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public deploySignatureDrop(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            contractMetadata: {
                name: string;
                description?: string;
                image?: string;
                external_link?: string;
                app_uri?: string;
                defaultAdmin?: string;
                seller_fee_basis_points: number;
                fee_recipient: string;
                merkle?: Record<string, string>;
                symbol: string;
                platform_fee_basis_points: number;
                platform_fee_recipient: string;
                primary_sale_recipient?: string;
                trusted_forwarders: Array<string>;
            };
            /**
             * Version of the contract to deploy. Defaults to latest.
             */
            version?: string;
            forceDirectDeploy?: boolean;
            saltForProxyDeploy?: string;
            compilerOptions?: {
                compilerType: 'zksolc';
                compilerVersion?: string;
                evmVersion?: string;
            };
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
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
            url: '/deploy/{chain}/prebuilts/signature-drop',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Deploy Split
     * Deploy a Split contract.
     * @param chain Chain ID or name
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, engine will try to resolve it from the chain.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public deploySplit(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            contractMetadata: {
                name: string;
                description?: string;
                image?: string;
                external_link?: string;
                app_uri?: string;
                defaultAdmin?: string;
                recipients: Array<{
                    /**
                     * A contract or wallet address
                     */
                    address: string;
                    sharesBps: number;
                }>;
                trusted_forwarders: Array<string>;
            };
            /**
             * Version of the contract to deploy. Defaults to latest.
             */
            version?: string;
            forceDirectDeploy?: boolean;
            saltForProxyDeploy?: string;
            compilerOptions?: {
                compilerType: 'zksolc';
                compilerVersion?: string;
                evmVersion?: string;
            };
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
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
            url: '/deploy/{chain}/prebuilts/split',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Deploy Token
     * Deploy a Token contract.
     * @param chain Chain ID or name
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, engine will try to resolve it from the chain.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public deployToken(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            contractMetadata: {
                name: string;
                description?: string;
                image?: string;
                external_link?: string;
                app_uri?: string;
                defaultAdmin?: string;
                symbol: string;
                platform_fee_basis_points: number;
                platform_fee_recipient: string;
                primary_sale_recipient?: string;
                trusted_forwarders: Array<string>;
            };
            /**
             * Version of the contract to deploy. Defaults to latest.
             */
            version?: string;
            forceDirectDeploy?: boolean;
            saltForProxyDeploy?: string;
            compilerOptions?: {
                compilerType: 'zksolc';
                compilerVersion?: string;
                evmVersion?: string;
            };
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
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
            url: '/deploy/{chain}/prebuilts/token',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Deploy Token Drop
     * Deploy a Token Drop contract.
     * @param chain Chain ID or name
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, engine will try to resolve it from the chain.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public deployTokenDrop(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            contractMetadata: {
                name: string;
                description?: string;
                image?: string;
                external_link?: string;
                app_uri?: string;
                defaultAdmin?: string;
                merkle?: Record<string, string>;
                symbol: string;
                platform_fee_basis_points: number;
                platform_fee_recipient: string;
                primary_sale_recipient?: string;
                trusted_forwarders: Array<string>;
            };
            /**
             * Version of the contract to deploy. Defaults to latest.
             */
            version?: string;
            forceDirectDeploy?: boolean;
            saltForProxyDeploy?: string;
            compilerOptions?: {
                compilerType: 'zksolc';
                compilerVersion?: string;
                evmVersion?: string;
            };
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
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
            url: '/deploy/{chain}/prebuilts/token-drop',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Deploy Vote
     * Deploy a Vote contract.
     * @param chain Chain ID or name
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, engine will try to resolve it from the chain.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public deployVote(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            contractMetadata: {
                name: string;
                description?: string;
                image?: string;
                external_link?: string;
                app_uri?: string;
                defaultAdmin?: string;
                voting_delay_in_blocks: number;
                voting_period_in_blocks: number;
                /**
                 * A contract or wallet address
                 */
                voting_token_address: string;
                voting_quorum_fraction: number;
                proposal_token_threshold: string;
                trusted_forwarders: Array<string>;
            };
            /**
             * Version of the contract to deploy. Defaults to latest.
             */
            version?: string;
            forceDirectDeploy?: boolean;
            saltForProxyDeploy?: string;
            compilerOptions?: {
                compilerType: 'zksolc';
                compilerVersion?: string;
                evmVersion?: string;
            };
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
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
            url: '/deploy/{chain}/prebuilts/vote',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Deploy published contract
     * Deploy a published contract to the blockchain.
     * @param chain Chain ID or name
     * @param publisher Address or ENS of the publisher of the contract
     * @param contractName Name of the published contract to deploy
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, engine will try to resolve it from the chain.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public deployPublished(
        chain: string,
        publisher: string,
        contractName: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * Version of the contract to deploy. Defaults to latest.
             */
            version?: string;
            forceDirectDeploy?: boolean;
            saltForProxyDeploy?: string;
            compilerOptions?: {
                compilerType: 'zksolc';
                compilerVersion?: string;
                evmVersion?: string;
            };
            /**
             * Constructor arguments for the deployment.
             */
            constructorParams: Array<any>;
            txOverrides?: {
                /**
                 * Gas limit for the transaction
                 */
                gas?: string;
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
        xIdempotencyKey?: string,
        xAccountAddress?: string,
        xAccountFactoryAddress?: string,
        xAccountSalt?: string,
    ): CancelablePromise<{
        queueId?: string;
        /**
         * Not all contracts return a deployed address.
         */
        deployedAddress?: string;
        message?: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/deploy/{chain}/{publisher}/{contractName}',
            path: {
                'chain': chain,
                'publisher': publisher,
                'contractName': contractName,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-account-address': xAccountAddress,
                'x-account-factory-address': xAccountFactoryAddress,
                'x-account-salt': xAccountSalt,
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
     * Get contract types
     * Get all prebuilt contract types.
     * @returns any Default Response
     * @throws ApiError
     */
    public contractTypes(): CancelablePromise<{
        result: Array<string>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/deploy/contract-types',
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

}
