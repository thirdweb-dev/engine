FROM node:18.15.0-alpine AS base

# Set the working directory
WORKDIR /app

# Install build dependencies
RUN apk --no-cache --virtual build-dependencies add g++ make py3-pip

# Copy package.json and yarn.lock files
COPY package*.json yarn*.json ./

# Copy the entire project directory
COPY . .

# Install dependencies for both development and production
RUN yarn install --frozen-lockfile

# Build the project
RUN yarn build
RUN yarn copy-files

# Clean up build dependencies
RUN apk del build-dependencies

# Expose the necessary ports
EXPOSE 3005

FROM base AS local_server

ENV NODE_ENV="local"
CMD [ "yarn", "dev" ]

FROM base AS local_worker

ENV NODE_ENV="local"
CMD [ "yarn", "dev-worker" ]

# Production stage
FROM node:18.15.0-alpine AS prod

# Set the working directory
WORKDIR /app

ENV NODE_ENV="production"

# Copy package.json and yarn.lock files
COPY package*.json yarn*.json ./

# Copy the built dist folder from the base stage to the production stage
COPY --from=base /app/dist ./dist

# Install production dependencies only
RUN yarn install --production=true

CMD [ "yarn", "start"]