/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class MarketplaceOffersService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get all offers
     * Get all offers on this marketplace contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param count Number of listings to fetch
     * @param offeror has offers from this Address
     * @param start Start from this index (pagination)
     * @param tokenContract Token contract address to show NFTs from
     * @param tokenId Only show NFTs with this ID
     * @returns any Default Response
     * @throws ApiError
     */
    public getAll(
        chain: string,
        contractAddress: string,
        count?: number,
        offeror?: string,
        start?: number,
        tokenContract?: string,
        tokenId?: string,
    ): CancelablePromise<{
        result: Array<{
            /**
             * The address of the asset being listed.
             */
            assetContractAddress: string;
            /**
             * The ID of the token to list.
             */
            tokenId: string;
            /**
             * The address of the currency to accept for the listing.
             */
            currencyContractAddress?: string;
            /**
             * The quantity of tokens to include in the listing. NOTE: For ERC721s, this value should always be 1 (and will be forced internally regardless of what is passed here).
             */
            quantity?: string;
            /**
             * The id of the offer.
             */
            id: string;
            /**
             * The address of the creator of offer.
             */
            offerorAddress: string;
            /**
             * The `CurrencyValue` of the listing. Useful for displaying the price information.
             */
            currencyValue?: {
                name: string;
                symbol: string;
                decimals: number;
                value: string;
                displayValue: string;
            };
            /**
             * The total offer amount for the NFTs.
             */
            totalPrice: string;
            asset?: Record<string, any>;
            /**
             * The end time of the auction.
             */
            endTimeInSeconds?: number;
            status?: (0 | 1 | 2 | 3 | 4 | 5);
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/offers/get-all',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'count': count,
                'offeror': offeror,
                'start': start,
                'tokenContract': tokenContract,
                'tokenId': tokenId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get all valid offers
     * Get all valid offers on this marketplace contract. Valid offers are offers that have not expired, been canceled, or been accepted.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param count Number of listings to fetch
     * @param offeror has offers from this Address
     * @param start Start from this index (pagination)
     * @param tokenContract Token contract address to show NFTs from
     * @param tokenId Only show NFTs with this ID
     * @returns any Default Response
     * @throws ApiError
     */
    public getAllValid(
        chain: string,
        contractAddress: string,
        count?: number,
        offeror?: string,
        start?: number,
        tokenContract?: string,
        tokenId?: string,
    ): CancelablePromise<{
        result: Array<{
            /**
             * The address of the asset being listed.
             */
            assetContractAddress: string;
            /**
             * The ID of the token to list.
             */
            tokenId: string;
            /**
             * The address of the currency to accept for the listing.
             */
            currencyContractAddress?: string;
            /**
             * The quantity of tokens to include in the listing. NOTE: For ERC721s, this value should always be 1 (and will be forced internally regardless of what is passed here).
             */
            quantity?: string;
            /**
             * The id of the offer.
             */
            id: string;
            /**
             * The address of the creator of offer.
             */
            offerorAddress: string;
            /**
             * The `CurrencyValue` of the listing. Useful for displaying the price information.
             */
            currencyValue?: {
                name: string;
                symbol: string;
                decimals: number;
                value: string;
                displayValue: string;
            };
            /**
             * The total offer amount for the NFTs.
             */
            totalPrice: string;
            asset?: Record<string, any>;
            /**
             * The end time of the auction.
             */
            endTimeInSeconds?: number;
            status?: (0 | 1 | 2 | 3 | 4 | 5);
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/offers/get-all-valid',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'count': count,
                'offeror': offeror,
                'start': start,
                'tokenContract': tokenContract,
                'tokenId': tokenId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get offer
     * Get details about an offer.
     * @param offerId The ID of the offer to get information about.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getOffer(
        offerId: string,
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result: {
            /**
             * The address of the asset being listed.
             */
            assetContractAddress: string;
            /**
             * The ID of the token to list.
             */
            tokenId: string;
            /**
             * The address of the currency to accept for the listing.
             */
            currencyContractAddress?: string;
            /**
             * The quantity of tokens to include in the listing. NOTE: For ERC721s, this value should always be 1 (and will be forced internally regardless of what is passed here).
             */
            quantity?: string;
            /**
             * The id of the offer.
             */
            id: string;
            /**
             * The address of the creator of offer.
             */
            offerorAddress: string;
            /**
             * The `CurrencyValue` of the listing. Useful for displaying the price information.
             */
            currencyValue?: {
                name: string;
                symbol: string;
                decimals: number;
                value: string;
                displayValue: string;
            };
            /**
             * The total offer amount for the NFTs.
             */
            totalPrice: string;
            asset?: Record<string, any>;
            /**
             * The end time of the auction.
             */
            endTimeInSeconds?: number;
            status?: (0 | 1 | 2 | 3 | 4 | 5);
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/offers/get-offer',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'offerId': offerId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get total count
     * Get the total number of offers on this marketplace contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getTotalCount(
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result: string;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/offers/get-total-count',
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
     * Make offer
     * Make an offer on a token. A valid listing is not required.
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
    public makeOffer(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * The address of the asset being listed.
             */
            assetContractAddress: string;
            /**
             * The ID of the token to list.
             */
            tokenId: string;
            /**
             * The address of the currency to accept for the listing.
             */
            currencyContractAddress?: string;
            /**
             * The quantity of tokens to include in the listing. NOTE: For ERC721s, this value should always be 1 (and will be forced internally regardless of what is passed here).
             */
            quantity?: string;
            /**
             * the price to offer in the currency specified
             */
            totalPrice: string;
            /**
             * Defaults to 10 years from now.
             */
            endTimestamp?: number;
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
            url: '/marketplace/{chain}/{contractAddress}/offers/make-offer',
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
     * Cancel offer
     * Cancel a valid offer made by the caller wallet.
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
    public cancelOffer(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * The ID of the offer to cancel. You can view all offers with getAll or getAllValid.
             */
            offerId: string;
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
            url: '/marketplace/{chain}/{contractAddress}/offers/cancel-offer',
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
     * Accept offer
     * Accept a valid offer.
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
    public acceptOffer(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * The ID of the offer to accept. You can view all offers with getAll or getAllValid.
             */
            offerId: string;
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
            url: '/marketplace/{chain}/{contractAddress}/offers/accept-offer',
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
