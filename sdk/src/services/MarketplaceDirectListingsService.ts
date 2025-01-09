/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class MarketplaceDirectListingsService {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get all listings
     * Get all direct listings for this marketplace contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param count Number of listings to fetch
     * @param seller Being sold by this Address
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
        seller?: string,
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
             * The price to pay per unit of NFTs listed.
             */
            pricePerToken: string;
            /**
             * Whether the listing is reserved to be bought from a specific set of buyers.
             */
            isReservedListing?: boolean;
            /**
             * The listing ID.
             */
            id: string;
            /**
             * The `CurrencyValue` of the listing. Useful for displaying the price information.
             */
            currencyValuePerToken?: {
                name: string;
                symbol: string;
                decimals: number;
                value: string;
                displayValue: string;
            };
            asset?: Record<string, any>;
            status?: (0 | 1 | 2 | 3 | 4 | 5);
            /**
             * The start time of the listing. If not set, defaults to now.
             */
            startTimeInSeconds?: number;
            /**
             * The end time of the listing. If not set, defaults to 7 days from now.
             */
            endTimeInSeconds?: number;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/direct-listings/get-all',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'count': count,
                'seller': seller,
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
     * Get all valid listings
     * Get all the valid direct listings for this marketplace contract. A valid listing is where the listing is active, and the creator still owns & has approved Marketplace to transfer the listed NFTs.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @param count Number of listings to fetch
     * @param seller Being sold by this Address
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
        seller?: string,
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
             * The price to pay per unit of NFTs listed.
             */
            pricePerToken: string;
            /**
             * Whether the listing is reserved to be bought from a specific set of buyers.
             */
            isReservedListing?: boolean;
            /**
             * The listing ID.
             */
            id: string;
            /**
             * The `CurrencyValue` of the listing. Useful for displaying the price information.
             */
            currencyValuePerToken?: {
                name: string;
                symbol: string;
                decimals: number;
                value: string;
                displayValue: string;
            };
            asset?: Record<string, any>;
            status?: (0 | 1 | 2 | 3 | 4 | 5);
            /**
             * The start time of the listing. If not set, defaults to now.
             */
            startTimeInSeconds?: number;
            /**
             * The end time of the listing. If not set, defaults to 7 days from now.
             */
            endTimeInSeconds?: number;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/direct-listings/get-all-valid',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'count': count,
                'seller': seller,
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
     * Get direct listing
     * Gets a direct listing on this marketplace contract.
     * @param listingId The id of the listing to retrieve.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getListing(
        listingId: string,
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
             * The price to pay per unit of NFTs listed.
             */
            pricePerToken: string;
            /**
             * Whether the listing is reserved to be bought from a specific set of buyers.
             */
            isReservedListing?: boolean;
            /**
             * The listing ID.
             */
            id: string;
            /**
             * The `CurrencyValue` of the listing. Useful for displaying the price information.
             */
            currencyValuePerToken?: {
                name: string;
                symbol: string;
                decimals: number;
                value: string;
                displayValue: string;
            };
            asset?: Record<string, any>;
            status?: (0 | 1 | 2 | 3 | 4 | 5);
            /**
             * The start time of the listing. If not set, defaults to now.
             */
            startTimeInSeconds?: number;
            /**
             * The end time of the listing. If not set, defaults to 7 days from now.
             */
            endTimeInSeconds?: number;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/direct-listings/get-listing',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'listingId': listingId,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Check approved buyer
     * Check if a buyer is approved to purchase a specific direct listing.
     * @param listingId The id of the listing to retrieve.
     * @param walletAddress The wallet address of the buyer to check.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public isBuyerApprovedForListing(
        listingId: string,
        walletAddress: string,
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result: boolean;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/direct-listings/is-buyer-approved-for-listing',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'listingId': listingId,
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
     * Check approved currency
     * Check if a currency is approved for a specific direct listing.
     * @param listingId The id of the listing to retrieve.
     * @param currencyContractAddress The smart contract address of the ERC20 token to check.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public isCurrencyApprovedForListing(
        listingId: string,
        currencyContractAddress: string,
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result: boolean;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/marketplace/{chain}/{contractAddress}/direct-listings/is-currency-approved-for-listing',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'listingId': listingId,
                'currencyContractAddress': currencyContractAddress,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Transfer token from wallet
     * Get the total number of direct listings on this marketplace contract.
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
            url: '/marketplace/{chain}/{contractAddress}/direct-listings/get-total-count',
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
     * Create direct listing
     * Create a direct listing on this marketplace contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
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
    public createListing(
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
             * The price to pay per unit of NFTs listed.
             */
            pricePerToken: string;
            /**
             * Whether the listing is reserved to be bought from a specific set of buyers.
             */
            isReservedListing?: boolean;
            /**
             * The start time of the listing. If not set, defaults to now.
             */
            startTimestamp?: number;
            /**
             * The end time of the listing. If not set, defaults to 7 days from now.
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
            url: '/marketplace/{chain}/{contractAddress}/direct-listings/create-listing',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
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
     * Update direct listing
     * Update a direct listing on this marketplace contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
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
    public updateListing(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * The ID of the listing you want to update.
             */
            listingId: string;
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
             * The price to pay per unit of NFTs listed.
             */
            pricePerToken: string;
            /**
             * Whether the listing is reserved to be bought from a specific set of buyers.
             */
            isReservedListing?: boolean;
            /**
             * The start time of the listing. If not set, defaults to now.
             */
            startTimestamp?: number;
            /**
             * The end time of the listing. If not set, defaults to 7 days from now.
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
            url: '/marketplace/{chain}/{contractAddress}/direct-listings/update-listing',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
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
     * Buy from direct listing
     * Buy from a specific direct listing from this marketplace contract.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
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
    public buyFromListing(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * The ID of the listing you want to approve a buyer for.
             */
            listingId: string;
            /**
             * The number of tokens to buy (default is 1 for ERC721 NFTs).
             */
            quantity: string;
            /**
             * The wallet address of the buyer.
             */
            buyer: string;
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
            url: '/marketplace/{chain}/{contractAddress}/direct-listings/buy-from-listing',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
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
     * Approve buyer for reserved listing
     * Approve a wallet address to buy from a reserved listing.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
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
    public approveBuyerForReservedListing(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * The ID of the listing you want to approve a buyer for.
             */
            listingId: string;
            /**
             * The wallet address of the buyer to approve.
             */
            buyer: string;
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
            url: '/marketplace/{chain}/{contractAddress}/direct-listings/approve-buyer-for-reserved-listing',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
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
     * Revoke approval for reserved listings
     * Revoke approval for a buyer to purchase a reserved listing.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
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
    public revokeBuyerApprovalForReservedListing(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * The ID of the listing you want to approve a buyer for.
             */
            listingId: string;
            /**
             * The wallet address of the buyer to approve.
             */
            buyerAddress: string;
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
            url: '/marketplace/{chain}/{contractAddress}/direct-listings/revoke-buyer-approval-for-reserved-listing',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
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
     * Revoke currency approval for reserved listing
     * Revoke approval of a currency for a reserved listing.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
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
    public revokeCurrencyApprovalForListing(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * The ID of the listing you want to approve a buyer for.
             */
            listingId: string;
            /**
             * The wallet address of the buyer to approve.
             */
            currencyContractAddress: string;
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
            url: '/marketplace/{chain}/{contractAddress}/direct-listings/revoke-currency-approval-for-listing',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
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
     * Cancel direct listing
     * Cancel a direct listing from this marketplace contract. Only the creator of the listing can cancel it.
     * @param chain A chain ID ("137") or slug ("polygon-amoy-testnet"). Chain ID is preferred.
     * @param contractAddress Contract address
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
    public cancelListing(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * The ID of the listing you want to cancel.
             */
            listingId: string;
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
            url: '/marketplace/{chain}/{contractAddress}/direct-listings/cancel-listing',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
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

}
