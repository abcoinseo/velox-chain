FROM ghcr.io/0xpolygon/polygon-edge:latest

RUN apk add --no-cache bash jq
WORKDIR /app

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8545 9632 1478
ENTRYPOINT ["/app/entrypoint.sh"]
