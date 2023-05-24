export interface TransactionSchema {
    identifier?: string;
    walletAddress?: string;
    contractAddress?: string;
    chainId?: string;
    extension?: string;
    rawFunctionName?: string;
    rawFunctionArgs?: string;
    txProcessed?: boolean;
    txSubmitted?: boolean;
    txErrored?: boolean;
    txMined?: boolean;
    encodedInputData?: string;
    txType?: number;
    gasPrice?: string;
    gasLimit?: string;
    maxPriorityFeePerGas?: string;
    maxFeePerGas?: string;
}
