#!/bin/zsh
# Database initialization script for express-ts backend
# Usage: ./scripts/init-db.sh <database_name> <user> <password>

if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <database_name> <user> <password>"
  exit 1
fi

DB_NAME="$1"
DB_USER="$2"
DB_PASS="$3"
SQL_DIR="$(dirname "$0")/../src/db"

for sql in users.sql roles.sql groups.sql navigation.sql user_groups.sql group_nav.sql logs_auth.sql notifications.sql pending_users.sql user_profile.sql user_tasks.sql; do
  echo "Importing $sql..."
  mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SQL_DIR/$sql"
  if [ $? -ne 0 ]; then
    echo "Failed to import $sql"
    exit 2
  fi
done

echo "Database initialization complete."
