FROM eclipse-temurin:21-jre-noble

ENV APP_JAR=/mnt/app/grcpc-app.jar
ENV MINIO_DATA_DIR=/var/lib/minio/data

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        gosu \
        curl \
        ca-certificates \
        locales; \
    curl -fsSL -o /usr/local/bin/minio https://dl.min.io/server/minio/release/linux-amd64/minio; \
    chmod +x /usr/local/bin/minio; \
    command -v minio; \
    useradd --system --home-dir /var/lib/minio --create-home --shell /usr/sbin/nologin minio; \
    rm -rf /var/lib/apt/lists/*; \
    mkdir -p "${MINIO_DATA_DIR}" /mnt/app; \
    chown -R minio:minio /var/lib/minio "${MINIO_DATA_DIR}"

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

VOLUME ["/var/lib/minio/data"]
VOLUME ["/mnt/app"]

EXPOSE 8080
EXPOSE 9000
EXPOSE 9001

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
