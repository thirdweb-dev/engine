FROM node:18.20-slim AS base

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
FROM base AS certs

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

FROM base AS build

# Install Python3-Pip
RUN apt-get -y install python3-pip

# Copy package.json and yarn.lock first to leverage Docker cache
COPY package.json yarn.lock ./

# Copy the rest of your code
COPY . .

# Install all dependencies (including devDependencies)
RUN yarn install --frozen-lockfile --production=false --network-timeout 1000000

# Build the project
RUN yarn build && \
    yarn copy-files

##############################
##############################
##############################
##############################

FROM base AS prod-deps

WORKDIR /app

COPY package.json yarn.lock ./

# Install only production dependencies
RUN yarn install --frozen-lockfile --production=true --network-timeout 1000000

##############################
##############################
##############################
##############################

FROM base AS prod

EXPOSE 3005

ARG ENGINE_VERSION
ENV ENGINE_VERSION=${ENGINE_VERSION}
ENV NODE_ENV="production" \
    PATH=/app/node_modules/.bin:$PATH

COPY --from=certs /app/src/https ./dist/https
COPY --from=build /app/package.json .
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/src/prisma/* ./src/prisma/
COPY --from=build /app/dist ./dist

# Replace the schema path in the package.json file
RUN sed -i 's_"schema": "./src/prisma/schema.prisma"_"schema": "./dist/prisma/schema.prisma"_g' package.json

ENTRYPOINT [ "yarn", "start"]