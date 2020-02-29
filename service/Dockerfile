FROM node:10 AS builder
RUN mkdir /prod_node_modules
WORKDIR /prod_node_modules
COPY package*.json ./
RUN npm ci --production --quiet
RUN mkdir /build
WORKDIR /build
COPY package*.json ./
RUN npm ci --quiet
COPY . .
RUN npm run build

FROM bitnami/node:10-prod
WORKDIR /usr/src/app
COPY --from=builder /prod_node_modules/node_modules ./node_modules
COPY --from=builder /build/dist ./dist
COPY config.js .
CMD [ "node", "dist/server.bundle.js" ]
