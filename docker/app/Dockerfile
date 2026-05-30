FROM node:22-alpine AS ui-builder
WORKDIR /workspace/grcpc-ui

COPY grcpc-ui/package*.json ./
RUN npm ci

COPY grcpc-ui/ ./
RUN npm run build

FROM maven:3.9.9-eclipse-temurin-21 AS app-builder
WORKDIR /workspace

COPY grcpc-app/pom.xml grcpc-app/pom.xml
RUN --mount=type=cache,target=/root/.m2 \
    mvn -f grcpc-app/pom.xml -DskipTests -Dskip.ui=true dependency:go-offline

COPY grcpc-app/ grcpc-app/
COPY --from=ui-builder /workspace/grcpc-ui/dist grcpc-ui/dist
RUN --mount=type=cache,target=/root/.m2 \
    mvn -f grcpc-app/pom.xml -DskipTests -Dskip.ui=true package
RUN find grcpc-app/target -maxdepth 1 -type f -name "grcpc-app-*.jar" ! -name "*.original" \
    -exec cp {} /tmp/grcpc-app.jar \; \
    && test -f /tmp/grcpc-app.jar

FROM eclipse-temurin:21-jre-noble AS runtime
WORKDIR /opt/grcpc

ENV APP_JAR=/opt/grcpc/grcpc-app.jar
ENV SERVER_PORT=8080

COPY docker/app/entrypoint.sh /usr/local/bin/grcpc-app-entrypoint.sh
COPY --from=app-builder /tmp/grcpc-app.jar /opt/grcpc/grcpc-app.jar

RUN chmod +x /usr/local/bin/grcpc-app-entrypoint.sh; \
    useradd --system --home-dir /opt/grcpc --shell /usr/sbin/nologin grcpc; \
    chown -R grcpc:grcpc /opt/grcpc

USER grcpc
EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/grcpc-app-entrypoint.sh"]
