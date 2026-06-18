#!/bin/bash
set -e

CONF_PATH="/etc/nginx/sites-available/dispatch.owera.ca.conf"
ENABLED_PATH="/etc/nginx/sites-enabled/dispatch.owera.ca.conf"

echo "=== Writing Nginx Configuration ==="
cat << 'EOF' > "$CONF_PATH"
server {
    server_name dispatch.owera.ca;
    root /var/www/html/dispatch.owera.ca;

    index index.html index.htm;

    # Backend API -> FastAPI on port 7008
    location /api/ {
        proxy_pass         http://127.0.0.1:7008;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;
    }

    # Frontend -> Vite preview server on port 7007
    location / {
        proxy_pass         http://127.0.0.1:7007;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;
    }

    listen 80;
}
EOF

echo "=== Enabling Nginx Configuration ==="
if [ ! -f "$ENABLED_PATH" ]; then
    ln -s "$CONF_PATH" "$ENABLED_PATH"
fi

echo "=== Testing and Reloading Nginx ==="
nginx -t
systemctl reload nginx

echo "=== Running Certbot for SSL ==="
certbot --nginx -d dispatch.owera.ca --non-interactive --agree-tos --email kkumar.sandeep89@gmail.com --redirect

echo "=== Nginx Configuration Complete! ==="
