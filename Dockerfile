FROM node:20.15-alpine3.20 AS base

# Install tini & build dependencies
RUN apk add --no-cache tini && \
    apk --no-cache --virtual build-dependencies add openssl && \
    apk del build-dependencies

# Upgrade packages
RUN apk update && apk upgrade

# Set the working directory
WORKDIR /app

WORKDIR /app/src/https

RUN openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 \
    -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost" \
    -passout pass:thirdweb-engine && \
    chmod 600 key.pem cert.pem

##############################
##############################

FROM base AS local

WORKDIR /app

EXPOSE 3005
ENV NODE_ENV="local"
RUN npm install -g nodemon

# Use tini as entrypoint to handle killing processes
ENTRYPOINT ["/sbin/tini", "--"]

CMD [ "sh", "-c","npm run prisma:setup:dev && npm run dev:run" ]

##############################
##############################


##############################
##############################

# Production stage
FROM node:20.15-alpine3.20 AS prod

# Set the working directory
WORKDIR /app

EXPOSE 3005

# Copy files
COPY . .

# Setting ENV variables for image information
ARG ENGINE_VERSION
ENV ENGINE_VERSION=${ENGINE_VERSION}
ENV NODE_ENV="production"

# Install tini
RUN apk add --no-cache tini && \
    apk --no-cache --virtual build-dependencies add g++ make py3-pip && \
    rm -rf node_modules && \
    npm ci --omit=dev && \
    apk del build-dependencies

# Upgrade packages
RUN apk update && apk upgrade

ENV PATH=/app/node_modules/.bin:$PATH

# Use tini as entrypoint to handle killing processes
ENTRYPOINT ["/sbin/tini", "--"]
CMD [ "npm", "run", "start"]
