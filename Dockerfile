FROM eclipse-temurin:21-jre-noble

ENV PGDATA=/var/lib/postgresql/data
ENV APP_JAR=/mnt/app/grcpc-app.jar

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        postgresql \
        postgresql-client \
        gosu \
        ca-certificates \
        locales; \
    PG_BIN="$(dirname "$(find /usr/lib/postgresql -type f -name initdb | sort -V | tail -n 1)")"; \
    echo "PostgreSQL bin path: ${PG_BIN}"; \
    find "${PG_BIN}" -maxdepth 1 -type f -executable -exec ln -sf {} /usr/local/bin/ \; ; \
    command -v initdb; \
    command -v pg_ctl; \
    command -v postgres; \
    command -v psql; \
    command -v pg_isready; \
    rm -rf /var/lib/apt/lists/*; \
    mkdir -p "${PGDATA}" /mnt/app; \
    chown -R postgres:postgres /var/lib/postgresql /mnt/app

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

VOLUME ["/var/lib/postgresql/data"]
VOLUME ["/mnt/app"]

EXPOSE 8080
EXPOSE 5432

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]