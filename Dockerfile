FROM node:18.15.0-alpine AS base

# Install tini
RUN apk add --no-cache tini

# Set the working directory
WORKDIR /app

# Use tini as entrypoint to handle killing processes
ENTRYPOINT ["/sbin/tini", "--"]

# Install build dependencies
RUN apk --no-cache --virtual build-dependencies add g++ make py3-pip openssl

# Copy package.json and yarn.lock files
COPY package*.json yarn*.lock ./

# Copy the entire project directory
COPY . .

RUN npm install -g nodemon

# Install dependencies for both development and production
RUN yarn install --frozen-lockfile --network-timeout 1000000

WORKDIR /app/https

RUN openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 \
    -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost" \
    -passout pass:thirdweb-engine

RUN chmod 600 key.pem cert.pem

WORKDIR /app

# Clean up build dependencies
RUN apk del build-dependencies

##############################
##############################

FROM base AS local_server

EXPOSE 3005

ENV NODE_ENV="local"
CMD [ "sh", "-c","yarn prisma:setup:dev && yarn dev:server" ]

##############################
##############################

FROM base AS local_worker

ENV NODE_ENV="local"
CMD [ "sh", "-c", "yarn prisma:setup:dev && yarn dev:worker" ]

##############################
##############################

# Production Node Modules stage
FROM node:18.15.0-alpine AS prod-dependencies

# Setting Docker Tag
ENV ENGINE_VERSION=$DOCKER_TAG

# Install build dependencies
RUN apk add --no-cache g++ make py3-pip openssl

WORKDIR /app

# Copy package.json and yarn.lock files
COPY package*.json yarn*.lock ./

# Copy the entire project directory
COPY . .

COPY --from=base /app/node_modules ./node_modules

# Build the project
RUN yarn build
RUN yarn copy-files

RUN rm -rf node_modules

# Install production dependencies only
RUN yarn install --production=true --frozen-lockfile --network-timeout 1000000

# Generate SSL certificates
WORKDIR /app/dist/https

RUN openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 \
    -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost" \
    -passout pass:thirdweb-engine

RUN chmod 600 key.pem cert.pem

# Clean up build dependencies
RUN apk del g++ make py3-pip openssl

##############################
##############################

# Production stage
FROM node:18.15.0-alpine AS prod

# Install tini
RUN apk add --no-cache tini

# Set the working directory
WORKDIR /app

ENV NODE_ENV="production"

EXPOSE 3005

# Copy package.json and yarn.lock files
COPY package*.json yarn*.lock ./

# Replace the schema path in the package.json file
RUN sed -i 's_"schema": "./src/prisma/schema.prisma"_"schema": "./dist/prisma/schema.prisma"_g' package.json

# Copy only production dependencies from the prod-dependencies stage
COPY --from=prod-dependencies /app/node_modules ./node_modules
COPY --from=prod-dependencies /app/dist ./dist
COPY --from=prod-dependencies /app/dist/https ./dist/https

# Add the node_modules/.bin directory to the PATH
ENV PATH /app/node_modules/.bin:$PATH

# Use tini as entrypoint to handle killing processes
ENTRYPOINT ["/sbin/tini", "--"]
CMD [ "yarn", "start"]