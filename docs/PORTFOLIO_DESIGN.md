# Diseño del Endpoint de Portfolio

## Arquitectura

El endpoint `/portfolio/:userId` utiliza una arquitectura en capas: Controller → Service → Order Processors → Repositories.

## Patrones de Diseño

### Strategy Pattern
Cada tipo de orden (BUY, SELL, CASH_IN, CASH_OUT) tiene su propio procesador que encapsula la lógica específica:
- `BuyOrderProcessor`: Procesa compras de activos
- `SellOrderProcessor`: Procesa ventas de activos
- `CashInOrderProcessor`: Procesa transferencias entrantes
- `CashOutOrderProcessor`: Procesa transferencias salientes

**Beneficio**: Permite agregar nuevos tipos de orden sin modificar código existente (Open/Closed Principle).

### Factory Pattern
`OrderProcessorFactory` crea el procesador apropiado según el tipo de orden, encapsulando la lógica de creación.

### Encapsulación de Estado
Cada procesador guarda la orden en su constructor, evitando pasar la orden en cada llamada a método. Esto simplifica la API y mejora la encapsulación.

## Decisiones de Diseño

1. **Validación Interna**: Cada procesador valida internamente si debe procesarse, retornando el estado sin cambios si no aplica.
2. **Procesamiento Funcional**: Uso de `reduce`, `map` y `filter` para código más declarativo e inmutable.
3. **Separación de Responsabilidades**: Filtrado de posiciones separado del cálculo de valores de mercado.
4. **Paralelización**: Consultas a `marketdata` ejecutadas en paralelo con `Promise.all()` para mejor performance.

## Cálculo de Portfolio

- **Cash Disponible**: Suma todas las órdenes FILLED. CASH_IN suma, CASH_OUT resta, BUY resta (size * price), SELL suma (size * price).
- **Posiciones**: Agrupa órdenes por instrumento, calcula cantidad neta y costo promedio. Excluye cash (ARS/MONEDA).
- **Valores de Mercado**: Obtiene último precio de `marketdata.close`, calcula `marketValue = quantity * currentPrice` y `totalReturn = ((currentPrice - avgCost) / avgCost) * 100`.
- **Valor Total**: Suma de `availableCash + sum(marketValue de todas las posiciones)`.

## Extensibilidad

Para agregar un nuevo tipo de orden:
1. Crear nuevo procesador implementando `OrderProcessor`
2. Agregar caso en `OrderProcessorFactory.create()`
3. Sin modificar código existente

## Validaciones y Estados Inconsistentes

El sistema valida la consistencia del portfolio y lanza errores HTTP 400 en los siguientes escenarios:

1. **Cash Negativo**: Si el saldo de cash disponible resulta negativo tras procesar todas las ordenes FILLED, se detecta como estado inconsistente. El enunciado no contempla venta al descubierto ni margen para operar, por lo que un cash negativo indica un error en los datos.

2. **Posiciones Negativas**: Si alguna posicion tiene cantidad negativa (por ejemplo, se vendieron mas acciones de las que se compraron), se detecta como estado inconsistente. Nuevamente, el enunciado no contempla venta al descubierto, por lo que posiciones negativas indican un error en los datos.

En ambos casos, el sistema retorna un error especifico indicando que el portfolio esta en un estado inconsistente segun las normas de la plataforma y que se debe contactar con atencion al cliente para regularizar la situacion.
