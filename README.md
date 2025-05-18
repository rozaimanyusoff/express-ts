# Express-TS Backend Installation Guide

This guide will help you set up the database for your Express TypeScript backend using the provided SQL files and initialization script.

## Prerequisites
- MySQL server installed and running
- Access to a MySQL user with privileges to create tables and insert data
- `zsh` shell (default on macOS)

## 1. Prepare the Database
1. Create a new MySQL database (replace `your_db_name` as needed):
   ```zsh
   mysql -u <user> -p -e "CREATE DATABASE your_db_name CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
   ```

## 2. Configure Environment Variables
- Copy the provided `.env.example` (if available) to `.env`:
  ```zsh
  cp .env.example .env
  ```
- Edit `.env` and set your database credentials and other required settings. For example:
  ```env
  DB_HOST=localhost
  DB_PORT=3306
  DB_USER=your_db_user
  DB_PASSWORD=your_db_password
  DB_NAME=auth
  # ...other settings...
  ```
- All credentials and secrets must be defined in `.env` before running the install script.

## 3. Run the Database Initialization Script
1. Make the script executable (if not already):
   ```zsh
   chmod +x scripts/init-db.sh
   ```
2. Run the script, providing your database name, user, and password:
   ```zsh
   ./scripts/init-db.sh your_db_name your_db_user your_db_password
   ```
   This will import all schema and seed data from `src/db/` in the correct order.

## 4. Start the Backend Server
- Install dependencies and start the server as usual:
   ```zsh
   npm install
   npm run dev
   ```

## Notes
- The admin user is pre-created (see `src/db/users.sql`). Change the email/password as needed after installation.
- User-group and group-navigation relationships are seeded for initial access control.
- You can modify or extend the SQL files in `src/db/` to suit your needs.

## Troubleshooting
- If you encounter errors during import, check that your MySQL user has sufficient privileges and that the database exists.
- Review the output of the script for any failed imports.

---

For further customization or automation, see the comments in `scripts/init-db.sh`.

# Production Setup Guide

Follow these steps to deploy the Express-TS backend on your production server:

## 1. Clone the Repository
```zsh
git clone <your-repo-url> /path/to/your/app
cd /path/to/your/app
```

## 2. Initialize the Database
- Ensure your `.env` file is configured with the correct credentials before running the install script.
  ```zsh
  chmod +x scripts/init-db.sh
  ./scripts/init-db.sh auth <db_user> <db_password>
  ```

## 3. Install Dependencies
```zsh
npm install
```

## 4. Build the Project
```zsh
npm run build
```

## 5. Run with PM2
Install PM2 globally if not already installed:
```zsh
npm install -g pm2
```
Start the server with PM2:
```zsh
pm run build # (if not already built)
pm run start # or: pm2 start dist/server.js --name express-ts-backend
```
To keep the app running on reboot:
```zsh
pm2 startup
pm2 save
```

---

- Ensure your `.env` file is configured for production (database, secrets, etc).
- For more PM2 options, see [PM2 documentation](https://pm2.keymetrics.io/).
- For troubleshooting, see the main installation guide above.

# Automated Full Production Setup

You can automate the entire production setup with a single script. Here’s how:

## 1. Create an install script
Create a file named `install.sh` in your project root with the following content:

```zsh
#!/bin/zsh
# Automated install for Express-TS backend

# Usage: ./install.sh <database_name> <db_user> <db_password> <repo_url> <app_dir>

if [ "$#" -ne 5 ]; then
  echo "Usage: $0 <database_name> <db_user> <db_password> <repo_url> <app_dir>"
  exit 1
fi

DB_NAME="$1"
DB_USER="$2"
DB_PASS="$3"
REPO_URL="$4"
APP_DIR="$5"

# Clone repo
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
```

## 2. Make the script executable
```zsh
chmod +x install.sh
```

## 3. Run the script
```zsh
./install.sh <database_name> <db_user> <db_password> <repo_url> <app_dir>
```

---

This will:
- Clone the repo (if not already cloned)
- Initialize the database
- Install dependencies
- Build the project
- Install and configure PM2
- Start the app with PM2

- The install script assumes all credentials are set in your `.env` file. Double-check your `.env` before running automation.

You can further customize this script for your environment or CI/CD pipeline.
