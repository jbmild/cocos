# Decision de Implementacion: Endpoint de Cancelacion de Ordenes

## Contexto

Aunque el documento de requerimientos (`backend-challenge.md`) no solicita explicitamente la implementacion de un endpoint para cancelar ordenes, se decidio implementarlo basandose en los requerimientos funcionales que especifican el comportamiento esperado para las ordenes canceladas.

## Requerimientos que Justifican la Implementacion

En la seccion "Consideraciones funcionales" del documento de requerimientos se especifica:

- Las ordenes tienen distintos estados (status), incluyendo `CANCELLED`
- Se indica que "Solo se pueden cancelar las ordenes con estado `NEW`"
- El estado `CANCELLED` se menciona como uno de los estados posibles de una orden

## Decision de Diseño

Dado que:
1. El estado `CANCELLED` esta definido en los requerimientos
2. Se especifica la regla de negocio: "Solo se pueden cancelar las ordenes con estado `NEW`"
3. No tiene sentido tener un estado definido sin la capacidad de alcanzarlo

Se decidio implementar el endpoint `PATCH /orders/:orderId/cancel` que permite a los usuarios cancelar ordenes que esten en estado `NEW`.

## Implementacion

El endpoint implementado:
- Valida que la orden existe
- Valida que la orden esta en estado `NEW` (unica condicion para poder cancelar)
- Actualiza el estado de la orden a `CANCELLED`
- Utiliza transacciones y locks para garantizar consistencia de datos
- No requiere `userId` en el request (se obtiene de la orden misma)

Esta implementacion completa el ciclo de vida de las ordenes definido en los requerimientos y permite a los usuarios gestionar sus ordenes pendientes de manera completa.
