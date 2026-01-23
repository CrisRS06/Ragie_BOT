#!/bin/sh
set -e

echo "=== PEPS Inventario - Startup ==="
echo "Waiting for database connection..."

MAX_RETRIES=30
RETRY_COUNT=0

# Retry loop until database is available
until node node_modules/prisma/build/index.js migrate deploy 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))

  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "ERROR: Database not available after $MAX_RETRIES attempts"
    exit 1
  fi

  echo "Attempt $RETRY_COUNT/$MAX_RETRIES - Database not ready, waiting 2s..."
  sleep 2
done

echo "=== Migrations complete ==="
echo "Starting Next.js application..."
exec node server.js
