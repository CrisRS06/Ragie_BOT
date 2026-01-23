# CLAUDE.md - Guía para Claude Code

## Descripción del Proyecto

Sistema de Inventario PEPS (Primero en Entrar, Primero en Salir) para gestión de bodega en contrato público de Costa Rica. Aplicación Next.js 16 con Prisma ORM y PostgreSQL.

## Stack Tecnológico

- **Frontend**: Next.js 16, React 19, TailwindCSS
- **Backend**: Next.js API Routes (App Router)
- **Base de datos**: PostgreSQL con Prisma ORM
- **Autenticación**: JWT con jose
- **Deployment**: Railway (Dockerfile)

## Comandos Útiles

```bash
# Desarrollo
npm run dev

# Base de datos
npm run db:generate    # Generar Prisma Client
npm run db:push        # Push schema (dev)
npm run db:migrate     # Crear migración
npm run db:studio      # Prisma Studio
npm run db:seed        # Poblar datos de prueba

# Testing
npm run test           # Vitest
npm run test:e2e       # Playwright

# Build
npm run build
```

## Estructura del Proyecto

```
app/
├── api/              # API Routes
│   ├── auth/         # Login, logout, me
│   ├── articulos/    # CRUD artículos
│   ├── recepciones/  # Entradas de inventario
│   ├── despachos/    # Salidas PEPS
│   ├── health/       # Health check (verifica BD)
│   └── ...
├── admin/            # Páginas de administración
├── login/            # Página de login
└── ...

lib/
├── prisma.ts         # Cliente Prisma singleton
├── auth.ts           # Utilidades de autenticación
└── services/         # Lógica de negocio

prisma/
├── schema.prisma     # Schema de la BD
├── migrations/       # Migraciones SQL
└── seed.ts           # Datos de prueba

scripts/
└── start.sh          # Script de inicio para Railway
```

## Railway Deployment

### Configuración Crítica

El proyecto usa Dockerfile para deployment en Railway. **Información importante:**

1. **Private networking NO está disponible durante build/preDeployCommand**
   - `postgres.railway.internal` solo resuelve en RUNTIME
   - Las migraciones deben ejecutarse al inicio del contenedor, NO en preDeployCommand

2. **Solución implementada**: `scripts/start.sh` con retry loop
   ```bash
   until node node_modules/prisma/build/index.js migrate deploy; do
     sleep 2
   done
   exec node server.js
   ```

3. **Health check** en `/api/health` verifica conexión a BD antes de reportar healthy

### Variables de Entorno Requeridas

```
DATABASE_URL=postgresql://...@postgres.railway.internal:5432/railway
JWT_SECRET=<secreto-seguro>
NEXTAUTH_SECRET=<secreto-seguro>
NEXTAUTH_URL=https://tu-app.up.railway.app
```

### Archivos de Configuración

- `railway.toml` - Configuración de Railway
- `Dockerfile` - Build multi-stage optimizado para Next.js standalone

### Troubleshooting Railway

| Problema | Causa | Solución |
|----------|-------|----------|
| `Can't reach postgres.railway.internal` en preDeployCommand | Private network no disponible | Usar retry loop en startCommand |
| `Can't reach postgres.railway.internal` en startup | Red aún no lista | El retry loop espera automáticamente |
| Health check falla | BD no conectada | Verificar que Postgres esté corriendo |

## Lógica de Negocio PEPS

### Despachos (Salidas)

Los despachos usan método PEPS estricto:
1. Se ordenan lotes por `fechaIngresoTs` ASC
2. Se descuenta del lote más antiguo primero
3. Si no alcanza, continúa con el siguiente lote
4. Cada movimiento registra el `costoUnitarioPEPS` del lote

### Recepciones (Entradas)

Las recepciones crean:
1. Un `DocumentoRecepcion` (encabezado)
2. Múltiples `DetalleRecepcion` (líneas)
3. Un `Lote` por cada línea
4. Un `Movimiento` tipo ENTRADA por cada lote

## Usuarios por Defecto (Seed)

```
admin@sistema.local / Admin123!  (ADMINISTRADOR_CONTRATISTA)
operador@sistema.local / Operador123!  (OPERADOR_BODEGA)
fiscal@sistema.local / Fiscal123!  (FISCALIZADOR_EXTERNO)
auditor@sistema.local / Auditor123!  (AUDITOR)
```

## Notas para Desarrollo

- El proyecto usa `output: "standalone"` en Next.js para optimizar Docker
- Prisma está en devDependencies pero se copia completo en el Dockerfile
- Las migraciones se generan con `npx prisma migrate dev --name <nombre>`
- Nunca usar `prisma db push` en producción, solo `prisma migrate deploy`
