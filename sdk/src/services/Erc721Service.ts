/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class Erc721Service {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get details
     * Get the details for a token in an ERC-721 contract.
     * @param tokenId The tokenId of the NFT to retrieve
     * @param chain Chain ID or name
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public get(
        tokenId: string,
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result: {
            metadata: Record<string, any>;
            owner: string;
            type: ('ERC1155' | 'ERC721' | 'metaplex');
            supply: string;
            quantityOwned?: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc721/get',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
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
     * Get all details
     * Get details for all tokens in an ERC-721 contract.
     * @param chain Chain ID or name
     * @param contractAddress Contract address
     * @param start The start token id for paginated results. Defaults to 0.
     * @param count The page count for paginated results. Defaults to 100.
     * @returns any Default Response
     * @throws ApiError
     */
    public getAll(
        chain: string,
        contractAddress: string,
        start?: number,
        count?: number,
    ): CancelablePromise<{
        result: Array<{
            metadata: Record<string, any>;
            owner: string;
            type: ('ERC1155' | 'ERC721' | 'metaplex');
            supply: string;
            quantityOwned?: string;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc721/get-all',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'start': start,
                'count': count,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get owned tokens
     * Get all tokens in an ERC-721 contract owned by a specific wallet.
     * @param walletAddress Address of the wallet to get NFTs for
     * @param chain Chain ID or name
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getOwned(
        walletAddress: string,
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result: Array<{
            metadata: Record<string, any>;
            owner: string;
            type: ('ERC1155' | 'ERC721' | 'metaplex');
            supply: string;
            quantityOwned?: string;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc721/get-owned',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
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
     * Get token balance
     * Get the balance of a specific wallet address for this ERC-721 contract.
     * @param walletAddress Address of the wallet to check NFT balance
     * @param chain Chain ID or name
     * @param contractAddress ERC721 contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public balanceOf(
        walletAddress: string,
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result?: string;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc721/balance-of',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
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
     * Check if approved transfers
     * Check if the specific wallet has approved transfers from a specific operator wallet.
     * @param ownerWallet Address of the wallet who owns the NFT
     * @param operator Address of the operator to check approval on
     * @param chain Chain ID or name
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public isApproved(
        ownerWallet: string,
        operator: string,
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result?: boolean;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc721/is-approved',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'ownerWallet': ownerWallet,
                'operator': operator,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get total supply
     * Get the total supply in circulation for this ERC-721 contract.
     * @param chain Chain ID or name
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public totalCount(
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result?: string;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc721/total-count',
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
     * Get claimed supply
     * Get the claimed supply for this ERC-721 contract.
     * @param chain Chain ID or name
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public totalClaimedSupply(
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result?: string;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc721/total-claimed-supply',
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
     * Get unclaimed supply
     * Get the unclaimed supply for this ERC-721 contract.
     * @param chain Chain ID or name
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public totalUnclaimedSupply(
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result?: string;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc721/total-unclaimed-supply',
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
     * Check if tokens are available for claiming
     * Check if tokens are currently available for claiming, optionally specifying if a specific wallet address can claim.
     * @param quantity The amount of tokens to claim.
     * @param chain Chain ID or name
     * @param contractAddress Contract address
     * @param addressToCheck The wallet address to check if it can claim tokens. This considers all aspects of the active claim phase, including allowlists, previous claims, etc.
     * @returns any Default Response
     * @throws ApiError
     */
    public canClaim(
        quantity: string,
        chain: string,
        contractAddress: string,
        addressToCheck?: string,
    ): CancelablePromise<{
        result: boolean;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc721/claim-conditions/can-claim',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'quantity': quantity,
                'addressToCheck': addressToCheck,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Retrieve the currently active claim phase, if any.
     * Retrieve the currently active claim phase, if any.
     * @param chain Chain ID or name
     * @param contractAddress Contract address
     * @param withAllowList Provide a boolean value to include the allowlist in the response.
     * @returns any Default Response
     * @throws ApiError
     */
    public getActiveClaimConditions(
        chain: string,
        contractAddress: string,
        withAllowList?: boolean,
    ): CancelablePromise<{
        result: {
            maxClaimableSupply?: (string | number);
            startTime: string;
            price?: (number | string);
            /**
             * A contract or wallet address
             */
            currencyAddress?: string;
            maxClaimablePerWallet?: (number | string);
            waitInSeconds?: (number | string);
            merkleRootHash: (string | Array<number>);
            availableSupply: string;
            currentMintSupply: string;
            /**
             * The `CurrencyValue` of the listing. Useful for displaying the price information.
             */
            currencyMetadata: {
                name: string;
                symbol: string;
                decimals: number;
                value: string;
                displayValue: string;
            };
            metadata?: {
                name?: string;
            };
            snapshot?: (null | Array<string>);
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc721/claim-conditions/get-active',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'withAllowList': withAllowList,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get all the claim phases configured for the drop.
     * Get all the claim phases configured for the drop.
     * @param chain Chain ID or name
     * @param contractAddress Contract address
     * @param withAllowList Provide a boolean value to include the allowlist in the response.
     * @returns any Default Response
     * @throws ApiError
     */
    public getAllClaimConditions(
        chain: string,
        contractAddress: string,
        withAllowList?: boolean,
    ): CancelablePromise<{
        result: Array<{
            maxClaimableSupply?: (string | number);
            startTime: string;
            price?: (number | string);
            /**
             * A contract or wallet address
             */
            currencyAddress?: string;
            maxClaimablePerWallet?: (number | string);
            waitInSeconds?: (number | string);
            merkleRootHash: (string | Array<number>);
            availableSupply: string;
            currentMintSupply: string;
            /**
             * The `CurrencyValue` of the listing. Useful for displaying the price information.
             */
            currencyMetadata: {
                name: string;
                symbol: string;
                decimals: number;
                value: string;
                displayValue: string;
            };
            metadata?: {
                name?: string;
            };
            snapshot?: (null | Array<string>);
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc721/claim-conditions/get-all',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'withAllowList': withAllowList,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get claim ineligibility reasons
     * Get an array of reasons why a specific wallet address is not eligible to claim tokens, if any.
     * @param quantity The amount of tokens to claim.
     * @param chain Chain ID or name
     * @param contractAddress Contract address
     * @param addressToCheck The wallet address to check if it can claim tokens.
     * @returns any Default Response
     * @throws ApiError
     */
    public getClaimIneligibilityReasons(
        quantity: string,
        chain: string,
        contractAddress: string,
        addressToCheck?: string,
    ): CancelablePromise<{
        result: Array<(string | ('There is not enough supply to claim.' | 'This address is not on the allowlist.' | 'Not enough time since last claim transaction. Please wait.' | 'Claim phase has not started yet.' | 'You have already claimed the token.' | 'Incorrect price or currency.' | 'Cannot claim more than maximum allowed quantity.' | 'There are not enough tokens in the wallet to pay for the claim.' | 'There is no active claim phase at the moment. Please check back in later.' | 'There is no claim condition set.' | 'No wallet connected.' | 'No claim conditions found.'))>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc721/claim-conditions/get-claim-ineligibility-reasons',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'quantity': quantity,
                'addressToCheck': addressToCheck,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get claimer proofs
     * Returns allowlist information and merkle proofs for a given wallet address. Returns null if no proof is found for the given wallet address.
     * @param walletAddress The wallet address to get the merkle proofs for.
     * @param chain Chain ID or name
     * @param contractAddress Contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public getClaimerProofs(
        walletAddress: string,
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result: (null | {
            price?: string;
            /**
             * A contract or wallet address
             */
            currencyAddress?: string;
            /**
             * A contract or wallet address
             */
            address: string;
            maxClaimable: string;
            proof: Array<string>;
        });
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc721/claim-conditions/get-claimer-proofs',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
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
     * Set approval for all
     * Approve or remove operator as an operator for the caller. Operators can call transferFrom or safeTransferFrom for any token owned by the caller.
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
    public setApprovalForAll(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * Address of the operator to give approval to
             */
            operator: string;
            /**
             * whether to approve or revoke approval
             */
            approved: boolean;
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
            url: '/contract/{chain}/{contractAddress}/erc721/set-approval-for-all',
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
     * Set approval for token
     * Approve an operator for the NFT owner. Operators can call transferFrom or safeTransferFrom for the specific token.
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
    public setApprovalForToken(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * Address of the operator to give approval to
             */
            operator: string;
            /**
             * the tokenId to give approval for
             */
            tokenId: string;
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
            url: '/contract/{chain}/{contractAddress}/erc721/set-approval-for-token',
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
     * Transfer token
     * Transfer an ERC-721 token from the caller wallet.
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
    public transfer(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * The recipient address.
             */
            to: string;
            /**
             * The token ID to transfer.
             */
            tokenId: string;
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
            url: '/contract/{chain}/{contractAddress}/erc721/transfer',
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
     * Transfer token from wallet
     * Transfer an ERC-721 token from the connected wallet to another wallet. Requires allowance.
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
    public transferFrom(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * The sender address.
             */
            from: string;
            /**
             * The recipient address.
             */
            to: string;
            /**
             * The token ID to transfer.
             */
            tokenId: string;
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
            url: '/contract/{chain}/{contractAddress}/erc721/transfer-from',
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
     * Mint tokens
     * Mint ERC-721 tokens to a specific wallet.
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
    public mintTo(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * Address of the wallet to mint the NFT to
             */
            receiver: string;
            metadata: ({
                /**
                 * The name of the NFT
                 */
                name?: (string | number | null);
                /**
                 * The description of the NFT
                 */
                description?: (string | null);
                /**
                 * The image of the NFT
                 */
                image?: (string | null);
                /**
                 * The external url of the NFT
                 */
                external_url?: (string | null);
                /**
                 * The animation url of the NFT
                 */
                animation_url?: (string | null);
                /**
                 * The properties of the NFT
                 */
                properties?: any;
                /**
                 * The attributes of the NFT
                 */
                attributes?: any;
                /**
                 * The background color of the NFT
                 */
                background_color?: (string | null);
            } | string);
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
            url: '/contract/{chain}/{contractAddress}/erc721/mint-to',
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
     * Mint tokens (batch)
     * Mint ERC-721 tokens to multiple wallets in one transaction.
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
    public mintBatchTo(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * Address of the wallet to mint the NFT to
             */
            receiver: string;
            metadatas: Array<({
                /**
                 * The name of the NFT
                 */
                name?: (string | number | null);
                /**
                 * The description of the NFT
                 */
                description?: (string | null);
                /**
                 * The image of the NFT
                 */
                image?: (string | null);
                /**
                 * The external url of the NFT
                 */
                external_url?: (string | null);
                /**
                 * The animation url of the NFT
                 */
                animation_url?: (string | null);
                /**
                 * The properties of the NFT
                 */
                properties?: any;
                /**
                 * The attributes of the NFT
                 */
                attributes?: any;
                /**
                 * The background color of the NFT
                 */
                background_color?: (string | null);
            } | string)>;
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
            url: '/contract/{chain}/{contractAddress}/erc721/mint-batch-to',
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
     * Burn token
     * Burn ERC-721 tokens in the caller wallet.
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
    public burn(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * The token ID to burn
             */
            tokenId: string;
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
            url: '/contract/{chain}/{contractAddress}/erc721/burn',
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
     * Lazy mint
     * Lazy mint ERC-721 tokens to be claimed in the future.
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
    public lazyMint(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            metadatas: Array<({
                /**
                 * The name of the NFT
                 */
                name?: (string | number | null);
                /**
                 * The description of the NFT
                 */
                description?: (string | null);
                /**
                 * The image of the NFT
                 */
                image?: (string | null);
                /**
                 * The external url of the NFT
                 */
                external_url?: (string | null);
                /**
                 * The animation url of the NFT
                 */
                animation_url?: (string | null);
                /**
                 * The properties of the NFT
                 */
                properties?: any;
                /**
                 * The attributes of the NFT
                 */
                attributes?: any;
                /**
                 * The background color of the NFT
                 */
                background_color?: (string | null);
            } | string)>;
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
            url: '/contract/{chain}/{contractAddress}/erc721/lazy-mint',
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
     * Claim tokens to wallet
     * Claim ERC-721 tokens to a specific wallet.
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
    public claimTo(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * Address of the wallet to claim the NFT to
             */
            receiver: string;
            /**
             * Quantity of NFTs to mint
             */
            quantity: string;
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
            url: '/contract/{chain}/{contractAddress}/erc721/claim-to',
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
     * Generate signature
     * Generate a signature granting access for another wallet to mint tokens from this ERC-721 contract. This method is typically called by the token contract owner.
     * @param chain Chain ID or name
     * @param contractAddress ERC721 contract address
     * @param xBackendWalletAddress Backend wallet address
     * @param xIdempotencyKey Transactions submitted with the same idempotency key will be de-duplicated. Only the last 100000 transactions are compared.
     * @param xAccountAddress Smart account address
     * @param xAccountFactoryAddress Smart account factory address. If omitted, engine will try to resolve it from the chain.
     * @param xAccountSalt Smart account salt as string or hex. This is used to predict the smart account address. Useful when creating multiple accounts with the same admin and only needed when deploying the account as part of a userop.
     * @param xThirdwebSdkVersion Override the thirdweb sdk version used. Example: "5" for v5 SDK compatibility.
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public signatureGenerate(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress?: string,
        xIdempotencyKey?: string,
        xAccountAddress?: string,
        xAccountFactoryAddress?: string,
        xAccountSalt?: string,
        xThirdwebSdkVersion?: string,
        requestBody?: ({
            /**
             * The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.
             */
            to: string;
            /**
             * The address that will receive the royalty fees from secondary sales. Defaults to the royaltyRecipient address of the contract.
             */
            royaltyRecipient?: string;
            /**
             * The number of tokens this signature can be used to mint.
             */
            quantity?: string;
            /**
             * The percentage fee you want to charge for secondary sales. Defaults to the royaltyBps of the contract.
             */
            royaltyBps?: number;
            /**
             * If a price is specified, the funds will be sent to the primarySaleRecipient address. Defaults to the primarySaleRecipient address of the contract.
             */
            primarySaleRecipient?: string;
            /**
             * A unique identifier for the payload, used to prevent replay attacks and other types of exploits.
             * Note that the input value gets hashed in the actual payload that gets generated.
             * The smart contract enforces on-chain that no uid gets used more than once,
             * which means you can deterministically generate the uid to prevent specific exploits.
             */
            uid?: string;
            metadata: ({
                /**
                 * The name of the NFT
                 */
                name?: (string | number | null);
                /**
                 * The description of the NFT
                 */
                description?: (string | null);
                /**
                 * The image of the NFT
                 */
                image?: (string | null);
                /**
                 * The external url of the NFT
                 */
                external_url?: (string | null);
                /**
                 * The animation url of the NFT
                 */
                animation_url?: (string | null);
                /**
                 * The properties of the NFT
                 */
                properties?: any;
                /**
                 * The attributes of the NFT
                 */
                attributes?: any;
                /**
                 * The background color of the NFT
                 */
                background_color?: (string | null);
            } | string);
            /**
             * The address of the currency to pay for minting the tokens (use the price field to specify the price). Defaults to NATIVE_TOKEN_ADDRESS
             */
            currencyAddress?: string;
            /**
             * If you want the user to pay for minting the tokens, you can specify the price per token. Defaults to 0.
             */
            price?: string;
            mintStartTime?: (string | number);
            mintEndTime?: (string | number);
        } | {
            metadata: (string | {
                /**
                 * The name of the NFT
                 */
                name?: string;
                /**
                 * The description of the NFT
                 */
                description?: string;
                /**
                 * The image of the NFT
                 */
                image?: string;
                /**
                 * The animation url of the NFT
                 */
                animation_url?: string;
                /**
                 * The external url of the NFT
                 */
                external_url?: string;
                /**
                 * The background color of the NFT
                 */
                background_color?: string;
                /**
                 * (not recommended - use "attributes") The properties of the NFT.
                 */
                properties?: any;
                /**
                 * Arbitrary metadata for this item.
                 */
                attributes?: Array<{
                    trait_type: string;
                    value: string;
                }>;
            });
            /**
             * The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.
             */
            to: string;
            /**
             * The amount of the "currency" token this token costs. Example: "0.1"
             */
            price?: string;
            /**
             * The amount of the "currency" token this token costs in wei. Remember to use the correct decimals amount for the currency. Example: "100000000000000000" = 0.1 ETH (18 decimals)
             */
            priceInWei?: string;
            /**
             * The currency address to pay for minting the tokens. Defaults to the chain's native token.
             */
            currency?: string;
            /**
             * If a price is specified, funds will be sent to the "primarySaleRecipient" address. Defaults to the "primarySaleRecipient" address of the contract.
             */
            primarySaleRecipient?: string;
            /**
             * The address that will receive the royalty fees from secondary sales. Defaults to the "royaltyRecipient" address of the contract.
             */
            royaltyRecipient?: string;
            /**
             * The percentage fee you want to charge for secondary sales. Defaults to the "royaltyBps" of the contract.
             */
            royaltyBps?: number;
            /**
             * The start time (in Unix seconds) when the signature can be used to mint. Default: now
             */
            validityStartTimestamp?: number;
            /**
             * The end time (in Unix seconds) when the signature can be used to mint. Default: 10 years
             */
            validityEndTimestamp?: number;
            /**
             * The uid is a unique identifier hashed in the payload to prevent replay attacks, ensuring it's only used once on-chain.
             */
            uid?: string;
        }),
    ): CancelablePromise<{
        result: ({
            payload: {
                uri: string;
                /**
                 * The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.
                 */
                to: string;
                /**
                 * The address that will receive the royalty fees from secondary sales. Defaults to the royaltyRecipient address of the contract.
                 */
                royaltyRecipient: string;
                /**
                 * The number of tokens this signature can be used to mint.
                 */
                quantity: string;
                /**
                 * The percentage fee you want to charge for secondary sales. Defaults to the royaltyBps of the contract.
                 */
                royaltyBps: string;
                /**
                 * If a price is specified, the funds will be sent to the primarySaleRecipient address. Defaults to the primarySaleRecipient address of the contract.
                 */
                primarySaleRecipient: string;
                /**
                 * A unique identifier for the payload, used to prevent replay attacks and other types of exploits.
                 * Note that the input value gets hashed in the actual payload that gets generated.
                 * The smart contract enforces on-chain that no uid gets used more than once,
                 * which means you can deterministically generate the uid to prevent specific exploits.
                 */
                uid: string;
                metadata: ({
                    /**
                     * The name of the NFT
                     */
                    name?: (string | number | null);
                    /**
                     * The description of the NFT
                     */
                    description?: (string | null);
                    /**
                     * The image of the NFT
                     */
                    image?: (string | null);
                    /**
                     * The external url of the NFT
                     */
                    external_url?: (string | null);
                    /**
                     * The animation url of the NFT
                     */
                    animation_url?: (string | null);
                    /**
                     * The properties of the NFT
                     */
                    properties?: any;
                    /**
                     * The attributes of the NFT
                     */
                    attributes?: any;
                    /**
                     * The background color of the NFT
                     */
                    background_color?: (string | null);
                } | string);
                /**
                 * The address of the currency to pay for minting the tokens (use the price field to specify the price). Defaults to NATIVE_TOKEN_ADDRESS
                 */
                currencyAddress: string;
                /**
                 * If you want the user to pay for minting the tokens, you can specify the price per token. Defaults to 0.
                 */
                price?: string;
                /**
                 * The time from which the signature can be used to mint tokens. Defaults to now.
                 */
                mintStartTime: number;
                /**
                 * The time until which the signature can be used to mint tokens. Defaults to 10 years from now.
                 */
                mintEndTime: number;
            };
            signature: string;
        } | {
            payload: {
                uri: string;
                to: string;
                price: string;
                /**
                 * A contract or wallet address
                 */
                currency: string;
                primarySaleRecipient: string;
                royaltyRecipient: string;
                royaltyBps: string;
                validityStartTimestamp: number;
                validityEndTimestamp: number;
                uid: string;
            };
            signature: string;
        });
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/contract/{chain}/{contractAddress}/erc721/signature/generate',
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
                'x-thirdweb-sdk-version': xThirdwebSdkVersion,
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
     * Signature mint
     * Mint ERC-721 tokens from a generated signature.
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
    public signatureMint(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            payload: ({
                uri: string;
                /**
                 * The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.
                 */
                to: string;
                /**
                 * The address that will receive the royalty fees from secondary sales. Defaults to the royaltyRecipient address of the contract.
                 */
                royaltyRecipient: string;
                /**
                 * The number of tokens this signature can be used to mint.
                 */
                quantity: string;
                /**
                 * The percentage fee you want to charge for secondary sales. Defaults to the royaltyBps of the contract.
                 */
                royaltyBps: string;
                /**
                 * If a price is specified, the funds will be sent to the primarySaleRecipient address. Defaults to the primarySaleRecipient address of the contract.
                 */
                primarySaleRecipient: string;
                /**
                 * A unique identifier for the payload, used to prevent replay attacks and other types of exploits.
                 * Note that the input value gets hashed in the actual payload that gets generated.
                 * The smart contract enforces on-chain that no uid gets used more than once,
                 * which means you can deterministically generate the uid to prevent specific exploits.
                 */
                uid: string;
                metadata: ({
                    /**
                     * The name of the NFT
                     */
                    name?: (string | number | null);
                    /**
                     * The description of the NFT
                     */
                    description?: (string | null);
                    /**
                     * The image of the NFT
                     */
                    image?: (string | null);
                    /**
                     * The external url of the NFT
                     */
                    external_url?: (string | null);
                    /**
                     * The animation url of the NFT
                     */
                    animation_url?: (string | null);
                    /**
                     * The properties of the NFT
                     */
                    properties?: any;
                    /**
                     * The attributes of the NFT
                     */
                    attributes?: any;
                    /**
                     * The background color of the NFT
                     */
                    background_color?: (string | null);
                } | string);
                /**
                 * The address of the currency to pay for minting the tokens (use the price field to specify the price). Defaults to NATIVE_TOKEN_ADDRESS
                 */
                currencyAddress: string;
                /**
                 * If you want the user to pay for minting the tokens, you can specify the price per token. Defaults to 0.
                 */
                price?: string;
                /**
                 * The time from which the signature can be used to mint tokens. Defaults to now.
                 */
                mintStartTime: number;
                /**
                 * The time until which the signature can be used to mint tokens. Defaults to 10 years from now.
                 */
                mintEndTime: number;
            } | {
                uri: string;
                to: string;
                price: string;
                /**
                 * A contract or wallet address
                 */
                currency: string;
                primarySaleRecipient: string;
                royaltyRecipient: string;
                royaltyBps: string;
                validityStartTimestamp: number;
                validityEndTimestamp: number;
                uid: string;
            });
            signature: string;
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
            url: '/contract/{chain}/{contractAddress}/erc721/signature/mint',
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
     * Overwrite the claim conditions for the drop.
     * Overwrite the claim conditions for the drop. All properties of a phase are optional, with the default being a free, open, unlimited claim, in the native currency, starting immediately.
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
    public setClaimConditions(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            claimConditionInputs: Array<{
                maxClaimableSupply?: (string | number);
                startTime?: (string | number);
                price?: (number | string);
                /**
                 * A contract or wallet address
                 */
                currencyAddress?: string;
                maxClaimablePerWallet?: (number | string);
                waitInSeconds?: (number | string);
                merkleRootHash?: (string | Array<number>);
                metadata?: {
                    name?: string;
                };
                snapshot?: (Array<string> | null);
            }>;
            resetClaimEligibilityForAll?: boolean;
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
            url: '/contract/{chain}/{contractAddress}/erc721/claim-conditions/set',
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
     * Update a single claim phase.
     * Update a single claim phase, by providing the index of the claim phase and the new phase configuration. The index is the position of the phase in the list of phases you have made, starting from zero. e.g. if you have two phases, the first phase has an index of 0 and the second phase has an index of 1. All properties of a phase are optional, with the default being a free, open, unlimited claim, in the native currency, starting immediately.
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
    public updateClaimConditions(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            claimConditionInput: {
                maxClaimableSupply?: (string | number);
                startTime?: (string | number);
                price?: (number | string);
                /**
                 * A contract or wallet address
                 */
                currencyAddress?: string;
                maxClaimablePerWallet?: (number | string);
                waitInSeconds?: (number | string);
                merkleRootHash?: (string | Array<number>);
                metadata?: {
                    name?: string;
                };
                snapshot?: (Array<string> | null);
            };
            /**
             * Index of the claim condition to update
             */
            index: number;
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
            url: '/contract/{chain}/{contractAddress}/erc721/claim-conditions/update',
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
     * Prepare signature
     * Prepares a payload for a wallet to generate a signature.
     * @param chain Chain ID or name
     * @param contractAddress ERC721 contract address
     * @param requestBody
     * @returns any Default Response
     * @throws ApiError
     */
    public signaturePrepare(
        chain: string,
        contractAddress: string,
        requestBody: {
            metadata: (string | {
                /**
                 * The name of the NFT
                 */
                name?: string;
                /**
                 * The description of the NFT
                 */
                description?: string;
                /**
                 * The image of the NFT
                 */
                image?: string;
                /**
                 * The animation url of the NFT
                 */
                animation_url?: string;
                /**
                 * The external url of the NFT
                 */
                external_url?: string;
                /**
                 * The background color of the NFT
                 */
                background_color?: string;
                /**
                 * (not recommended - use "attributes") The properties of the NFT.
                 */
                properties?: any;
                /**
                 * Arbitrary metadata for this item.
                 */
                attributes?: Array<{
                    trait_type: string;
                    value: string;
                }>;
            });
            /**
             * The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.
             */
            to: string;
            /**
             * The amount of the "currency" token this token costs. Example: "0.1"
             */
            price?: string;
            /**
             * The amount of the "currency" token this token costs in wei. Remember to use the correct decimals amount for the currency. Example: "100000000000000000" = 0.1 ETH (18 decimals)
             */
            priceInWei?: string;
            /**
             * The currency address to pay for minting the tokens. Defaults to the chain's native token.
             */
            currency?: string;
            /**
             * If a price is specified, funds will be sent to the "primarySaleRecipient" address. Defaults to the "primarySaleRecipient" address of the contract.
             */
            primarySaleRecipient?: string;
            /**
             * The address that will receive the royalty fees from secondary sales. Defaults to the "royaltyRecipient" address of the contract.
             */
            royaltyRecipient?: string;
            /**
             * The percentage fee you want to charge for secondary sales. Defaults to the "royaltyBps" of the contract.
             */
            royaltyBps?: number;
            /**
             * The start time (in Unix seconds) when the signature can be used to mint. Default: now
             */
            validityStartTimestamp?: number;
            /**
             * The end time (in Unix seconds) when the signature can be used to mint. Default: 10 years
             */
            validityEndTimestamp?: number;
            /**
             * The uid is a unique identifier hashed in the payload to prevent replay attacks, ensuring it's only used once on-chain.
             */
            uid?: string;
        },
    ): CancelablePromise<{
        result: {
            mintPayload: {
                uri: string;
                to: string;
                price: string;
                /**
                 * A contract or wallet address
                 */
                currency: string;
                primarySaleRecipient: string;
                royaltyRecipient: string;
                royaltyBps: string;
                validityStartTimestamp: number;
                validityEndTimestamp: number;
                uid: string;
            };
            /**
             * The payload to sign with a wallet's `signTypedData` method.
             */
            typedDataPayload: {
                /**
                 * Specifies the contextual information used to prevent signature reuse across different contexts.
                 */
                domain: {
                    name: string;
                    version: string;
                    chainId: number;
                    verifyingContract: string;
                };
                /**
                 * Defines the structure of the data types used in the message.
                 */
                types: {
                    EIP712Domain: Array<{
                        name: string;
                        type: string;
                    }>;
                    MintRequest: Array<{
                        name: string;
                        type: string;
                    }>;
                };
                /**
                 * The structured data to be signed.
                 */
                message: {
                    uri: string;
                    to: string;
                    price: string;
                    /**
                     * A contract or wallet address
                     */
                    currency: string;
                    primarySaleRecipient: string;
                    royaltyRecipient: string;
                    royaltyBps: string;
                    validityStartTimestamp: number;
                    validityEndTimestamp: number;
                    uid: string;
                };
                /**
                 * The main type of the data in the message corresponding to a defined type in the `types` field.
                 */
                primaryType: 'MintRequest';
            };
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/contract/{chain}/{contractAddress}/erc721/signature/prepare',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
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
     * Update token metadata
     * Update the metadata for an ERC721 token.
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
    public updateTokenMetadata(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * Token ID to update metadata
             */
            tokenId: string;
            metadata: {
                /**
                 * The name of the NFT
                 */
                name?: (string | number | null);
                /**
                 * The description of the NFT
                 */
                description?: (string | null);
                /**
                 * The image of the NFT
                 */
                image?: (string | null);
                /**
                 * The external url of the NFT
                 */
                external_url?: (string | null);
                /**
                 * The animation url of the NFT
                 */
                animation_url?: (string | null);
                /**
                 * The properties of the NFT
                 */
                properties?: any;
                /**
                 * The attributes of the NFT
                 */
                attributes?: any;
                /**
                 * The background color of the NFT
                 */
                background_color?: (string | null);
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
            url: '/contract/{chain}/{contractAddress}/erc721/token/update',
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
