FROM node:18.15.0-alpine AS base

# Install tini
RUN apk add --no-cache tini

# Set the working directory
WORKDIR /app

# Use tini as entrypoint to handle killing processes
ENTRYPOINT ["/sbin/tini", "--"]

# Install build dependencies
RUN apk --no-cache --virtual build-dependencies add g++ make py3-pip

# Copy package.json and yarn.lock files
COPY package*.json yarn*.lock ./

# Copy the entire project directory
COPY . .

# Install dependencies for both development and production
RUN yarn install --frozen-lockfile --network-timeout 1000000

# Build the project
RUN yarn build
RUN yarn copy-files

# Clean up build dependencies
RUN apk del build-dependencies

# Expose the necessary ports
EXPOSE 3005

FROM base AS local_server

ENV NODE_ENV="local"
CMD [ "yarn", "dev:server" ]

FROM base AS local_worker

ENV NODE_ENV="local"
CMD [ "yarn", "dev:worker" ]

# Production stage
FROM node:18.15.0-alpine AS prod

# Install tini
RUN apk add --no-cache tini

# Set the working directory
WORKDIR /app

ENV NODE_ENV="production"

# Install build dependencies
RUN apk --no-cache --virtual build-dependencies add g++ make py3-pip

# Copy package.json and yarn.lock files
COPY package*.json yarn*.lock ./

# Replace the schema path in the package.json file
RUN sed -i 's_"schema": "./src/prisma/schema.prisma"_"schema": "./dist/src/prisma/schema.prisma"_g' package.json

# Copy the built dist folder from the base stage to the production stage
COPY --from=base /app/dist ./dist

# Generate SSL certificates
RUN apk --update add openssl
WORKDIR /dist/https
RUN openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 \
    -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost" \
    -passout pass:thirdweb-engine
RUN chmod 600 key.pem cert.pem
RUN apk del openssl

# Change Working Directory back to /app
WORKDIR /app

# Install production dependencies only
RUN yarn install --production=true --frozen-lockfile --network-timeout 1000000

# Clean up build dependencies
RUN apk del build-dependencies

# Use tini as entrypoint to handle killing processes
ENTRYPOINT ["/sbin/tini", "--"]
CMD [ "yarn", "start"]