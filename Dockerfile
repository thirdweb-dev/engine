FROM node:18.15.0-alpine AS base

WORKDIR /app
RUN apk --no-cache --virtual build-dependencies add g++ make py3-pip

COPY . .
COPY package*.json .
COPY yarn*.json .

EXPOSE 3005

FROM base AS local

ENV NODE_ENV="local"

RUN yarn install
RUN apk del build-dependencies
ENV PATH /app/node_modules/.bin:$PATH

CMD [ "yarn", "dev" ]

# FROM base AS dev

# ENV NODE_ENV="development"
# RUN yarn install

# CMD [ "yarn", "dev" ]

# FROM base AS prod

# ENV NODE_ENV="production"

# RUN yarn install
# RUN yarn build

# RUN yarn install --production
# CMD [ "yarn", "start" ]