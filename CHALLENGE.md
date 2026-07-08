# Prueba Técnica Senior Fullstack — PointBox

## Historia de usuario

Como **cliente de una plataforma ficticia de loyalty**,
quiero **canjear mis puntos por un código promocional de una recompensa disponible**,
para **obtener un beneficio sin que el sistema permita saldos negativos, doble canje o inconsistencias de stock**.

---

## Contexto

PointBox es una aplicación ficticia donde los clientes acumulan puntos y pueden canjearlos por códigos promocionales ofrecidos por empresas participantes.

La prueba consiste en implementar un flujo acotado de canje de puntos. No se debe construir una plataforma completa. El objetivo es evaluar criterio técnico fullstack sobre una operación transaccional pequeña: validaciones de negocio, persistencia, idempotencia, consistencia de datos, API, frontend mínimo, pruebas y documentación.

Esta prueba usa un dominio ficticio y datos artificiales. No corresponde a una funcionalidad real ni será reutilizada como entregable productivo.

---

## Alcance funcional

### 1. Visualización de recompensas disponibles

El frontend debe mostrar una lista de recompensas disponibles para canje, incluyendo al menos:

- Nombre de la recompensa
- Empresa que la ofrece
- Costo en puntos
- Stock disponible
- Estado de disponibilidad

### 2. Visualización de cartera de puntos

El frontend debe mostrar el saldo actual de puntos del cliente seleccionado.

### 3. Canje de puntos por código promocional

El usuario debe poder seleccionar una recompensa y ejecutar el canje.

El sistema debe:

- Validar que el cliente esté activo
- Validar que la empresa esté activa
- Validar que la recompensa esté activa
- Validar que exista stock disponible
- Validar que el cliente tenga puntos suficientes
- Descontar los puntos correspondientes
- Reducir el stock de la recompensa
- Generar un código promocional único
- Registrar el canje
- Registrar el movimiento de puntos en la cartera
- Retornar el código generado al frontend

### 4. Manejo de reintentos e idempotencia

El endpoint de canje debe recibir un `idempotencyKey`.

Si el mismo cliente envía nuevamente el mismo `idempotencyKey`, el sistema debe devolver el mismo resultado del primer canje exitoso, sin descontar puntos nuevamente ni reducir stock nuevamente.

### 5. Manejo de errores funcionales

El frontend debe mostrar mensajes claros cuando:

- El cliente no tiene puntos suficientes
- La recompensa no está disponible
- La empresa está inactiva
- El cliente está bloqueado
- El stock ya no está disponible
- Ocurre un error técnico inesperado

### 6. Pruebas automatizadas

Se deben incluir pruebas automatizadas que validen las reglas críticas del flujo de canje.

---

## Fuera de alcance

No se debe implementar:

- Autenticación real
- Roles o permisos
- Administración de clientes, empresas o recompensas
- Pasarela de pagos
- Envío de correos
- Generación de QR
- Reportes o dashboard administrativo
- Despliegue cloud o CI/CD
- Integración con servicios externos
- Redis, colas o mensajería
- Microservicios, GraphQL o aplicación móvil

---

## Modelo funcional mínimo

### Customer

Representa al cliente que tiene una cartera de puntos.

| Estado    | Descripción         |
|-----------|---------------------|
| `ACTIVE`  | Cliente habilitado  |
| `BLOCKED` | Cliente bloqueado   |

### Merchant

Representa a la empresa que ofrece recompensas.

| Estado     | Descripción          |
|------------|----------------------|
| `ACTIVE`   | Empresa activa       |
| `INACTIVE` | Empresa inhabilitada |

### Reward

Representa la recompensa canjeable.

| Estado    | Descripción                     |
|-----------|---------------------------------|
| `ACTIVE`  | Disponible para canje           |
| `PAUSED`  | Temporalmente no disponible     |
| `EXPIRED` | Venció, no puede canjearse      |

### WalletLedger

Representa los movimientos de puntos del cliente.

| Tipo     | Descripción            |
|----------|------------------------|
| `CREDIT` | Entrada de puntos      |
| `DEBIT`  | Salida de puntos       |

### RewardClaim

Representa el canje ejecutado por el cliente.

| Estado      | Descripción         |
|-------------|---------------------|
| `ISSUED`    | Canje emitido       |
| `CANCELLED` | Canje cancelado     |

---

## API mínima esperada

### Listar recompensas

```
GET /rewards
```

Devuelve la lista de recompensas con su empresa, costo en puntos, stock y estado.

### Consultar cartera del cliente

```
GET /customers/{customerId}/wallet
```

Devuelve el saldo actual del cliente calculado desde el ledger.

### Consultar canjes del cliente

```
GET /customers/{customerId}/claims
```

Devuelve los códigos promocionales generados por el cliente.

### Ejecutar canje

```
POST /claims
```

Request esperado:

```json
{
  "customerId": "cus-uuid",
  "rewardId": "rew-uuid",
  "idempotencyKey": "unique-operation-key"
}
```

Response exitoso:

```json
{
  "claimId": "claim-uuid",
  "code": "PX9K2A",
  "pointsDebited": 100,
  "remainingBalance": 250,
  "status": "ISSUED"
}
```

Response por puntos insuficientes:

```json
{
  "error": "INSUFFICIENT_POINTS",
  "message": "The customer does not have enough points."
}
```

Response por recompensa no disponible:

```json
{
  "error": "REWARD_NOT_AVAILABLE",
  "message": "This reward is not available."
}
```

---

## Criterios de aceptación

### CA-01 — Canje exitoso
Dado que el cliente está activo, la empresa está activa, la recompensa está activa, existe stock disponible y el cliente tiene puntos suficientes,
cuando el cliente ejecuta el canje,
entonces el sistema debe generar un código promocional, descontar los puntos, reducir el stock, registrar el movimiento en la cartera y registrar el canje.

### CA-02 — Cliente bloqueado
Dado que el cliente se encuentra en estado `BLOCKED`,
cuando intenta canjear una recompensa,
entonces el sistema debe rechazar la operación y no debe descontar puntos ni reducir stock.

### CA-03 — Empresa inactiva
Dado que la empresa asociada a la recompensa está en estado `INACTIVE`,
cuando el cliente intenta canjear esa recompensa,
entonces el sistema debe rechazar la operación y no debe descontar puntos ni reducir stock.

### CA-04 — Recompensa no disponible
Dado que la recompensa está en estado `PAUSED` o `EXPIRED`,
cuando el cliente intenta canjearla,
entonces el sistema debe rechazar la operación y no debe generar código promocional.

### CA-05 — Puntos insuficientes
Dado que el cliente tiene un saldo menor al costo de la recompensa,
cuando intenta ejecutar el canje,
entonces el sistema debe rechazar la operación y mantener intacto el saldo del cliente.

### CA-06 — Stock insuficiente
Dado que la recompensa no tiene stock disponible,
cuando el cliente intenta ejecutar el canje,
entonces el sistema debe rechazar la operación y no debe descontar puntos.

### CA-07 — Idempotencia del canje
Dado que un cliente ejecutó exitosamente un canje con un `idempotencyKey`,
cuando el mismo cliente repite la solicitud con el mismo `idempotencyKey`,
entonces el sistema debe devolver el mismo canje previamente generado, sin descontar puntos nuevamente ni reducir stock nuevamente.

### CA-08 — Consistencia transaccional
Dado que ocurre un error durante el proceso de canje,
cuando no se puede completar la operación completa,
entonces el sistema no debe dejar datos parciales: no debe existir descuento de puntos sin canje, ni canje sin movimiento de cartera, ni reducción de stock sin canje emitido.

### CA-09 — Prevención de saldo negativo
Dado que existen dos solicitudes concurrentes de canje para el mismo cliente,
cuando ambas solicitudes intentan consumir puntos simultáneamente,
entonces el sistema no debe permitir que el saldo final del cliente quede negativo.

### CA-10 — Prevención de stock negativo
Dado que existen dos solicitudes concurrentes de canje sobre una recompensa con stock limitado,
cuando ambas solicitudes intentan consumir el último stock disponible,
entonces el sistema debe permitir como máximo un canje exitoso y el stock no debe quedar negativo.

### CA-11 — Actualización del frontend
Dado que el canje fue exitoso,
cuando el frontend recibe la respuesta del backend,
entonces debe mostrar el código promocional generado y actualizar el saldo visible del cliente.

### CA-12 — Manejo de doble clic en frontend
Dado que el usuario presiona el botón de canje,
cuando la solicitud está en proceso,
entonces el frontend debe evitar envíos duplicados desde la interfaz y mostrar un estado de carga.

---

## Decisiones técnicas pendientes

El candidato debe decidir e implementar:

- **DTP-01**: Estrategia de persistencia de saldo — cómo calcular o persistir el saldo de puntos del cliente, garantizando consistencia con los movimientos registrados en `WalletLedger`.
- **DTP-02**: Estrategia de idempotencia — cómo almacenar y validar el `idempotencyKey` para evitar doble canje ante reintentos, doble clic o problemas de red.
- **DTP-03**: Manejo de concurrencia — cómo evitar saldo negativo y stock negativo ante solicitudes concurrentes.
- **DTP-04**: Generación de código promocional — cómo generar códigos únicos, no secuenciales y suficientemente seguros.
- **DTP-05**: Manejo de errores — cómo separar errores funcionales de errores técnicos, manteniendo respuestas claras para el frontend.

---

## Notas para el desarrollo

- El backend debe proteger las reglas de negocio. No basta con validarlas en el frontend.
- El canje debe ejecutarse de forma transaccional.
- El movimiento de puntos debe quedar registrado en la tabla ledger.
- No se deben borrar registros transaccionales para corregir errores.
- La solución debe priorizar claridad, consistencia y mantenibilidad sobre cantidad de funcionalidades.
- No se evaluará diseño visual avanzado.
- Se valorará que el código esté organizado por responsabilidades y que la lógica crítica no esté concentrada en controllers o componentes visuales.
- Se valorará que las pruebas cubran reglas de negocio, idempotencia y casos de error.

---

## Pruebas esperadas

El proyecto debe incluir pruebas automatizadas para:

1. Canje exitoso
2. Cliente bloqueado
3. Empresa inactiva
4. Recompensa pausada
5. Recompensa expirada
6. Puntos insuficientes
7. Stock insuficiente
8. Descuento correcto de puntos y registro en wallet ledger
9. Reducción correcta de stock
10. Idempotencia por `idempotencyKey`
11. Prevención de saldo negativo ante concurrencia
12. Prevención de stock negativo ante concurrencia

---

## Criterios de calidad esperados

### Proceso y comunicación

- **Conventional Commits**: se espera el uso de [Conventional Commits](https://www.conventionalcommits.org/). Cada commit debe reflejar una unidad de trabajo coherente con un tipo claro (`feat`, `fix`, `refactor`, `test`, `chore`, etc.).
- **Granularidad de commits**: el historial debe contar la historia de la implementación, no un único commit con todo el trabajo.
- **Decisiones técnicas documentadas**: el candidato debe incluir en el README una sección breve que explique cómo resolvió DTP-01 a DTP-05. No se espera un documento extenso, sino razonamiento claro sobre las decisiones tomadas.

### Calidad de código

- **Organización**: la lógica crítica no debe concentrarse en controllers ni en componentes visuales.
- **Sin código muerto**: no deben quedar `console.log`, variables sin uso, ni bloques comentados.
- **Global exception filter**: el backend debe incluir un filtro de excepciones global (`@Catch()`) que normalice todas las respuestas de error, incluyendo errores de validación, errores de base de datos y errores no controlados. El manejo de errores no debe depender de bloques `try/catch` en cada controller.

### Producción

- **`GET /health` con verificación real**: el endpoint de health debe comprobar conectividad con la base de datos, no solo retornar `{status: 'ok'}`.
- **Fail-fast al arranque**: si una variable de entorno crítica como `DATABASE_URL` no está definida, la aplicación debe fallar inmediatamente al iniciar con un mensaje claro, en lugar de fallar más tarde con un error críptico.
- **Swagger/OpenAPI**: el backend debe exponer documentación interactiva en `/api-docs` usando `@nestjs/swagger`. No se requiere documentar todos los endpoints en detalle, pero la colección debe estar disponible y funcional.

### Frontend

- **`HttpInterceptor` para errores**: implementar un interceptor de Angular que capture los errores HTTP de forma centralizada y los transforme antes de que lleguen a los componentes. Los componentes no deben manejar errores HTTP directamente.
- **`takeUntilDestroyed()`**: las subscriptions a observables deben gestionarse con `takeUntilDestroyed()` para evitar memory leaks cuando los componentes se destruyen.

### Bonus — Observabilidad

Se valorará que el candidato instrumente el flujo de canje con OpenTelemetry:

- Backend: instalar `@opentelemetry/sdk-node` y configurar un `ConsoleSpanExporter`. El span del canje debe ser visible en los logs del contenedor al ejecutar `docker compose logs backend`.
- Frontend: propagar el header `traceparent` (W3C Trace Context) en el request `POST /claims`, de modo que el backend reciba y continúe el trace.

No se requiere collector, Jaeger ni ningún servicio externo. Basta con que la traza sea visible en los logs de consola.

### Bonus — Resiliencia del cliente

Se valorará que el candidato implemente un `HttpInterceptor` de Angular con lógica de reintento automático con backoff exponencial para errores de red o respuestas `5xx`. El interceptor no debe reintentar errores `4xx`.

---

## Entregable esperado

El candidato debe entregar un archivo `.zip` con el código fuente completo.

El proyecto debe poder ejecutarse con:

```bash
docker compose up --build
```

Después de ejecutar el comando, deben quedar disponibles:

- Frontend web funcional en `http://localhost:4200`
- Backend API funcional en `http://localhost:3000`
- Base de datos inicializada con migraciones y datos semilla aplicados

No debe ser necesario instalar dependencias localmente fuera de Docker.

---

## Restricción de recepción

Si el proyecto no puede levantarse mediante `docker compose up --build`, la evaluación funcional quedará limitada, aunque el código esté presente.
