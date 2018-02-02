FROM node:latest

WORKDIR /usr/src/app

COPY ../package.json ../yarn.lock ./

RUN yarn install

COPY ../dist/* .

CMD [ "node", "start" ]