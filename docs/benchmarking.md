## Local Benchmarking

As a way to support quantifying the robustness of our system, we have added benchmarking. Benchmark results may vary based on the machine that is being used.

To run the benchmark:

1. Run local server with `yarn dev`
2. Set-up `.env.benchmark` (For sensible defaults: `cp .env.benchmark.example .env.benchmark`) - you'll need to update the `THIRDWEB_API_SECRET_KEY` at minimum.
3. Run benchmark in a separate terminal with `yarn benchmark`
