# Following best practices from:
# https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/
# Please read the link above before making any modifications to this file.

###############
# Build Stage # 
###############

FROM node:20.11.1-bullseye-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init

# Run "npm ci" first so node_modules container layers are cached. This should
# allow us to quickly iterate changes to the code without having to wait for
# "npm ci" every time we commit.
WORKDIR /usr/src/app
COPY --chown=node:node packages/frontend/package.json /usr/src/app/packages/frontend/
COPY --chown=node:node packages/backend/package.json /usr/src/app/packages/backend/
COPY --chown=node:node packages/shared/package.json /usr/src/app/packages/shared/
COPY --chown=node:node package*.json ./

# Run "npm build" steps after "npm ci" to take advantage of caching.
RUN npm ci --omit=dev
RUN npm i typescript

ENV \
  REACT_APP_FEATURED_ELECTIONS=__REACT_APP_FEATURED_ELECTIONS__ \
  REACT_APP_KEYCLOAK_URL=__REACT_APP_KEYCLOAK_URL__ \
  REACT_APP_MAX_BALLOT_RANKS=__REACT_APP_MAX_BALLOT_RANKS__ \
  REACT_APP_DEFAULT_BALLOT_RANKS=__REACT_APP_DEFAULT_BALLOT_RANKS__ \
  REACT_APP_COMMIT_SHA=__REACT_APP_COMMIT_SHA__

COPY --chown=node:node . /usr/src/app/

RUN npm run build -ws

####################
# Production Stage #
####################

FROM node:20.11.1-bullseye-slim
ENV NODE_ENV=production
COPY --from=build /usr/bin/dumb-init /usr/bin/dumb-init
USER node
WORKDIR /usr/src/app
COPY --chown=node:node --from=build /usr/src/app/packages/shared/dist /usr/src/app/packages/shared/dist
COPY --chown=node:node --from=build /usr/src/app/packages/shared/package.json /usr/src/app/packages/shared/
COPY --chown=node:node --from=build /usr/src/app/packages/frontend/build /usr/src/app/packages/frontend/build
COPY --chown=node:node --from=build /usr/src/app/packages/backend/build /usr/src/app/packages/backend/build
COPY --chown=node:node --from=build /usr/src/app/node_modules /usr/src/app/node_modules
COPY --chown=node:node --from=build /usr/src/app/package*.json ./
COPY --chown=node:node --from=build /usr/src/app/replace.sh ./
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start"]
EXPOSE 5000
