# CLAUDE.md - Guia para Claude Code

## Descripcion del Proyecto

Sistema de Inventario PEPS (Primero en Entrar, Primero en Salir) para gestion de bodega en contrato publico de Costa Rica. Aplicacion Next.js 16 con Supabase (PostgreSQL + Auth).

## Stack Tecnologico

- **Frontend**: Next.js 16, React 19, TailwindCSS
- **Backend**: Next.js API Routes (App Router)
- **Base de datos**: Supabase PostgreSQL
- **Autenticacion**: Supabase Auth
- **Deployment**: Vercel

## Comandos Utiles

```bash
# Desarrollo
npm run dev

# Testing
npm run test           # Vitest
npm run test:e2e       # Playwright

# Build
npm run build

# Type checking
npm run type-check
```

## Estructura del Proyecto

```
app/
├── api/              # API Routes
│   ├── auth/         # Login, logout, me (Supabase Auth)
│   ├── articulos/    # CRUD articulos
│   ├── recepciones/  # Entradas de inventario
│   ├── despachos/    # Salidas PEPS
│   ├── health/       # Health check
│   └── ...
├── admin/            # Paginas de administracion
├── login/            # Pagina de login
│   └── actions.ts    # Server Actions para auth
└── ...

lib/
└── supabase/         # Clientes Supabase
    ├── client.ts     # Cliente browser
    ├── server.ts     # Cliente server-side
    ├── admin.ts      # Cliente admin (service role)
    ├── auth.ts       # Utilidades de autenticacion
    └── database.types.ts  # Tipos TypeScript

supabase/
└── migrations/       # SQL migrations
    ├── 001_initial_schema.sql
    ├── 002_peps_functions.sql
    └── 003_rls_policies.sql
```

## Supabase Configuration

### Variables de Entorno Requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=https://tzsdxujlfcuksqcyrvay.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-dashboard>
```

### Proyecto Supabase

- **Project ID**: `tzsdxujlfcuksqcyrvay`
- **Region**: Default

### Aplicar Migraciones

Las migraciones SQL estan en `supabase/migrations/`. Para aplicarlas:

1. Ve al Dashboard de Supabase > SQL Editor
2. Ejecuta cada archivo en orden:
   - `001_initial_schema.sql` - Tablas base
   - `002_peps_functions.sql` - Funciones PEPS
   - `003_rls_policies.sql` - Politicas RLS

### Tablas Principales

| Tabla | Descripcion |
|-------|-------------|
| `articulos` | Catalogo de productos |
| `lotes` | Lotes con fecha de ingreso para PEPS |
| `movimientos` | Entradas, salidas, ajustes |
| `audit_log` | Bitacora inmutable |

## Logica de Negocio PEPS

### Despachos (Salidas)

Los despachos usan funcion PostgreSQL `dispatch_peps()`:
1. Se ordenan lotes por `fecha_ingreso` ASC
2. Se descuenta del lote mas antiguo primero
3. Si no alcanza, continua con el siguiente lote
4. Registra automaticamente en audit_log

### Recepciones (Entradas)

Las recepciones usan funcion PostgreSQL `receive_inventory()`:
1. Crea un nuevo lote con cantidad y fecha de vencimiento
2. Crea movimiento tipo ENTRADA
3. Registra en audit_log

## Usuarios y Autenticacion

Los usuarios se gestionan via Supabase Auth. El rol se almacena en `user_metadata`.

### Crear Usuario Admin (via API)

```bash
# Sin body = crea admin por defecto
curl -X POST https://tu-app.vercel.app/api/seed

# Con body = crea usuario personalizado (requiere x-admin-secret header)
curl -X POST https://tu-app.vercel.app/api/seed \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: TU_SECRET" \
  -d '{"email":"user@example.com","password":"Pass123!","nombre":"Usuario","rol":"OPERADOR"}'
```

### Credenciales por Defecto

```
admin@bodegaje.example.com / Admin2024Secure (ADMINISTRADOR)
```

### Roles Disponibles

- `ADMINISTRADOR` - Acceso completo
- `OPERADOR` - Operaciones de bodega
- `AUDITOR` - Solo lectura + auditoria

## Vercel Deployment

### Configuracion

El proyecto usa configuracion estandar de Vercel para Next.js.

1. Conectar repositorio a Vercel
2. Configurar variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### vercel.json

```json
{
  "framework": "nextjs"
}
```

## Notas para Desarrollo

- Ya no se usa Prisma - todo via Supabase client
- Auth se maneja con `@supabase/ssr` para SSR correcto
- Las funciones PEPS estan en PostgreSQL para garantizar atomicidad
- RLS esta habilitado - usar `supabaseAdmin` para bypass cuando necesario
- El middleware refresh automaticamente tokens expirados
