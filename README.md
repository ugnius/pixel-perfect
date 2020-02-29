# Pixel perfect

Visual regression testing tool

## CLI usage

`npm install -D pixel-perfect-cli`

`pp init`

Configure pp.config.js

`pp test`

`pp approve`


## Run service

example docker-compose.yaml
```yaml
version: '3.7'

services:
  pixel-perfect:
    image: kaugnius/pixel-perfect-service
    ports:
      - 8010:8080
    environment:
      - MONGO_CONNECTION_STRING=mongodb://mongo/pixel-perfect
      - SELENIUM_SERVER=http://selenium-chrome:4444/wd/hub
    depends_on:
      - mongo
      - selenium-chrome
  mongo:
    image: mongo:4.0
    volumes:
      - pp-data:/data/db
  selenium-chrome:
    image: selenium/standalone-chrome:3.141
    volumes:
      - /dev/shm:/dev/shm
    environment:
      - NODE_MAX_INSTANCES=5
volumes:
  pp-data:
```