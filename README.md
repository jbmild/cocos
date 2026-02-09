# Cocos Challenge Backend

API REST para el desafío Cocos. Permite gestionar instrumentos financieros, portfolios de usuarios y órdenes de compra/venta.

## Requisitos Previos

- Node.js (v18 o superior)
- PostgreSQL (v12 o superior)
- Yarn

## Configuración

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto basándote en `env.example`:

```bash
cp env.example .env
```

Edita `.env` con tus credenciales de base de datos (provistas por cocos):

```env
# Database Configuration (App)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=cocos
DB_SSL=false

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 2. Base de Datos

Crea la base de datos y carga el schema si no los tienes aun:

```bash
psql -U postgres -c "CREATE DATABASE cocos;"
psql -U postgres -d cocos -f database.sql
psql -U postgres -d cocos -f database-extended.sql
```

### 3. Instalación de Dependencias

```bash
yarn install
```

## Ejecución

### Modo Desarrollo

```bash
yarn dev
```

El servidor se ejecutará en `http://localhost:3000` (o el puerto configurado en `PORT`).

### Modo Producción

```bash
yarn build
yarn start
```

## Endpoints

- `GET /instruments/search` - Búsqueda de instrumentos
- `GET /portfolio/:userId` - Obtener portfolio de un usuario
- `POST /orders` - Crear una orden
- `PATCH /orders/:orderId/cancel` - Cancelar una orden

## Testing

Para información sobre tests funcionales, consulta [docs/README_TEST.md](./docs/README_TEST.md).

## Documentación de Diseño

Este proyecto incluye documentación sobre decisiones de diseño y arquitectura:

- [Diseño del Endpoint de Portfolio](./docs/PORTFOLIO_DESIGN.md) - Arquitectura y patrones de diseño utilizados en el endpoint de portfolio
- [Decisión de Implementación: Endpoint de Cancelación de Órdenes](./docs/CANCEL_ORDER_DECISION.md) - Justificación y diseño del endpoint de cancelación de órdenes

## Insomnia Collection

Recordar configurar la URL donde corre el proyecto en la variable `URL` en el `Base Environment`.
