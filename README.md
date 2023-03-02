server to server sdk. designed to be a sidecar.
only server-to-server auth.

benefits:
- wallet management
- automatic transaction queueing and retrying
- built-in EIP2771 gasless relayer
- trusted signature generation

plugins: (enable/disable)
- wallet
-- management (omnibus, sweep) - native / erc20 / erc721
-- signing
-- execution
---- cancellation
---- queueing
---- gas speed threshold
---- retry with gas
- contract [chain id]
-- deployment
-- estimation
-- execution
- gasless relayer (eip-2771, eip-2612) [chain id]
- storage
- auth
- batch

--------

request --> contract --> queue --> wallet
request --> wallet signature

wallet -> signing -> process transaction

request -> contract -> wallet signing -> queue -> process on the blockchain
vs
request -> contract -> queue -> wallet signing + process

signing --- nonce dependent vs not

--------

nonce = idempotent
assign nonce on the transaction before the queue

1 node, 1 wallet
N node, 1 wallet
N node, N wallets
N node, M wallets, N > M
N node, M wallets, N < M

sharding:
- network + wallet

signed nonce, processed nonce, committed nonce

---------

wallet signing:
- signed with nonce -> process queue

how to get nonce?
- wallet_nonce

how to correct the nonce?
- ask the network
- look at the queue
- look at wallet_nonce

does sending need to be throttled?
- not really, as much as the rpc can handle

Request -> Relay -> Sign -> Execute

---------

requirements
1. postgres: pg-boss

----------

postgres, acid guaranteed
- wallet: pub_key, priv_key, owner_id, nonce_offset
- wallet_nonce: pub_key, chain_id, nonce
- transaction: id, pub_key, chain_id, transaction_hash
- relay_transaction:

relay_transaction = keep track of the status
wallet = gotta keep transaction nonce offset

----------

synchronize wallet nonce:
- load blockchain transaction count
- load database transaction count
- update wallet offset (how to sync blockchain <-> database)

wallet:
- for multi-tenant: key by something
-




