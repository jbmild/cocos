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

# Feature Flags
ENABLE_PORTFOLIO_SNAPSHOT=false
```

### 2. Base de Datos

Tienes dos opciones para configurar la base de datos:

#### Opción A: Usando Docker (Recomendado)

Levanta la base de datos de desarrollo usando Docker Compose:

```bash
docker compose up -d
```

Esto creará un contenedor PostgreSQL con:
- **Base de datos**: `cocos`
- **Usuario**: `cocos_user`
- **Contraseña**: `cocos_password`
- **Puerto**: `5432`

El contenedor ejecutará automáticamente los scripts SQL necesarios (`database.sql`, `database-extended.sql`, `database-portfolio-snapshots.sql`) para inicializar el schema.

Para detener la base de datos:

```bash
docker compose down
```

Para detener y eliminar los datos (volumen):

```bash
docker compose down -v
```

**Importante**: Asegúrate de configurar tu archivo `.env` con estas credenciales:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=cocos_user
DB_PASSWORD=cocos_password
DB_NAME=cocos
DB_SSL=false
```

#### Opción B: Instalación Manual

Si prefieres usar una instalación local o remota de PostgreSQL, crea la base de datos y carga el schema manualmente:

```bash
psql -U postgres -c "CREATE DATABASE cocos;"
psql -U postgres -d cocos -f database.sql
psql -U postgres -d cocos -f database-extended.sql
psql -U postgres -d cocos -f database-portfolio-snapshots.sql
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
  - **Nota**: Cada posición en el portfolio incluye el campo `dailyReturn` (rendimiento diario), calculado utilizando las columnas `close` y `previousClose` de la tabla `marketdata`, según se especifica en los requerimientos del desafío.
- `POST /orders` - Crear una orden
- `PATCH /orders/:orderId/cancel` - Cancelar una orden

## Testing

Para información sobre tests funcionales, consulta [docs/README_TEST.md](./docs/README_TEST.md).

## Documentación de Diseño

Este proyecto incluye documentación sobre decisiones de diseño y arquitectura:

- [Diseño del Endpoint de Portfolio](./docs/PORTFOLIO_DESIGN.md) - Arquitectura y patrones de diseño utilizados en el endpoint de portfolio
- [Decisión de Implementación: Endpoint de Cancelación de Órdenes](./docs/CANCEL_ORDER_DECISION.md) - Justificación y diseño del endpoint de cancelación de órdenes
- [Optimización de Portfolio con Snapshots Diarios](./docs/PORTFOLIO_SNAPSHOT_OPTIMIZATION.md) - Explicación de la optimización con snapshots y su importancia para el rendimiento

## Mejoras y Oportunidades Futuras

Las siguientes mejoras podrían implementarse para extender la funcionalidad de la plataforma:

1. **Implementación de autenticación de usuarios**: Agregar un sistema de autenticación (JWT, OAuth, etc.) para proteger los endpoints y asegurar que los usuarios solo accedan a sus propios datos.

2. **Simulación de mercado**: Implementar un motor de simulación de mercado que procese las órdenes LIMIT automáticamente cuando se cumplan las condiciones de precio, permitiendo una experiencia más realista de trading.

3. **Soporte multi-moneda**: Extender la plataforma para soportar múltiples monedas además del peso argentino (ARS), como dólares (USD), euros (EUR), yuanes (CNY), etc. Esto requeriría:
   - Actualizar el modelo de datos para incluir información de moneda
   - Modificar la lógica de cálculo de portfolios para manejar conversiones
   - Agregar soporte para órdenes en diferentes monedas

4. **Proceso separado para cálculo de snapshots**: Crear un proceso separado (cron job o scheduled task) que calcule los snapshots diariamente en segundo plano, en lugar de hacerlo durante las requests. Esto mejoraría significativamente el tiempo de respuesta ya que el snapshot ya estaría calculado cuando se necesite. Es importante considerar que solo se deben generar snapshots para usuarios que tuvieron operaciones, ya que no tiene sentido crear un snapshot nuevo si no hay cambios desde el snapshot anterior.

## Insomnia Collection

Recordar configurar la URL donde corre el proyecto en la variable `URL` en el `Base Environment`.
