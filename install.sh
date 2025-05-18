#!/bin/zsh
# Automated install for Express-TS backend
# Usage: ./install.sh auth <db_user> <db_password> <repo_url> <app_dir>

if [ "$#" -ne 5 ]; then
  echo "Usage: $0 auth <db_user> <db_password> <repo_url> <app_dir>"
  exit 1
fi

DB_NAME="auth"
DB_USER="$2"
DB_PASS="$3"
REPO_URL="$4"
APP_DIR="$5"

# Clone repo if not present
if [ ! -d "$APP_DIR" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# Initialize DB
chmod +x scripts/init-db.sh
./scripts/init-db.sh "$DB_NAME" "$DB_USER" "$DB_PASS"

# Install dependencies
npm install

# Build project
npm run build

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
fi

# Start with PM2
pm2 start dist/server.js --name express-ts-backend
pm2 save
pm2 startup

echo "\nSetup complete! App is running with PM2."
