#!/bin/sh
echo "Running database migrations..."
node dist/migrate.cjs
echo "Starting application..."
exec node dist/index.cjs
