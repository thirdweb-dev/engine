FROM node:18.15.0-alpine

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

EXPOSE 3005 3006

ENV NODE_ENV="production"
RUN yarn install --production
RUN yarn build
RUN yarn copy-files
RUN apk del build-dependencies

ENTRYPOINT [ "docker-entrypoint.sh" ]
CMD [ "yarn", "start"]
