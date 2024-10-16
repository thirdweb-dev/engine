/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';

export class Erc20Service {

    constructor(public readonly httpRequest: BaseHttpRequest) {}

    /**
     * Get token allowance
     * Get the allowance of a specific wallet for an ERC-20 contract.
     * @param ownerWallet Address of the wallet who owns the funds
     * @param spenderWallet Address of the wallet to check token allowance
     * @param chain Chain ID or name
     * @param contractAddress ERC20 contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public allowanceOf(
        ownerWallet: string,
        spenderWallet: string,
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result: {
            name: string;
            symbol: string;
            decimals: string;
            /**
             * Value in wei
             */
            value: string;
            /**
             * Value in tokens
             */
            displayValue: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc20/allowance-of',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'ownerWallet': ownerWallet,
                'spenderWallet': spenderWallet,
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
     * Get the balance of a specific wallet address for this ERC-20 contract.
     * @param walletAddress Address of the wallet to check token balance
     * @param chain Chain ID or name
     * @param contractAddress ERC20 contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public balanceOf(
        walletAddress: string,
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result: {
            name: string;
            symbol: string;
            decimals: string;
            /**
             * Value in wei
             */
            value: string;
            /**
             * Value in tokens
             */
            displayValue: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc20/balance-of',
            path: {
                'chain': chain,
                'contractAddress': contractAddress,
            },
            query: {
                'wallet_address': walletAddress,
            },
            errors: {
                400: `Bad Request`,
                404: `Not Found`,
                500: `Internal Server Error`,
            },
        });
    }

    /**
     * Get token details
     * Get details for this ERC-20 contract.
     * @param chain Chain ID or name
     * @param contractAddress ERC20 contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public get(
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result: {
            name: string;
            symbol: string;
            decimals: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc20/get',
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
     * Get total supply
     * Get the total supply in circulation for this ERC-20 contract.
     * @param chain Chain ID or name
     * @param contractAddress ERC20 contract address
     * @returns any Default Response
     * @throws ApiError
     */
    public totalSupply(
        chain: string,
        contractAddress: string,
    ): CancelablePromise<{
        result: {
            name: string;
            symbol: string;
            decimals: string;
            /**
             * Value in wei
             */
            value: string;
            /**
             * Value in tokens
             */
            displayValue: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc20/total-supply',
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
     * Generate signature
     * Generate a signature granting access for another wallet to mint tokens from this ERC-20 contract. This method is typically called by the token contract owner.
     * @param chain Chain ID or name
     * @param contractAddress ERC20 contract address
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
             * The number of tokens this signature can be used to mint.
             */
            quantity: string;
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
        } | ({
            to: string;
            primarySaleRecipient?: string;
            price?: string;
            priceInWei?: string;
            currency?: string;
            validityStartTimestamp: number;
            validityEndTimestamp?: number;
            uid?: string;
        } & ({
            quantity: string;
        } | {
            quantityWei: string;
        }))),
    ): CancelablePromise<{
        result: ({
            payload: {
                /**
                 * The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.
                 */
                to: string;
                /**
                 * The number of tokens this signature can be used to mint.
                 */
                quantity: string;
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
                /**
                 * The address of the currency to pay for minting the tokens (use the price field to specify the price). Defaults to NATIVE_TOKEN_ADDRESS
                 */
                currencyAddress: string;
                /**
                 * If you want the user to pay for minting the tokens, you can specify the price per token. Defaults to 0.
                 */
                price: string;
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
                to: string;
                primarySaleRecipient: string;
                quantity: string;
                price: string;
                currency: string;
                validityStartTimestamp: number;
                validityEndTimestamp: number;
                uid: string;
            };
            signature: string;
        });
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/contract/{chain}/{contractAddress}/erc20/signature/generate',
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
            url: '/contract/{chain}/{contractAddress}/erc20/claim-conditions/can-claim',
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
            url: '/contract/{chain}/{contractAddress}/erc20/claim-conditions/get-active',
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
     * Get all the claim phases configured.
     * Get all the claim phases configured on the drop contract.
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
            url: '/contract/{chain}/{contractAddress}/erc20/claim-conditions/get-all',
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
    public claimConditionsGetClaimIneligibilityReasons(
        quantity: string,
        chain: string,
        contractAddress: string,
        addressToCheck?: string,
    ): CancelablePromise<{
        result: Array<(string | ('There is not enough supply to claim.' | 'This address is not on the allowlist.' | 'Not enough time since last claim transaction. Please wait.' | 'Claim phase has not started yet.' | 'You have already claimed the token.' | 'Incorrect price or currency.' | 'Cannot claim more than maximum allowed quantity.' | 'There are not enough tokens in the wallet to pay for the claim.' | 'There is no active claim phase at the moment. Please check back in later.' | 'There is no claim condition set.' | 'No wallet connected.' | 'No claim conditions found.'))>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/contract/{chain}/{contractAddress}/erc20/claim-conditions/get-claim-ineligibility-reasons',
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
    public claimConditionsGetClaimerProofs(
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
            method: 'POST',
            url: '/contract/{chain}/{contractAddress}/erc20/claim-conditions/get-claimer-proofs',
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
     * Set allowance
     * Grant a specific wallet address to transfer ERC-20 tokens from the caller wallet.
     * @param chain Chain ID or name
     * @param contractAddress ERC20 contract address
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
    public setAllowance(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * Address of the wallet to allow transfers from
             */
            spenderAddress: string;
            /**
             * The number of tokens to give as allowance
             */
            amount: string;
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
            url: '/contract/{chain}/{contractAddress}/erc20/set-allowance',
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
     * Transfer tokens
     * Transfer ERC-20 tokens from the caller wallet to a specific wallet.
     * @param chain Chain ID or name
     * @param contractAddress ERC20 contract address
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
            toAddress: string;
            /**
             * The amount of tokens to transfer.
             */
            amount: string;
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
            url: '/contract/{chain}/{contractAddress}/erc20/transfer',
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
     * Transfer tokens from wallet
     * Transfer ERC-20 tokens from the connected wallet to another wallet. Requires allowance.
     * @param chain Chain ID or name
     * @param contractAddress ERC20 contract address
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
            fromAddress: string;
            /**
             * The recipient address.
             */
            toAddress: string;
            /**
             * The amount of tokens to transfer.
             */
            amount: string;
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
            url: '/contract/{chain}/{contractAddress}/erc20/transfer-from',
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
     * Burn ERC-20 tokens in the caller wallet.
     * @param chain Chain ID or name
     * @param contractAddress ERC20 contract address
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
             * The amount of tokens you want to burn
             */
            amount: string;
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
            url: '/contract/{chain}/{contractAddress}/erc20/burn',
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
     * Burn token from wallet
     * Burn ERC-20 tokens in a specific wallet. Requires allowance.
     * @param chain Chain ID or name
     * @param contractAddress ERC20 contract address
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
    public burnFrom(
        chain: string,
        contractAddress: string,
        xBackendWalletAddress: string,
        requestBody: {
            /**
             * Address of the wallet sending the tokens
             */
            holderAddress: string;
            /**
             * The amount of this token you want to burn
             */
            amount: string;
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
            url: '/contract/{chain}/{contractAddress}/erc20/burn-from',
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
     * Claim ERC-20 tokens to a specific wallet.
     * @param chain Chain ID or name
     * @param contractAddress ERC20 contract address
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
             * The wallet address to receive the claimed tokens.
             */
            recipient: string;
            /**
             * The amount of tokens to claim.
             */
            amount: string;
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
            url: '/contract/{chain}/{contractAddress}/erc20/claim-to',
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
     * Mint ERC-20 tokens to multiple wallets in one transaction.
     * @param chain Chain ID or name
     * @param contractAddress ERC20 contract address
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
            data: Array<{
                /**
                 * The address to mint tokens to
                 */
                toAddress: string;
                /**
                 * The number of tokens to mint to the specific address.
                 */
                amount: string;
            }>;
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
            url: '/contract/{chain}/{contractAddress}/erc20/mint-batch-to',
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
     * Mint ERC-20 tokens to a specific wallet.
     * @param chain Chain ID or name
     * @param contractAddress ERC20 contract address
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
             * Address of the wallet to mint tokens to
             */
            toAddress: string;
            /**
             * The amount of tokens you want to send
             */
            amount: string;
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
            url: '/contract/{chain}/{contractAddress}/erc20/mint-to',
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
     * Signature mint
     * Mint ERC-20 tokens from a generated signature.
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
            payload: {
                /**
                 * The wallet address that can use this signature to mint tokens. This is to prevent another wallet from intercepting the signature and using it to mint tokens for themselves.
                 */
                to: string;
                /**
                 * The number of tokens this signature can be used to mint.
                 */
                quantity: string;
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
                /**
                 * The address of the currency to pay for minting the tokens (use the price field to specify the price). Defaults to NATIVE_TOKEN_ADDRESS
                 */
                currencyAddress: string;
                /**
                 * If you want the user to pay for minting the tokens, you can specify the price per token. Defaults to 0.
                 */
                price: string;
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
            url: '/contract/{chain}/{contractAddress}/erc20/signature/mint',
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
            url: '/contract/{chain}/{contractAddress}/erc20/claim-conditions/set',
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
            url: '/contract/{chain}/{contractAddress}/erc20/claim-conditions/update',
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
