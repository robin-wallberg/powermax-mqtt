FROM node:latest

LABEL maintainer="robin.l.wallberg@gmail.com"

WORKDIR /usr/src/app

COPY ./package.json ./yarn.lock ./

RUN yarn install

COPY ./dist/* ./

CMD [ "node", "index.js" ]