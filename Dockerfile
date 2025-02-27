FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# Generate cert for local https
FROM base AS certs
WORKDIR /usr/src/app/src/https
RUN apt-get update && apt-get install -y openssl
RUN openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 \
    -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost" \
    -passout pass:thirdweb-engine && \
    chmod 600 key.pem cert.pem

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Final image
FROM base AS release
ARG ENGINE_VERSION
ENV ENGINE_VERSION=${ENGINE_VERSION}
ENV NODE_ENV="production"

COPY --from=install /temp/prod/node_modules node_modules
COPY --from=certs /usr/src/app/src/https ./src/https
COPY . .

USER bun
EXPOSE 3005
ENTRYPOINT [ "bun", "run", "src/index.ts" ]
