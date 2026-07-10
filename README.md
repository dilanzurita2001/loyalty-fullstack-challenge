# PointBox — Prueba Técnica Senior Fullstack

## Levantar el proyecto

```bash
docker compose up --build
```

Una vez levantado:

| Servicio  | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:4200        |
| Backend   | http://localhost:3000        |
| Health    | http://localhost:3000/health |

Las migraciones y el seed se ejecutan automáticamente al iniciar el backend.

---

## Correr las pruebas

```bash
docker compose exec backend npm test
```

Al comenzar, todos los tests están en **rojo**. El trabajo del candidato es hacerlos pasar.

---

## Variables de entorno

Copiar `.env.example` a `.env` si se requiere desarrollo local fuera de Docker.

```bash
cp backend/.env.example backend/.env
```

---

## Archivos donde se espera mayor trabajo

```
backend/src/claims/usecases/claim-reward.usecase.ts   ← lógica principal del canje
frontend/src/app/rewards/rewards-page.component.ts     ← flujo de canje en UI
backend/test/claim-reward.spec.ts                      ← tests que deben pasar
```

---

## Decisiones técnicas

> Esta sección debe ser completada por el candidato.
>
> Explicar brevemente cómo se resolvió cada decisión técnica pendiente:
>
> - **DTP-01** — Estrategia de persistencia de saldo
> - **DTP-02** — Estrategia de idempotencia
> - **DTP-03** — Manejo de concurrencia
> - **DTP-04** — Generación de código promocional
> - **DTP-05** — Manejo de errores

---

## Datos de prueba disponibles

### Clientes

| Slug      | Nombre      | Estado    | Puntos |
|-----------|-------------|-----------|--------|
| `cus_001` | Ana Torres  | `ACTIVE`  | 500    |
| `cus_002` | Luis Mora   | `ACTIVE`  | 50     |
| `cus_003` | Carla Ríos  | `BLOCKED` | 300    |

### Empresas

| Slug      | Nombre       | Estado     |
|-----------|--------------|------------|
| `mer_001` | Coffee House | `ACTIVE`   |
| `mer_002` | Fit Gym      | `ACTIVE`   |
| `mer_003` | Old Cinema   | `INACTIVE` |

### Recompensas

| Slug      | Nombre                  | Empresa      | Puntos | Stock | Estado    |
|-----------|-------------------------|--------------|--------|-------|-----------|
| `rew_001` | 20% Coffee Coupon       | Coffee House | 100    | 5     | `ACTIVE`  |
| `rew_002` | Gym Day Pass            | Fit Gym      | 200    | 1     | `ACTIVE`  |
| `rew_003` | Premium Coupon          | Coffee House | 700    | 3     | `ACTIVE`  |
| `rew_004` | Expired Cinema Ticket   | Old Cinema   | 100    | 5     | `ACTIVE`* |
| `rew_005` | Paused Reward           | Coffee House | 100    | 5     | `PAUSED`  |
| `rew_006` | No Stock Reward         | Coffee House | 100    | 0     | `ACTIVE`  |

> *`rew_004` tiene merchant `INACTIVE` — permite probar ese caso de error.

---

## Ver el enunciado completo

El enunciado completo de la prueba está en [CHALLENGE.md](./CHALLENGE.md).

# Decisiones técnicas tomadas

### DTP-01 — Persistencia de saldo

La decisión fue no almacenar el saldo como una columna en la base de datos, sino calcularlo siempre a partir de los movimientos registrados en WalletLedger. De esta forma, el ledger se convierte en la única fuente de verdad, garantizando que el saldo siempre sea consistente con el historial de transacciones.

Para lograrlo, cada movimiento se almacena con un valor firmado: los CREDIT se registran como valores positivos y los DEBIT como valores negativos. Así, obtener el saldo se reduce a una única consulta: Saldo = SUM(points).

El scaffold original realizaba dos consultas separadas (sumar créditos y sumar débitos para luego restarlos). Se cambió este enfoque porque una única suma es más simple, representa el estado del ledger en un solo momento, y sigue el patrón utilizado en sistemas contables, donde el saldo siempre se obtiene como la suma de todos los movimientos registrados.

### DTP-02 — Idempotencia

La estrategia se basó en dos capas de protección, pensando tanto en el caso normal como en el caso extremo.

La primera capa vive a nivel de aplicación: antes de procesar cualquier canje, se busca si ya existe un registro con ese mismo idempotencyKey. Si existe y pertenece al mismo cliente, se devuelve el resultado original tal cual, sin volver a descontar puntos ni stock. Esto cubre los casos más comunes: un doble clic, un reintento manual del usuario, o un reintento ante un problema de red.

La segunda capa es la que realmente garantiza la idempotencia ante una condición de carrera real: la columna idempotencyKey tiene una restricción UNIQUE en la base de datos. Si dos solicitudes con la misma key llegan exactamente al mismo tiempo y ambas pasan la primera verificación, solo una logra completar el INSERT; la otra recibe un error de violación de unicidad, que se captura para responder con el resultado del canje que sí se concretó, en vez de propagar un error interno.

Como medida adicional, si el idempotencyKey ya existe pero pertenece a un cliente distinto, la operación se rechaza como un conflicto, evitando que un cliente pueda reutilizar o ver el código promocional de otro.

### DTP-03 — Concurrencia

El mayor riesgo de este flujo es que dos solicitudes concurrentes terminen aprobando canjes que, sumados, dejen el saldo o el stock en negativo. Para evitarlo, las validaciones de negocio (cliente activo, empresa activa, recompensa activa, stock, saldo) se ejecutan primero sin bloquear nada — esto actúa como un filtro rápido para descartar solicitudes inválidas sin pagar el costo de abrir una transacción.

Solo cuando esas validaciones iniciales pasan se abre una transacción que toma un bloqueo (SELECT ... FOR UPDATE) sobre la fila del cliente y luego sobre la fila de la recompensa, siempre en ese orden. Ese orden fijo es importante: si todas las transacciones bloquean los recursos en la misma secuencia, nunca puede darse un interbloqueo entre dos solicitudes que compiten por los mismos recursos.

Una vez dentro de la transacción, con el bloqueo ya tomado, se vuelve a validar stock y saldo con datos frescos. Esta segunda validación es la que realmente previene la condición de carrera: si dos solicitudes llegan al mismo tiempo, la segunda queda esperando a que la primera termine (confirme o revierta) antes de poder leer el estado actualizado, por lo que nunca actúa sobre datos obsoletos.

### DTP-04 — Generación de código promocional

El objetivo era que el código fuera único, no secuencial ni predecible, y fácil de leer para un humano. Por eso se generan códigos aleatorios de 8 caracteres a partir de un alfabeto reducido que excluye caracteres que suelen confundirse visualmente (como 0/O o 1/I), pensando en que un cliente pueda transcribir el código sin errores.

La unicidad se refuerza en dos niveles: la columna promoCode tiene una restricción UNIQUE en la base de datos, y en el caso estadísticamente improbable de que se genere un código repetido, el sistema reintenta con un código nuevo antes de fallar.

### DTP-05 — Manejo de errores

El manejo de errores se dividió en dos responsabilidades separadas. Por un lado, cada error de negocio distingue un código estable (por ejemplo CUSTOMER_BLOCKED) del mensaje pensado para mostrarse al usuario, de modo que el código pueda usarse de forma confiable en el resto del sistema sin depender del texto exacto del mensaje.

Por otro lado, se agregó un filtro de excepciones global que centraliza cómo se transforma cualquier error en una respuesta HTTP: errores de negocio, errores de validación, recursos no encontrados, errores de base de datos o cualquier excepción no controlada terminan todos en una respuesta con la misma forma. Esto evita que cada controller tenga que manejar su propio try/catch, y asegura que un error de base de datos nunca exponga detalles internos al cliente — el detalle completo queda en los logs del servidor, pero el cliente solo recibe un mensaje genérico y seguro.

En el frontend, la misma idea se refleja en el interceptor HTTP: centraliza la traducción de esos errores a mensajes en español, para que los componentes no tengan que conocer la forma interna de una respuesta de error.