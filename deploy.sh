#!/bin/bash

# Stop script execution on error
set -e

DOMAIN="jewellery.stafftrack.cloud"
SERVER_IP="192.168.1.36"

echo "=================================================="
echo " Starting Deployment for $DOMAIN ($SERVER_IP)"
echo "=================================================="

# 1. Update system packages
apt update && apt upgrade -y

# 2. Install Node.js (v20 LTS), Nginx, Git, PM2, MongoDB
if ! command -v node &> /dev/null; then
    echo "[+] Installing Node.js v20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

if ! command -v nginx &> /dev/null; then
    echo "[+] Installing Nginx..."
    apt install -y nginx
fi

if ! command -v pm2 &> /dev/null; then
    echo "[+] Installing PM2 process manager..."
    npm install -g pm2
fi

if ! command -v mongod &> /dev/null; then
    echo "[+] Installing MongoDB Community Server..."
    apt install -y gnupg curl
    rm -f /usr/share/keyrings/mongodb-server-7.0.gpg
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
    echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list || true
    apt update || true
    apt install -y mongodb-org || apt install -y mongodb || true
    systemctl enable mongod || systemctl enable mongodb || true
    systemctl start mongod || systemctl start mongodb || true
fi

# 3. Project Directory Setup
APP_DIR=$(pwd)
echo "[+] Current deployment directory: $APP_DIR"

# 4. Configure Backend Environment (.env)
echo "[+] Creating server environment file..."
cat <<EOT > server/.env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/girvi_management
JWT_SECRET=girvi_mortgage_secret_key_2026_$DOMAIN
SERVER_IP=$SERVER_IP
DOMAIN=$DOMAIN
NODE_ENV=production
EOT

# 5. Install Dependencies & Build Frontend Apps
echo "[+] Installing root & server dependencies..."
npm install --legacy-peer-deps || true
npm install --prefix server --legacy-peer-deps

echo "[+] Building Client App with dynamic relative API URL..."
cat <<EOT > client/.env
VITE_API_URL=
EOT
npm install --prefix client --legacy-peer-deps
npm run build --prefix client

echo "[+] Building Superadmin App with dynamic relative API URL..."
cat <<EOT > superadmin/.env
VITE_API_URL=
EOT
npm install --prefix superadmin --legacy-peer-deps
npm run build --prefix superadmin

# 6. Start Node.js Backend Server via PM2
echo "[+] Starting/Restarting Backend Server via PM2..."
cd $APP_DIR/server
pm2 stop girvi-backend || true
pm2 start server.js --name "girvi-backend"
pm2 save
pm2 startup | tail -n 1 | bash || true
cd $APP_DIR

# 7. Configure Nginx Web Server for domain jewellery.stafftrack.cloud & IP 192.168.1.36
echo "[+] Configuring Nginx reverse proxy & static serving..."
cat <<EOT > /etc/nginx/sites-available/jeweller-mortgage
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN $SERVER_IP localhost _;

    # Client Web Application (Frontend)
    location / {
        root $APP_DIR/client/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Admin Portal shortcut (/admin)
    location /admin {
        alias $APP_DIR/client/dist/;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Superadmin Web Application (Port 80 /superadmin)
    location ^~ /superadmin {
        alias $APP_DIR/superadmin/dist;
        index index.html;
        try_files \$uri \$uri/ /superadmin/index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Uploads directory serving
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000/uploads/;
    }
}

server {
    listen 8080;
    server_name $DOMAIN www.$DOMAIN $SERVER_IP localhost _;

    # Superadmin Web Application
    location / {
        root $APP_DIR/superadmin/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API Proxy for Superadmin
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOT

# Allow firewall ports
ufw allow 80/tcp || true
ufw allow 8080/tcp || true

# Link Nginx site configuration
ln -sf /etc/nginx/sites-available/jeweller-mortgage /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test & Restart Nginx
nginx -t
systemctl restart nginx

echo "=================================================="
echo " DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo " Client Web App      : http://$DOMAIN (or http://$SERVER_IP)"
echo " Superadmin Web App  : http://$DOMAIN:8080 (or http://$SERVER_IP:8080)"
echo " Backend API Server  : http://$DOMAIN/api (or http://$SERVER_IP:5000)"
echo "=================================================="
