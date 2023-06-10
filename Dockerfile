FROM node:18.15.0-alpine AS base

WORKDIR /app
RUN apk --no-cache --virtual build-dependencies add g++ make py3-pip

COPY . .
COPY package*.json .
COPY yarn*.json .

FROM base AS prod

EXPOSE 3005 3006

ENV NODE_ENV="production"
RUN yarn install --production
RUN yarn build
RUN yarn copy-files
RUN apk del build-dependencies

ENTRYPOINT [ "docker-entrypoint.sh" ]
CMD [ "yarn", "start"]
