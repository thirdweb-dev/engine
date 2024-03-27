FROM node:20.11.1-alpine AS base
WORKDIR /app

##############################
##############################
FROM base AS install

RUN apk add --no-cache openssl
RUN curl -fsSL https://bun.sh/install | bash

# Install dev
RUN mkdir -p /temp/dev
COPY package*.json bun.lockb /temp/dev
RUN cd /temp/dev && bun install --frozen-lockfile

# Install production
RUN mkdir -p /temp/prod
COPY package*.json bun.lockb /temp/prod
RUN cd /temp/prod && bun install --frozen-lockfile --production
RUN cd /temp/prod && openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 \
    -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost" \
    -passout pass:thirdweb-engine && \
    chmod 600 key.pem cert.pem

##############################
##############################
FROM base AS prerelease

COPY --from=install /temp/dev/node_modules node_modules
COPY . .

RUN bun test

##############################
##############################
FROM base AS prod
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=install /temp/prod/*.pem .
COPY --from=prerelease /app/index.ts .
COPY --from=prerelease /app/package.json .

RUN apk add --no-cache tini

ARG ENGINE_VERSION
ENV ENGINE_VERSION=${ENGINE_VERSION}
ENV NODE_ENV="production" \
    PATH=/app/node_modules/.bin:$PATH
    
EXPOSE 3005/tcp
# Use tini as entrypoint to handle killing processes
ENTRYPOINT ["/sbin/tini", "--"]
CMD [ "bun", "start"]