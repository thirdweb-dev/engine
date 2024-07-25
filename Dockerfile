FROM node:18.20-slim AS base

# Upgrade packages
RUN apt-get -y update && apt-get -y upgrade

# Install tini & build dependencies
RUN apt-get install -y g++ make python3-pip openssl
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
# RUN apt del build-dependencies

##############################
##############################

FROM base AS local

EXPOSE 3005
ENV NODE_ENV="local"
RUN npm install -g nodemon

CMD [ "sh", "-c","yarn prisma:setup:dev && yarn dev:run" ]

##############################
##############################

# Production Node Modules stage
FROM base AS prod-dependencies

WORKDIR /app

# Upgrade packages
RUN apt-get -y update && apt-get -y upgrade

# Build the project
RUN apt-get install -y g++ make python3-pip && \
    yarn build && \
    yarn copy-files && \
    rm -rf node_modules && \
    yarn install --production=true --frozen-lockfile --network-timeout 1000000


##############################
##############################

# Production stage
FROM node:18.20-slim AS prod

# Setting ENV variables for image information
ARG ENGINE_VERSION
ENV ENGINE_VERSION=${ENGINE_VERSION}

# Install tini
# RUN apt-get install -y tini

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

CMD [ "yarn", "start"]