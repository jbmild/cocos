# Tests Funcionales

## Inicio Rápido con Docker

1. **Iniciar la base de datos de test:**
   ```bash
   docker compose -f docker-compose.test.yml up -d
   ```

2. **Configurar variables de entorno (opcional):**
   
   Si tienes un archivo `.env` con las variables `DB_TEST_*`, se usarán automáticamente.
   Si no, puedes exportarlas manualmente o copiar desde `env.example`.

3. **Ejecutar los tests:**
   ```bash
   yarn test src/__tests__/functional/
   ```

## Detener la base de datos

```bash
docker compose -f docker-compose.test.yml down
```

## Notas

- Los tests usan una base de datos separada (`cocos_test`) que **NO afecta** la base de datos de desarrollo
- Los datos se limpian automáticamente entre tests
- Puerto: `5433` (diferente al de desarrollo en `5432`)
