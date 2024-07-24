export interface EthersError {
  reason: string;
  code: string;
  error: any;
  method: string;
  transaction: any;
}
