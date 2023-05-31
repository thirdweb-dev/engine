FROM node:18.15.0-alpine AS base

WORKDIR /app
RUN apk --no-cache --virtual build-dependencies add g++ make py3-pip

COPY . .
COPY package*.json .
COPY yarn*.json .

FROM base AS prod

EXPOSE 3005 3006

RUN yarn install
RUN yarn build
RUN yarn start

ENV NODE_ENV="production"

RUN yarn install --production
RUN apk del build-dependencies
CMD [ "yarn", "start"]
