FROM node:12-slim@sha256:10fb4ac7d719c05b0c4e667b74c62b923292c2e6a4a057156ffcdedaa8c232ab AS install
ENV NODE_ENV production
WORKDIR /app
# Copying this first prevents re-running npm install on every code change.
COPY package*.json ./
RUN echo "@nomikos:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=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" > ~/.npmrc
RUN npm install --production=false 

FROM node:12-slim@sha256:10fb4ac7d719c05b0c4e667b74c62b923292c2e6a4a057156ffcdedaa8c232ab AS build
ENV NODE_ENV production
WORKDIR /app
COPY . /app
# Replace local node_modules
COPY --from=install /app/node_modules /app/node_modules
COPY utils/babel.config.js ./babel.config.js
RUN /app/node_modules/.bin/babel src -d dist -s

FROM mhart/alpine-node:slim-12 AS deployment-image
RUN apk add dumb-init && apk add bash
ARG NODE_ENV
ARG PROJECT_ID
ARG DB_HOST
ENV NODE_ENV $NODE_ENV
ENV PROJECT_ID $PROJECT_ID
ENV DB_HOST $DB_HOST
ARG GOOGLE_APPLICATION_CREDENTIALS
ENV GOOGLE_APPLICATION_CREDENTIALS $GOOGLE_APPLICATION_CREDENTIALS
WORKDIR /app
COPY . /app
COPY --from=install /app/node_modules /app/node_modules
# Copy local code to the container image.
COPY --from=build /app/dist /app/dist
CMD ["./entrypoint.sh"]