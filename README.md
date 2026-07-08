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
