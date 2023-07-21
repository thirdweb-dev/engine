#!/bin/bash

. .env

echo "Benchmarking $BENCHMARK_HOST$BENCHMARK_URL_PATH"
echo "POST body: $BENCHMARK_POST_BODY"
echo "With Concurrency: $BENCHMARK_CONCURRENCY and Requests: $BENCHMARK_REQUESTS"

echo $BENCHMARK_POST_BODY > post_data.json

/usr/bin/ab -p ./post_data.json \
  -T 'application/json' \
  -H 'x-secret-key:fa1a21a6d073902986843e45458acf47f721caed91765623e3951a36ae5c8f3b30173c6446087c3cc82f516ee7ce5d115c4e9ed87bc6d1842f5e95349d771a84' \
  -c $BENCHMARK_CONCURRENCY -n $BENCHMARK_REQUESTS \
  "$BENCHMARK_HOST$BENCHMARK_URL_PATH"
