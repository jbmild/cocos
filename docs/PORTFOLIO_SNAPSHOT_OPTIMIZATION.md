# Optimización de Portfolio con Snapshots Diarios

## Problema

El cálculo del portfolio requiere procesar todas las órdenes `FILLED` históricas del usuario. Para usuarios con muchas órdenes, esto consume muchos recursos:
- Múltiples consultas a la base de datos
- Procesamiento de cientos o miles de órdenes
- Tiempo de respuesta lento (varios segundos)

## Solución: Snapshots Diarios

En lugar de recalcular desde cero cada vez, el sistema:
1. **Usa el snapshot del día anterior** como punto de partida
2. **Aplica solo las órdenes del día actual** para obtener el estado actual
3. **Guarda un nuevo snapshot** al final del día para el siguiente cálculo

### Ejemplo de Mejora

- **Sin snapshot**: Usuario con 10,000 órdenes → cada consulta procesa las 10,000 órdenes (~2-3 segundos)
- **Con snapshot**: Primera consulta del día procesa las 10,000 órdenes y guarda snapshot. Consultas siguientes procesan solo las órdenes del día actual (~50-100ms)

## Funcionamiento

El snapshot se genera **automáticamente** cada vez que se llama a `getPortfolio()`, lo cual ocurre en dos escenarios:

1. **Consulta directa del portfolio**: Endpoint `GET /portfolio/:userId`
2. **Creación de una orden**: Endpoint `POST /orders` (necesita el portfolio para validar fondos y posiciones)

El proceso es:

1. Obtener último snapshot disponible (día anterior o anterior)
2. Calcular estado hasta el día anterior (usando snapshot si existe, o desde todas las órdenes históricas)
3. Aplicar órdenes del día actual
4. Calcular posiciones y valor total
5. **Guardar snapshot del día anterior** (solo si no existe ya y si todo el cálculo se completó exitosamente)

**Importante**: 
- El snapshot se crea **automáticamente** durante cualquier llamada a `getPortfolio()`, no requiere un proceso separado
- Si ocurre un error durante el cálculo, el snapshot **NO se guarda**, garantizando que solo se guarden snapshots válidos y completos

## Feature Flag

Controlado por `ENABLE_PORTFOLIO_SNAPSHOT` en `.env`:

```env
ENABLE_PORTFOLIO_SNAPSHOT=true  # Habilita la optimización con snapshots (V2)
ENABLE_PORTFOLIO_SNAPSHOT=false # Usa el cálculo tradicional (V1)
```

## Beneficios

- **Rendimiento**: Reducción significativa del tiempo de respuesta (de segundos a milisegundos)
- **Escalabilidad**: El sistema puede manejar más usuarios simultáneos
- **Costo**: Menor carga en la base de datos y en el servidor
- **Experiencia de usuario**: Respuestas más rápidas
