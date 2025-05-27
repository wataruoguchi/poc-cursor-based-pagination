FROM mcr.microsoft.com/devcontainers/javascript-node:1-22-bookworm
RUN apt-get update \
    && apt-get install -y postgresql-client ack mkcert \
    && apt-get clean \
    && apt-get autoremove --purge \
    && locale-gen en_US.UTF-8

# Copy certificate generation script
COPY generate-certs.sh /usr/local/bin/generate-certs.sh
RUN chmod +x /usr/local/bin/generate-certs.sh