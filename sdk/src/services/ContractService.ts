/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class ContractService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Read from contract
     * Call a read function on a contract.
     * @param functionName Name of the function to call on Contract
     * @param chain Chain ID or name
     * @param contractAddress Contract address
     * @param args Arguments for the function. Comma Separated
     * @returns any Default Response
     * @throws ApiError
     */
    public read(
        functionName: string,
        chain: string,
        contractAddress: string,
        args?: string,
    ): CancelablePromise<{
        result: any;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/read',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'functionName': functionName,
                'args': args,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Write to contract
     * Call a write function on a contract.
     * @param chain Chain ID or name
     * @param contractAddress Contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param requestBody
     * @param simulateTx Simulate the transaction on-chain without executing
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, engine will try to resolve it from the chain.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @returns any Default Response
     * @throws ApiError
     */
    public write(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * The function to call on the contract
             */
            functionName: string;
            /**
             * The arguments to call on the function
             */
            args: Array<any>;
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
            abi?: Array<{
                type: string;
                name?: string;
                inputs?: Array<{
                    type?: string;
                    name?: string;
                    internalType?: string;
                    stateMutability?: string;
                    components?: Array<{
                        type?: string;
                        name?: string;
                        internalType?: string;
                    }>;
                }>;
                outputs?: Array<{
                    type?: string;
                    name?: string;
                    internalType?: string;
                    stateMutability?: string;
                    components?: Array<{
                        type?: string;
                        name?: string;
                        internalType?: string;
                    }>;
                }>;
                stateMutability?: string;
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
            url: '/contract/{chain}/{contractAddress}/write',
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
        });
    }

}
