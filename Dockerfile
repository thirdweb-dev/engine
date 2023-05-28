FROM node:18.15.0-alpine AS base

WORKDIR /app
RUN apk --no-cache --virtual build-dependencies add g++ make py3-pip

COPY . .
COPY package*.json .
COPY yarn*.json .

EXPOSE 3005

FROM base AS local_server

ENV NODE_ENV="development"

RUN yarn install --force
RUN apk del build-dependencies
ENV PATH /app/node_modules/.bin:$PATH

CMD [ "yarn", "dev" ]

FROM base AS local_worker

EXPOSE 3006

ENV NODE_ENV="development"

CMD [ "yarn", "dev-worker" ]

FROM base AS prod

RUN yarn install
RUN yarn build
RUN yarn build-worker

ENV NODE_ENV="production"

RUN yarn install --production
RUN apk del build-dependencies
CMD [ "yarn", "start"]
