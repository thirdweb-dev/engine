/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class BackendWalletService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Create backend wallet
     * Create a backend wallet.
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public create(
        requestBody?: {
            label?: string;
            /**
             * Type of new wallet to create. It is recommended to always provide this value. If not provided, the default wallet type will be used.
             */
            type?: ('local' | 'aws-kms' | 'gcp-kms' | 'smart:aws-kms' | 'smart:gcp-kms' | 'smart:local');
        },
    ): CancelablePromise<{
        result: {
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            status: string;
            type: ('local' | 'aws-kms' | 'gcp-kms' | 'smart:aws-kms' | 'smart:gcp-kms' | 'smart:local');
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/backend-wallet/create',
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
     * Remove backend wallet
     * Remove an existing backend wallet. NOTE: This is an irreversible action for local wallets. Ensure any funds are transferred out before removing a local wallet.
     * @param walletAddress A contract or wallet address
     * @returns any Default Response
     * @throws ApiError
     */
    public removeBackendWallet(
        walletAddress: string,
    ): CancelablePromise<{
        result: {
            status: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'DELETE',
            url: '/backend-wallet/{walletAddress}',
            path: {
                'walletAddress': walletAddress,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Import backend wallet
     * Import an existing wallet as a backend wallet.
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public import(
        requestBody?: ({
            /**
             * Optional label for the imported wallet
             */
            label?: string;
        } & ({
            /**
             * AWS KMS key ARN
             */
            awsKmsArn: string;
            /**
             * Optional AWS credentials to use for importing the wallet, if not provided, the default AWS credentials will be used (if available).
             */
            credentials?: {
                /**
                 * AWS Access Key ID
                 */
                awsAccessKeyId: string;
                /**
                 * AWS Secret Access Key
                 */
                awsSecretAccessKey: string;
            };
        } | {
            /**
             * GCP KMS key ID
             */
            gcpKmsKeyId: string;
            /**
             * GCP KMS key version ID
             */
            gcpKmsKeyVersionId: string;
            /**
             * Optional GCP credentials to use for importing the wallet, if not provided, the default GCP credentials will be used (if available).
             */
            credentials?: {
                /**
                 * GCP service account email
                 */
                email: string;
                /**
                 * GCP service account private key
                 */
                privateKey: string;
            };
        } | {
            /**
             * The private key of the wallet to import
             */
            privateKey: string;
        } | {
            /**
             * The mnemonic phrase of the wallet to import
             */
            mnemonic: string;
        } | {
            /**
             * The encrypted JSON of the wallet to import
             */
            encryptedJson: string;
            /**
             * The password used to encrypt the encrypted JSON
             */
            password: string;
        })),
    ): CancelablePromise<{
        result: {
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            status: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/backend-wallet/import',
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
     * Update backend wallet
     * Update a backend wallet.
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public update(
        requestBody: {
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            label?: string;
        },
    ): CancelablePromise<{
        result: {
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            status: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/backend-wallet/update',
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
     * Get balance
     * Get the native balance for a backend wallet.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param walletAddress Backend wallet address
     * @returns any Default Response
     * @throws ApiError
     */
    public getBalance(
        chain: string,
        walletAddress: string,
    ): CancelablePromise<{
        result: {
            /**
             * A contract or wallet address
             */
            walletAddress: string;
            name: string;
            symbol: string;
            decimals: number;
            value: string;
            displayValue: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/backend-wallet/{chain}/{walletAddress}/get-balance',
            path: {
                'chain': chain,
                'walletAddress': walletAddress,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get all backend wallets
     * Get all backend wallets.
     * @param page The page of wallets to get.
     * @param limit The number of wallets to get per page.
     * @returns any Default Response
     * @throws ApiError
     */
    public getAll(
        page: number = 1,
        limit: number = 10,
    ): CancelablePromise<{
        result: Array<{
            /**
             * Wallet Address
             */
            address: string;
            /**
             * Wallet Type
             */
            type: string;
            label: (string | null);
            awsKmsKeyId: (string | null);
            awsKmsArn: (string | null);
            gcpKmsKeyId: (string | null);
            gcpKmsKeyRingId: (string | null);
            gcpKmsLocationId: (string | null);
            gcpKmsKeyVersionId: (string | null);
            gcpKmsResourcePath: (string | null);
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/backend-wallet/get-all',
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
     * Transfer tokens
     * Transfer native currency or ERC20 tokens to another wallet.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xTransactionMode Transaction mode to use for EOA transactions. Will be ignored if using a smart wallet. If omitted, defaults to regular EOA transactions.
     * @returns any Default Response
     * @throws ApiError
     */
    public transfer(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * The recipient wallet address.
             */
            to: string;
            /**
             * The token address to transfer. Omit to transfer the chain's native currency (e.g. ETH on Ethereum).
             */
            currencyAddress?: string;
            /**
             * The amount in ether to transfer. Example: "0.1" to send 0.1 ETH.
             */
            amount: string;
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
        xTransactionMode?: 'sponsored',
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
            url: '/backend-wallet/{chain}/transfer',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-transaction-mode': xTransactionMode,
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
     * Withdraw funds
     * Withdraw all funds from this wallet to another wallet.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xTransactionMode Transaction mode to use for EOA transactions. Will be ignored if using a smart wallet. If omitted, defaults to regular EOA transactions.
     * @returns any Default Response
     * @throws ApiError
     */
    public withdraw(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * Address to withdraw all funds to
             */
            toAddress: string;
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
            };
        },
        simulateTx: boolean = false,
        xIdempotencyKey?: string,
        xTransactionMode?: 'sponsored',
    ): CancelablePromise<{
        result: {
            /**
             * A transaction hash
             */
            transactionHash: string;
            /**
             * An amount in native token (decimals allowed). Example: "0.1"
             */
            amount: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/backend-wallet/{chain}/withdraw',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-transaction-mode': xTransactionMode,
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
     * Send a transaction
     * Send a transaction with transaction parameters
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xTransactionMode Transaction mode to use for EOA transactions. Will be ignored if using a smart wallet. If omitted, defaults to regular EOA transactions.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public sendTransaction(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * A contract or wallet address
             */
            toAddress?: string;
            data: string;
            value: string;
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
            };
        },
        simulateTx: boolean = false,
        xIdempotencyKey?: string,
        xTransactionMode?: 'sponsored',
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
            url: '/backend-wallet/{chain}/send-transaction',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-transaction-mode': xTransactionMode,
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
     * Send a batch of raw transactions
     * Send a batch of raw transactions with transaction parameters
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param xBackendWalletAddress Backend wallet address
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xTransactionMode Transaction mode to use for EOA transactions. Will be ignored if using a smart wallet. If omitted, defaults to regular EOA transactions.
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public sendTransactionBatch(
        chain: string,
        xBackendWalletAddress: string,
        xIdempotencyKey?: string,
        xTransactionMode?: 'sponsored',
        requestBody?: Array<{
            /**
             * A contract or wallet address
             */
            toAddress?: string;
            data: string;
            value: string;
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
        }>,
    ): CancelablePromise<{
        result: {
            queueIds: Array<string>;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/backend-wallet/{chain}/send-transaction-batch',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-transaction-mode': xTransactionMode,
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
     * Send a batch of raw transactions atomically
     * Send a batch of raw transactions in a single UserOp. Can only be used with smart wallets.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
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
    public sendTransactionsAtomic(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            transactions: Array<{
                /**
                 * A contract or wallet address
                 */
                toAddress?: string;
                data: string;
                value: string;
            }>;
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
            url: '/backend-wallet/{chain}/send-transactions-atomic',
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
     * Sign a transaction
     * Sign a transaction
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xTransactionMode Transaction mode to use for EOA transactions. Will be ignored if using a smart wallet. If omitted, defaults to regular EOA transactions.
     * @returns any Default Response
     * @throws ApiError
     */
    public signTransaction(
        xBackendWalletAddress: string,
        requestBody: {
            transaction: {
                to?: string;
                nonce?: string;
                gasLimit?: string;
                gasPrice?: string;
                data?: string;
                value?: string;
                chainId?: number;
                type?: number;
                accessList?: any;
                maxFeePerGas?: string;
                maxPriorityFeePerGas?: string;
                ccipReadEnabled?: boolean;
            };
        },
        xIdempotencyKey?: string,
        xTransactionMode?: 'sponsored',
    ): CancelablePromise<{
        result: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/backend-wallet/sign-transaction',
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-transaction-mode': xTransactionMode,
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
     * Sign a message
     * Send a message
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xTransactionMode Transaction mode to use for EOA transactions. Will be ignored if using a smart wallet. If omitted, defaults to regular EOA transactions.
     * @returns any Default Response
     * @throws ApiError
     */
    public signMessage(
        xBackendWalletAddress: string,
        requestBody: {
            message: string;
            isBytes?: boolean;
            chainId?: number;
        },
        xIdempotencyKey?: string,
        xTransactionMode?: 'sponsored',
    ): CancelablePromise<{
        result: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/backend-wallet/sign-message',
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-transaction-mode': xTransactionMode,
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
     * Sign an EIP-712 message
     * Send an EIP-712 message ("typed data")
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xTransactionMode Transaction mode to use for EOA transactions. Will be ignored if using a smart wallet. If omitted, defaults to regular EOA transactions.
     * @returns any Default Response
     * @throws ApiError
     */
    public signTypedData(
        xBackendWalletAddress: string,
        requestBody: {
            domain: Record<string, any>;
            types: Record<string, any>;
            value: Record<string, any>;
        },
        xIdempotencyKey?: string,
        xTransactionMode?: 'sponsored',
    ): CancelablePromise<{
        result: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/backend-wallet/sign-typed-data',
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-transaction-mode': xTransactionMode,
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
     * Get recent transactions
     * Get recent transactions for this backend wallet.
     * @param status The status to query: 'queued', 'mined', 'errored', or 'cancelled'. Default: 'queued'
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param walletAddress Backend wallet address
     * @param page Specify the page number.
     * @param limit Specify the number of results to return per page.
     * @returns any Default Response
     * @throws ApiError
     */
    public getTransactionsForBackendWallet(
        status: ('queued' | 'mined' | 'cancelled' | 'errored'),
        chain: string,
        walletAddress: string,
        page: number = 1,
        limit: number = 100,
    ): CancelablePromise<{
        result: {
            transactions: Array<{
                queueId: (string | null);
                /**
                 * The current state of the transaction.
                 */
                status: ('queued' | 'sent' | 'mined' | 'errored' | 'cancelled');
                chainId: (string | null);
                fromAddress: (string | null);
                toAddress: (string | null);
                data: (string | null);
                extension: (string | null);
                value: (string | null);
                nonce: (number | string | null);
                gasLimit: (string | null);
                gasPrice: (string | null);
                maxFeePerGas: (string | null);
                maxPriorityFeePerGas: (string | null);
                transactionType: (number | null);
                transactionHash: (string | null);
                queuedAt: (string | null);
                sentAt: (string | null);
                minedAt: (string | null);
                cancelledAt: (string | null);
                deployedContractAddress: (string | null);
                deployedContractType: (string | null);
                errorMessage: (string | null);
                sentAtBlockNumber: (number | null);
                blockNumber: (number | null);
                /**
                 * The number of retry attempts
                 */
                retryCount: number;
                retryGasValues: (boolean | null);
                retryMaxFeePerGas: (string | null);
                retryMaxPriorityFeePerGas: (string | null);
                signerAddress: (string | null);
                accountAddress: (string | null);
                accountSalt: (string | null);
                accountFactoryAddress: (string | null);
                target: (string | null);
                sender: (string | null);
                initCode: (string | null);
                callData: (string | null);
                callGasLimit: (string | null);
                verificationGasLimit: (string | null);
                preVerificationGas: (string | null);
                paymasterAndData: (string | null);
                userOpHash: (string | null);
                functionName: (string | null);
                functionArgs: (string | null);
                onChainTxStatus: (number | null);
                onchainStatus: ('success' | 'reverted' | null);
                effectiveGasPrice: (string | null);
                cumulativeGasUsed: (string | null);
                batchOperations: null;
            }>;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/backend-wallet/{chain}/{walletAddress}/get-all-transactions',
            path: {
                'chain': chain,
                'walletAddress': walletAddress,
            },
            query: {
                'page': page,
                'limit': limit,
                'status': status,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get recent transactions by nonce
     * Get recent transactions for this backend wallet, sorted by descending nonce.
     * @param fromNonce The earliest nonce, inclusive.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param walletAddress Backend wallet address
     * @param toNonce The latest nonce, inclusive. If omitted, queries up to the latest sent nonce.
     * @returns any Default Response
     * @throws ApiError
     */
    public getTransactionsForBackendWalletByNonce(
        fromNonce: number,
        chain: string,
        walletAddress: string,
        toNonce?: number,
    ): CancelablePromise<{
        result: Array<{
            nonce: number;
            transaction: ({
                queueId: (string | null);
                /**
                 * The current state of the transaction.
                 */
                status: ('queued' | 'sent' | 'mined' | 'errored' | 'cancelled');
                chainId: (string | null);
                fromAddress: (string | null);
                toAddress: (string | null);
                data: (string | null);
                extension: (string | null);
                value: (string | null);
                nonce: (number | string | null);
                gasLimit: (string | null);
                gasPrice: (string | null);
                maxFeePerGas: (string | null);
                maxPriorityFeePerGas: (string | null);
                transactionType: (number | null);
                transactionHash: (string | null);
                queuedAt: (string | null);
                sentAt: (string | null);
                minedAt: (string | null);
                cancelledAt: (string | null);
                deployedContractAddress: (string | null);
                deployedContractType: (string | null);
                errorMessage: (string | null);
                sentAtBlockNumber: (number | null);
                blockNumber: (number | null);
                /**
                 * The number of retry attempts
                 */
                retryCount: number;
                retryGasValues: (boolean | null);
                retryMaxFeePerGas: (string | null);
                retryMaxPriorityFeePerGas: (string | null);
                signerAddress: (string | null);
                accountAddress: (string | null);
                accountSalt: (string | null);
                accountFactoryAddress: (string | null);
                target: (string | null);
                sender: (string | null);
                initCode: (string | null);
                callData: (string | null);
                callGasLimit: (string | null);
                verificationGasLimit: (string | null);
                preVerificationGas: (string | null);
                paymasterAndData: (string | null);
                userOpHash: (string | null);
                functionName: (string | null);
                functionArgs: (string | null);
                onChainTxStatus: (number | null);
                onchainStatus: ('success' | 'reverted' | null);
                effectiveGasPrice: (string | null);
                cumulativeGasUsed: (string | null);
                batchOperations: null;
            } | string);
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/backend-wallet/{chain}/{walletAddress}/get-transactions-by-nonce',
            path: {
                'chain': chain,
                'walletAddress': walletAddress,
            },
            query: {
                'fromNonce': fromNonce,
                'toNonce': toNonce,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Reset nonces
     * Reset nonces for all backend wallets. This is for debugging purposes and does not impact held tokens.
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public resetNonces(
        requestBody?: {
            /**
             * The chain ID to reset nonces for.
             */
            chainId?: number;
            /**
             * The backend wallet address to reset nonces for. Omit to reset all backend wallets.
             */
            walletAddress?: string;
        },
    ): CancelablePromise<{
        result: {
            status: string;
            /**
             * The number of backend wallets processed.
             */
            count: number;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/backend-wallet/reset-nonces',
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
     * Cancel nonces
     * Cancel all nonces up to the provided nonce. This is useful to unblock a backend wallet that has transactions waiting for nonces to be mined.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param simulateTx Simulates the transaction before adding it to the queue, returning an error if it fails simulation. Note: This step is less performant and recommended only for debugging purposes.
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xTransactionMode Transaction mode to use for EOA transactions. Will be ignored if using a smart wallet. If omitted, defaults to regular EOA transactions.
     * @returns any Default Response
     * @throws ApiError
     */
    public cancelNonces(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * The nonce to cancel up to, inclusive. Example: If the onchain nonce is 10 and 'toNonce' is 15, this request will cancel nonces: 11, 12, 13, 14, 15
             */
            toNonce: number;
        },
        simulateTx: boolean = false,
        xIdempotencyKey?: string,
        xTransactionMode?: 'sponsored',
    ): CancelablePromise<{
        result: {
            cancelledNonces: Array<number>;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/backend-wallet/{chain}/cancel-nonces',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-transaction-mode': xTransactionMode,
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
     * Get nonce
     * Get the last used nonce for this backend wallet. This value managed by Engine may differ from the onchain value. Use `/backend-wallet/reset-nonces` if this value looks incorrect while idle.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param walletAddress Backend wallet address
     * @returns any Default Response
     * @throws ApiError
     */
    public getNonce(
        chain: string,
        walletAddress: string,
    ): CancelablePromise<{
        result: {
            nonce: number;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/backend-wallet/{chain}/{walletAddress}/get-nonce',
            path: {
                'chain': chain,
                'walletAddress': walletAddress,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Simulate a transaction
     * Simulate a transaction with transaction parameters
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xTransactionMode Transaction mode to use for EOA transactions. Will be ignored if using a smart wallet. If omitted, defaults to regular EOA transactions.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, Engine will try to resolve it from the contract.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public simulateTransaction(
        chain: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * The contract address
             */
            toAddress: string;
            /**
             * The amount of native currency in wei
             */
            value?: string;
            /**
             * The function to call on the contract
             */
            functionName?: string;
            /**
             * The arguments to call for this function
             */
            args?: Array<(string | number | boolean)>;
            /**
             * Raw calldata
             */
            data?: string;
        },
        xIdempotencyKey?: string,
        xTransactionMode?: 'sponsored',
        xAccountAddress?: string,
        xAccountFactoryAddress?: string,
        xAccountSalt?: string,
    ): CancelablePromise<{
        result: {
            /**
             * Simulation Success
             */
            success: boolean;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/backend-wallet/{chain}/simulate-transaction',
            path: {
                'chain': chain,
            },
            headers: {
                'x-backend-wallet-address': xBackendWalletAddress,
                'x-idempotency-key': xIdempotencyKey,
                'x-transaction-mode': xTransactionMode,
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

}
