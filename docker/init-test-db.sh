#!/bin/bash
set -e

echo "Creating test database..."

# Crear base de datos de test
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE cocos_test;
    GRANT ALL PRIVILEGES ON DATABASE cocos_test TO $POSTGRES_USER;
EOSQL

echo "Test database created successfully!"

# Ejecutar el schema en la base de datos de test
echo "Initializing test database schema..."

# Ejecutar database.sql (estructura y datos iniciales)
if [ -f /scripts/database.sql ]; then
    echo "Running database.sql..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "cocos_test" -f /scripts/database.sql
    echo "database.sql executed successfully!"
else
    echo "Warning: database.sql not found at /scripts/database.sql, skipping"
fi

# Ejecutar database-extended.sql (datos adicionales y extensiones)
if [ -f /scripts/database-extended.sql ]; then
    echo "Running database-extended.sql..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "cocos_test" -f /scripts/database-extended.sql
    echo "database-extended.sql executed successfully!"
else
    echo "Warning: database-extended.sql not found at /scripts/database-extended.sql, skipping"
fi

# Ejecutar database-portfolio-snapshots.sql (tabla de snapshots)
if [ -f /scripts/database-portfolio-snapshots.sql ]; then
    echo "Running database-portfolio-snapshots.sql..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "cocos_test" -f /scripts/database-portfolio-snapshots.sql
    echo "database-portfolio-snapshots.sql executed successfully!"
else
    echo "Warning: database-portfolio-snapshots.sql not found at /scripts/database-portfolio-snapshots.sql, skipping"
fi

echo "Test database initialized successfully!"
