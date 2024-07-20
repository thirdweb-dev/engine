FROM node:18.19-alpine AS base

# Install tini & build dependencies
RUN apk add --no-cache tini && \
    apk --no-cache --virtual build-dependencies add g++ make py3-pip openssl

# Upgrade packages
RUN apk update && apk upgrade

# Set the working directory
WORKDIR /app


# Copy package.json and yarn.lock files
COPY package*.json yarn*.lock ./

# Copy the entire project directory
COPY . .

# Install dependencies for both development and production
RUN yarn install --frozen-lockfile --network-timeout 1000000

WORKDIR /app/src/https

RUN openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 \
    -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost" \
    -passout pass:thirdweb-engine && \
    chmod 600 key.pem cert.pem

WORKDIR /app

# Clean up build dependencies
RUN apk del build-dependencies

##############################
##############################

FROM base AS local

EXPOSE 3005
ENV NODE_ENV="local"
RUN npm install -g nodemon

# Use tini as entrypoint to handle killing processes
ENTRYPOINT ["/sbin/tini", "--"]

CMD [ "sh", "-c","yarn prisma:setup:dev && yarn dev:run" ]

##############################
##############################

# Production Node Modules stage
FROM base AS prod-dependencies

WORKDIR /app

# Build the project
RUN apk --no-cache --virtual build-dependencies add g++ make py3-pip && \
    yarn build && \
    yarn copy-files && \
    rm -rf node_modules && \
    yarn install --production=true --frozen-lockfile --network-timeout 1000000 && \
    apk del build-dependencies

# Upgrade packages
RUN apk update && apk upgrade

##############################
##############################

# Production stage
FROM node:18.19-alpine AS prod

# Setting ENV variables for image information
ARG ENGINE_VERSION
ENV ENGINE_VERSION=${ENGINE_VERSION}

# Install tini
RUN apk add --no-cache tini

# Set the working directory
WORKDIR /app
ENV NODE_ENV="production" \
    PATH=/app/node_modules/.bin:$PATH
    
EXPOSE 3005

# Copy package.json and yarn.lock files
COPY package*.json yarn*.lock ./

# Replace the schema path in the package.json file
RUN sed -i 's_"schema": "./src/prisma/schema.prisma"_"schema": "./dist/prisma/schema.prisma"_g' package.json

# Copy only production dependencies from the prod-dependencies stage
COPY --from=prod-dependencies /app/node_modules ./node_modules
COPY --from=prod-dependencies /app/dist ./dist
COPY --from=base /app/src/https ./dist/https

# Use tini as entrypoint to handle killing processes
ENTRYPOINT ["/sbin/tini", "--"]
CMD [ "yarn", "start"]