FROM amd64/alpine:3.8

WORKDIR /app

RUN addgroup -S databox && adduser -S -g databox databox && \
apk --no-cache add build-base pkgconfig nodejs npm git libzmq zeromq-dev libsodium-dev python  && \
npm install zeromq@4.6.0 --zmq-external --unsafe-perm --verbose && \
apk del build-base pkgconfig libsodium-dev python zeromq-dev


ADD ./package.json package.json
RUN npm install --production && npm run clean

ADD . .

LABEL databox.type="driver"

EXPOSE 8080

USER databox
CMD ["npm","start"]
#CMD ["sleep","2147483647"]
