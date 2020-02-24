# Pixel perfect

Visual regression testing tool

## CLI usage

`npm install -D pixel-perfect-cli`

`pp init`

Configure pp.config.js

`pp test`

`pp approve`


## Run service

TODO

docker stop selenium-chrome
docker run -d -p 4444:4444 -p 5900:5900 --rm -v /dev/shm:/dev/shm -e NODE_MAX_INSTANCES=5 --name selenium-chrome selenium/standalone-chrome-debug:3.141
