#!/bin/bash
set -e

echo "Creating development database..."

# Crear base de datos de desarrollo
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE cocos;
    GRANT ALL PRIVILEGES ON DATABASE cocos TO $POSTGRES_USER;
EOSQL

echo "Development database created successfully!"

# Ejecutar el schema en la base de datos de desarrollo
echo "Initializing development database schema..."

# Ejecutar database.sql (estructura y datos iniciales)
if [ -f /scripts/database.sql ]; then
    echo "Running database.sql..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "cocos" -f /scripts/database.sql
    echo "database.sql executed successfully!"
else
    echo "Warning: database.sql not found at /scripts/database.sql, skipping"
fi

# Ejecutar database-extended.sql (datos adicionales y extensiones)
if [ -f /scripts/database-extended.sql ]; then
    echo "Running database-extended.sql..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "cocos" -f /scripts/database-extended.sql
    echo "database-extended.sql executed successfully!"
else
    echo "Warning: database-extended.sql not found at /scripts/database-extended.sql, skipping"
fi

# Ejecutar database-portfolio-snapshots.sql (tabla de snapshots)
if [ -f /scripts/database-portfolio-snapshots.sql ]; then
    echo "Running database-portfolio-snapshots.sql..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "cocos" -f /scripts/database-portfolio-snapshots.sql
    echo "database-portfolio-snapshots.sql executed successfully!"
else
    echo "Warning: database-portfolio-snapshots.sql not found at /scripts/database-portfolio-snapshots.sql, skipping"
fi

echo "Development database initialized successfully!"
