/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class TransactionService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get all transactions
     * Get all transaction requests.
     * @param status The status to query: 'queued', 'mined', 'errored', or 'cancelled'. Default: 'queued'
     * @param page Specify the page number.
     * @param limit Specify the number of results to return per page.
     * @returns any Default Response
     * @throws ApiError
     */
    public getAll(
        status: ('queued' | 'mined' | 'cancelled' | 'errored'),
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
            totalCount: number;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/transaction/get-all',
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
     * Get transaction status
     * Get the status for a transaction request.
     * @param queueId Transaction queue ID
     * @returns any Default Response
     * @throws ApiError
     */
    public status(
        queueId: string,
    ): CancelablePromise<{
        result: {
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
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/transaction/status/{queueId}',
            path: {
                'queueId': queueId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get all deployment transactions
     * Get all transaction requests to deploy contracts.
     * @param page Specify the page number for pagination.
     * @param limit Specify the number of transactions to return per page.
     * @returns any Default Response
     * @throws ApiError
     */
    public getAllDeployedContracts(
        page: number = 1,
        limit: number = 10,
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
            totalCount: number;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/transaction/get-all-deployed-contracts',
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
     * Retry transaction (synchronous)
     * Retry a transaction with updated gas settings. Blocks until the transaction is mined or errors.
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public syncRetry(
        requestBody: {
            /**
             * Transaction queue ID
             */
            queueId: string;
            maxFeePerGas?: string;
            maxPriorityFeePerGas?: string;
        },
    ): CancelablePromise<{
        result: {
            /**
             * A transaction hash
             */
            transactionHash: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/transaction/sync-retry',
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
     * Retry failed transaction
     * Retry a failed transaction
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public retryFailed(
        requestBody: {
            /**
             * Transaction queue ID
             */
            queueId: string;
        },
    ): CancelablePromise<{
        result: {
            message: string;
            status: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/transaction/retry-failed',
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
     * Cancel transaction
     * Attempt to cancel a transaction by sending a null transaction with a higher gas setting. This transaction is not guaranteed to be cancelled.
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public cancel(
        requestBody: {
            /**
             * Transaction queue ID
             */
            queueId: string;
        },
    ): CancelablePromise<{
        result: {
            /**
             * Transaction queue ID
             */
            queueId: string;
            /**
             * Response status
             */
            status: string;
            /**
             * Response message
             */
            message: string;
            /**
             * A transaction hash
             */
            transactionHash?: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/transaction/cancel',
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
     * Send a signed transaction
     * Send a signed transaction
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public sendRawTransaction(
        chain: string,
        requestBody: {
            signedTransaction: string;
        },
    ): CancelablePromise<{
        result: {
            /**
             * A transaction hash
             */
            transactionHash: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/transaction/{chain}/send-signed-transaction',
            path: {
                'chain': chain,
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
     * Send a signed user operation
     * Send a signed user operation
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public sendSignedUserOp(
        chain: string,
        requestBody: {
            signedUserOp: any;
        },
    ): CancelablePromise<({
        result: {
            /**
             * A transaction hash
             */
            userOpHash: string;
        };
    } | {
        error: {
            message: string;
        };
    })> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/transaction/{chain}/send-signed-user-op',
            path: {
                'chain': chain,
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
     * Get transaction receipt
     * Get the transaction receipt from a transaction hash.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param transactionHash Transaction hash
     * @returns any Default Response
     * @throws ApiError
     */
    public getTransactionReceipt(
        chain: string,
        transactionHash: string,
    ): CancelablePromise<{
        result: ({
            to?: string;
            from?: string;
            contractAddress?: (string | null);
            transactionIndex?: number;
            root?: string;
            gasUsed?: string;
            logsBloom?: string;
            blockHash?: string;
            /**
             * A transaction hash
             */
            transactionHash?: string;
            logs?: Array<any>;
            blockNumber?: number;
            confirmations?: number;
            cumulativeGasUsed?: string;
            effectiveGasPrice?: string;
            byzantium?: boolean;
            type?: number;
            status?: number;
        } | null);
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/transaction/{chain}/tx-hash/{transactionHash}',
            path: {
                'chain': chain,
                'transactionHash': transactionHash,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get transaction receipt from user-op hash
     * Get the transaction receipt from a user-op hash.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param userOpHash User operation hash
     * @returns any Default Response
     * @throws ApiError
     */
    public useropHashReceipt(
        chain: string,
        userOpHash: string,
    ): CancelablePromise<{
        result: any;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/transaction/{chain}/userop-hash/{userOpHash}',
            path: {
                'chain': chain,
                'userOpHash': userOpHash,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get transaction logs
     * Get transaction logs for a mined transaction. A transaction queue ID or hash must be provided. Set `parseLogs` to parse the event logs.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param queueId The queue ID for a mined transaction.
     * @param transactionHash The transaction hash for a mined transaction.
     * @param parseLogs If true, parse the raw logs as events defined in the contract ABI. (Default: true)
     * @returns any Default Response
     * @throws ApiError
     */
    public getTransactionLogs(
        chain: string,
        queueId?: string,
        transactionHash?: string,
        parseLogs?: boolean,
    ): CancelablePromise<{
        result: Array<{
            /**
             * A contract or wallet address
             */
            address: string;
            topics: Array<string>;
            data: string;
            blockNumber: string;
            /**
             * A transaction hash
             */
            transactionHash: string;
            transactionIndex: number;
            blockHash: string;
            logIndex: number;
            removed: boolean;
            /**
             * Event name, only returned when `parseLogs` is true
             */
            eventName?: string;
            /**
             * Event arguments. Only returned when `parseLogs` is true
             */
            args?: any;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/transaction/logs',
            query: {
                'chain': chain,
                'queueId': queueId,
                'transactionHash': transactionHash,
                'parseLogs': parseLogs,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

}
