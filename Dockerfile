FROM node:18.20-slim as base

WORKDIR /app

# Upgrade packages
RUN apt-get -y update && \
    apt-get -y upgrade && \
    apt-get -y install libssl-dev

##############################
##############################
##############################
##############################

# Generate cert for local https
FROM base as certs

WORKDIR /app/src/https

RUN apt-get -y install openssl

RUN openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 \
    -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost" \
    -passout pass:thirdweb-engine && \
    chmod 600 key.pem cert.pem

##############################
##############################
##############################
##############################

FROM base as build

# Copy the entire project directory
COPY . .

# Install dependencies for both development and production (May need devDependencies to build)
# Build the project
# Prune dev dependencies from the packages
RUN yarn install --frozen-lockfile --production=false --network-timeout 1000000 && \
    yarn build && \
    yarn install --frozen-lockfile --production=true --network-timeout 1000000

##############################
##############################
##############################
##############################

FROM base as prod

EXPOSE 3005

ARG ENGINE_VERSION
ENV ENGINE_VERSION=${ENGINE_VERSION}
ENV NODE_ENV="production" \
    PATH=/app/node_modules/.bin:$PATH

COPY --from=certs /app/src/https ./dist/https
COPY --from=build /app/package.json .
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src/prisma/* ./src/prisma/
COPY --from=build /app/dist ./dist

ENTRYPOINT [ "yarn", "start"]
