#!/bin/bash

URL='https://web3api-7dqe.zeet-nftlabs.zeet.app'
PATH='/contract/mumbai/0x0F25CC46C3a123Afd0fa577B3Bf448EbD093db3b/erc721/claimTo'
POST_BODY='{"receiver": "0x8b145206f144E3a2111fC1CD2e086540199F34df","quantity": "1"}'
CONCURRENT=1
REQUESTS=1

echo $POST_BODY > post_data.json

/usr/bin/ab -p ./post_data.json \
  -T 'application/json' \
  -c $CONCURRENT -n $REQUESTS \
  "$URL$PATH"
