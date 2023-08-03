#!/bin/bash

. .env

echo "Benchmarking $BENCHMARK_HOST$BENCHMARK_URL_PATH"
echo "POST body: $BENCHMARK_POST_BODY"
echo "With Concurrency: $BENCHMARK_CONCURRENCY and Requests: $BENCHMARK_REQUESTS"

echo $BENCHMARK_POST_BODY > post_data.json

/usr/bin/ab -p ./post_data.json \
  -T 'application/json' \
  -H 'x-secret-key:<copy_your_tw_secret_key_from_env_file>' \
  -c $BENCHMARK_CONCURRENCY -n $BENCHMARK_REQUESTS \
  "$BENCHMARK_HOST$BENCHMARK_URL_PATH"
