FROM amd64/alpine:3.8

RUN apk add --update make gcc g++ python nodejs npm curl git krb5-dev zeromq-dev && \
npm install zeromq --zmq-external --save && \
apk del make gcc g++ python curl git krb5-dev

ADD ./package.json /package.json
RUN npm install --production && npm run clean

RUN addgroup -S databox && adduser -S -g databox databox
USER databox

ADD . .

LABEL databox.type="driver"

EXPOSE 8080

CMD ["npm","start"]
#CMD ["sleep","2147483647"]
