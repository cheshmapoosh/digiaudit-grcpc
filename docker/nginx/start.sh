#!/bin/sh
set -eu

case "$PUBLIC_HOST" in
    ''|[!a-zA-Z0-9]*|*[!a-zA-Z0-9.-]*)
        echo "PUBLIC_HOST must be a hostname or IPv4 address without scheme or port" >&2
        exit 1
        ;;
esac

case "$GRCPC_MINIO_BUCKET" in
    ''|[!a-z0-9]*|*[!a-z0-9.-]*)
        echo "GRCPC_MINIO_BUCKET must be a DNS-compatible bucket name" >&2
        exit 1
        ;;
esac

listen_options=""
tls_config=""
case "$PUBLIC_SCHEME" in
    http) ;;
    https)
        if [ ! -s /etc/nginx/tls/fullchain.pem ] || [ ! -s /etc/nginx/tls/privkey.pem ]; then
            echo "HTTPS requires fullchain.pem and privkey.pem in NGINX_TLS_DIR" >&2
            exit 1
        fi
        listen_options="ssl"
        tls_config="ssl_certificate /etc/nginx/tls/fullchain.pem;
        ssl_certificate_key /etc/nginx/tls/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;"
        ;;
    *)
        echo "PUBLIC_SCHEME must be http or https" >&2
        exit 1
        ;;
esac

cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen 8080 $listen_options;
    server_name $PUBLIC_HOST;
    $tls_config

    # Resolve Docker service addresses again after a container is replaced.
    resolver 127.0.0.11 valid=10s ipv6=off;
    set \$app_upstream app:8080;
    set \$minio_upstream minio:9000;

    client_max_body_size 100m;
    proxy_read_timeout 300s;

    location ^~ /$GRCPC_MINIO_BUCKET/ {
        if (\$request_method != GET) { return 405; }
        if (\$arg_x_amz_signature = "") { return 404; }

        # Preserve the host (including any port), raw path and query signed by MinIO.
        access_log off;
        error_log /dev/null;
        proxy_set_header Host \$http_host;
        proxy_set_header Cookie "";
        proxy_set_header Authorization "";
        proxy_buffering off;
        proxy_pass http://\$minio_upstream;
    }

    location / {
        proxy_set_header Host \$http_host;
        proxy_set_header Forwarded "";
        proxy_set_header X-Forwarded-Host \$http_host;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Port "";
        proxy_set_header X-Forwarded-Prefix "";
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_pass http://\$app_upstream;
    }
}
EOF

nginx -t
exec nginx -g 'daemon off;'
