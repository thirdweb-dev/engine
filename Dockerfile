FROM node:18.20-slim AS base

WORKDIR /app

# Upgrade packages and install pnpm
RUN apt-get -y update && \
    apt-get -y upgrade && \
    apt-get -y install libssl-dev && \
    npm install -g pnpm

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

# Copy the entire project directory
COPY . .

# Install dependencies for both development and production (May need devDependencies to build)
# Build the project
# Prune dev dependencies from the packages
RUN pnpm install --frozen-lockfile && \
    pnpm build && \
    pnpm copy-files && \
    pnpm install --frozen-lockfile --prod

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
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src/prisma/* ./src/prisma/
COPY --from=build /app/dist ./dist

# Replace the schema path in the package.json file
RUN sed -i 's_"schema": "./src/prisma/schema.prisma"_"schema": "./dist/prisma/schema.prisma"_g' package.json

ENTRYPOINT [ "yarn", "start"]
