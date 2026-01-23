# Sistema de Inventario PEPS

## 📋 Descripción

Sistema Web de Inventario PEPS (Primeras Entradas, Primeras Salidas / FIFO) desarrollado para gestión de servicios de bodegaje, diseñado para cumplir escrupulosamente con todos los requisitos regulatorios del contrato público.

### Características Principales

✅ **Cumplimiento Regulatorio Completo**
- ✓ Inventario mensual bajo demanda
- ✓ Reportes quincenales de movimientos
- ✓ Cortes de existencias mensuales y bajo demanda
- ✓ Control de vencimientos con alertas FEFO
- ✓ Descripciones SIGAF obligatorias
- ✓ Bitácora inmutable con verificación de integridad
- ✓ Firma digital en documentos

✅ **Lógica PEPS/FIFO Estricta**
- Toda salida consume primero el lote más antiguo
- Algoritmo de consumo en cascada
- Excepciones autorizadas con auditoría completa
- Anulaciones con motivo y traza

✅ **Trazabilidad y Auditoría**
- Bitácora inmutable con hashing encadenado
- Historial completo de cambios por entidad
- Verificación de integridad de datos
- Exportación para auditorías externas

✅ **Reportes y Documentación**
- Informes PDF con firma digital
- Exports CSV/Excel
- Acuse de recibo del fiscalizador
- Códigos de verificación

---

## 🛠️ Stack Tecnológico

### Frontend
- **Next.js 15** (App Router, React Server Components)
- **TypeScript** 5.9
- **Tailwind CSS** 4.x
- **React 19**
- **Lucide Icons**

### Backend
- **Node.js** 20+
- **Prisma ORM** 6.x
- **PostgreSQL** 14+

### Librerías Clave
- **date-fns** - Manejo de fechas
- **zod** - Validación de esquemas
- **pdfkit** - Generación de PDFs
- **qrcode** - Códigos QR para etiquetas
- **bcryptjs** - Hashing de contraseñas
- **jose** - Autenticación JWT

### Testing
- **Vitest** - Tests unitarios e integración
- **Playwright** - Tests E2E
- **Testing Library** - Tests de componentes

---

## 📦 Instalación

### Requisitos Previos

- Node.js 20.x o superior
- PostgreSQL 14.x o superior
- npm 10.x o superior

### Pasos de Instalación

1. **Clonar el repositorio**

```bash
git clone <repository-url>
cd Ragie_BOT
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

Copiar el archivo de ejemplo y ajustar las credenciales:

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/inventario_peps?schema=public"
JWT_SECRET="tu_secreto_jwt_seguro"
FISCALIZADOR_EMAIL="fiscalizador@bodegaje.example.com"
```

4. **Configurar la base de datos**

```bash
# Generar cliente de Prisma
npm run db:generate

# Ejecutar migraciones
npm run db:migrate

# (Opcional) Poblar con datos de prueba
npm run db:seed
```

5. **Iniciar el servidor de desarrollo**

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

---

## 🗄️ Modelo de Datos

### Entidades Principales

#### Usuario
- Roles: Administrador Contratista, Operador Bodega, Fiscalizador Externo, Auditor
- Autenticación con 2FA opcional
- Control de sesiones

#### Artículo
- SKU único
- **Descripción SIGAF obligatoria**
- Unidad de medida
- Stock mínimo/máximo (opcional)

#### Lote
- Vinculado a un artículo
- **Fecha de ingreso (timestamp exacto para PEPS)**
- **Fecha de vencimiento obligatoria**
- Cantidad inicial y disponible
- Información del proveedor

#### Movimiento
- Tipos: Entrada, Salida, Transferencia, Ajuste
- Vinculado a artículo y lote
- Usuario responsable
- Documentación y evidencia
- Hash del documento

#### Corte
- Tipos: Mensual Automático, Bajo Demanda, Compra según Demanda
- **Snapshot inmutable con hash**
- Detalles por lote
- Verificación de integridad

#### Bitácora
- **Hashing encadenado** (cada registro referencia al anterior)
- Append-only (inmutable)
- Usuario, acción, entidad afectada
- Diff JSON (antes/después)
- IP y User Agent

---

## 🚀 Uso del Sistema

### 1. Recepción de Mercancía

1. Ir a **Recepciones** > **Nueva Recepción**
2. Seleccionar artículo (con Descripción SIGAF)
3. Ingresar:
   - Cantidad
   - Fecha de vencimiento
   - Número de lote (opcional)
   - Proveedor
   - Documentos (factura, acta)
4. Confirmar recepción
5. Sistema crea lote automáticamente

### 2. Despacho PEPS

1. Ir a **Despachos** > **Nuevo Despacho**
2. Seleccionar artículo
3. Ingresar cantidad solicitada
4. **Sistema sugiere automáticamente lotes en orden PEPS**
5. Completar información del receptor
6. Confirmar despacho
7. Sistema genera documento de entrega

### 3. Cortes de Existencias

#### Corte Mensual
1. Ir a **Cortes** > **Nuevo Corte**
2. Seleccionar tipo "Mensual"
3. Confirmar
4. Sistema genera snapshot con hash

#### Corte Bajo Demanda
1. Ir a **Cortes** > **Nuevo Corte**
2. Ingresar motivo (obligatorio, mín. 10 caracteres)
3. Confirmar
4. Sistema genera snapshot con hash

#### Verificar Integridad de Corte
1. Ir a **Cortes** > Seleccionar corte
2. Clic en **Verificar Integridad**
3. Sistema calcula hash y compara con el almacenado

### 4. Informes

#### Informe Mensual de Inventario
- Se genera bajo demanda desde **Reportes** > **Mensual**
- Incluye:
  - Entradas y salidas del período
  - Saldo inicial y final por artículo/lote
  - Fechas de vencimiento
  - Unidades de medida
- Formatos: PDF (firmado digitalmente) + CSV
- Envío automático al fiscalizador con acuse de recibo

#### Reporte Quincenal de Movimientos
1. Ir a **Reportes** > **Quincenal de Movimientos**
2. Seleccionar período (primera o segunda quincena)
3. Filtros opcionales: artículo, unidad receptora, tipo de movimiento
4. Generar reporte
5. Descargar PDF y/o CSV

#### Reporte de Vencimientos
1. Ir a **Reportes** > **Vencimientos**
2. Seleccionar días de anticipación (default: 30)
3. Marcar si incluir ya vencidos
4. Generar reporte con severidad (Crítica, Alta, Media, Baja)

### 5. Catálogo SIGAF

#### Importación Masiva
1. Ir a **Artículos** > **Catálogo SIGAF**
2. Descargar plantilla CSV
3. Completar con:
   - SKU
   - Nombre
   - Descripción SIGAF (obligatoria)
   - Código SIGAF
   - Unidad de medida
4. Importar archivo CSV
5. Sistema valida y crea/actualiza artículos

#### Validación Manual
1. Ir a **Artículos** > Seleccionar artículo
2. Verificar que tenga Descripción SIGAF
3. Editar si es necesario
4. Sistema muestra alertas si algún artículo operativo carece de Descripción SIGAF

### 6. Ajustes de Inventario

1. Ir a **Ajustes** > **Nuevo Ajuste**
2. Seleccionar lote
3. Ingresar nuevo saldo
4. **Motivo obligatorio** (mín. 10 caracteres)
5. Confirmar ajuste
6. Sistema registra diferencia en bitácora

### 7. Auditoría y Trazabilidad

#### Ver Historial de Entidad
1. Ir a cualquier entidad (artículo, lote, movimiento)
2. Clic en **Ver Historial**
3. Sistema muestra todos los cambios con:
   - Usuario responsable
   - Fecha y hora exacta
   - Estado anterior y nuevo
   - IP y navegador

#### Verificar Integridad de Bitácora
1. Ir a **Auditoría** > **Verificar Integridad**
2. Seleccionar rango de fechas (opcional)
3. Sistema verifica cadena de hashes
4. Muestra resultado: ✓ Íntegra o ✗ Corrupta (con ubicación del error)

#### Exportar Bitácora
1. Ir a **Auditoría** > **Exportar**
2. Seleccionar filtros:
   - Rango de fechas
   - Entidad
   - Usuario
3. Descargar CSV con todos los eventos

---

## 🔐 Seguridad

### Autenticación
- Email + contraseña (hash bcrypt)
- 2FA con TOTP (opcional pero recomendado)
- JWT con expiración configurable
- Control de sesiones activas

### Autorización (RBAC)
- **Administrador Contratista**: Acceso completo
- **Operador Bodega**: Recepciones, despachos, transferencias, ajustes
- **Fiscalizador Externo**: Solo lectura (reportes, cortes, auditoría)
- **Auditor**: Acceso a bitácoras y verificaciones

### Row Level Security (RLS)
- Políticas a nivel de base de datos
- Usuarios solo ven datos autorizados
- Logs de acceso

### Bitácora Inmutable
- Hashing encadenado SHA-256
- Append-only (sin eliminaciones ni ediciones)
- Verificación de integridad en tiempo real
- Detección de manipulaciones

### Firma Digital de Documentos
- Hash SHA-256 del contenido
- Timestamp del servidor
- Código de verificación imprimible
- Acuse de recibo

---

## 🧪 Testing

### Tests Unitarios

```bash
npm run test
```

Incluye:
- Lógica PEPS/FIFO
- Validaciones de entrada
- Cálculos de consumo
- Generación de hashes
- Verificación de integridad

### Tests de Integración

```bash
npm run test -- --grep integration
```

Incluye:
- Flujo completo de recepción
- Flujo completo de despacho PEPS
- Generación de cortes
- Generación de informes

### Tests E2E (Playwright)

```bash
npm run test:e2e
```

Incluye:
- Recepción → Despacho → Reporte
- Generación automática de informe mensual
- Corte bajo demanda
- Verificación de integridad de bitácora

### Tests de Calendario

```bash
npm run test -- --grep calendario
```

Simula cambio de mes/quincena para verificar generación automática.

---

## 📚 Documentación Adicional

### Manuales

- **[Manual de Usuario](./docs/manual-usuario.md)** - Guía completa para operadores
- **[Manual Técnico](./docs/manual-tecnico.md)** - Arquitectura y desarrollo
- **[Manual de Administrador](./docs/manual-administrador.md)** - Configuración y mantenimiento

### Runbooks

- **[Restauración de Backup](./docs/runbooks/restauracion-backup.md)**
- **[Rotación de Claves](./docs/runbooks/rotacion-claves.md)**
- **[Verificación de Bitácora](./docs/runbooks/verificacion-bitacora.md)**
- **[Resolución de Problemas](./docs/runbooks/troubleshooting.md)**

### Portal de Ayuda

Accede desde el sistema: **Ayuda** > **Centro de Ayuda**

Incluye:
- Guías paso a paso
- Tutoriales con imágenes
- Preguntas frecuentes
- Checklist operativo mensual/quincenal
- Videos instructivos (scripts listos)

---

## 📊 Kit de Cumplimiento

Para verificar el cumplimiento regulatorio, el sistema incluye:

### Matriz de Trazabilidad

| Requisito | Feature | Prueba | Evidencia |
|-----------|---------|--------|-----------|
| Informe mensual (1-3 días) | `informes.service.ts` | `test/informes.test.ts` | PDF + CSV firmados |
| PEPS estricto | `peps.service.ts` | `test/peps.test.ts` | Logs de despacho |
| Descripción SIGAF | `schema.prisma` | `test/articulos.test.ts` | Validación obligatoria |
| Cortes mensuales | `cortes.service.ts` | `test/cortes.test.ts` | Snapshot con hash |
| Bitácora inmutable | `bitacora.service.ts` | `test/bitacora.test.ts` | Verificación de integridad |

### Checklist de Aceptación

- [x] Informe mensual dentro de 3 días (PDF + CSV; hash; acuse)
- [x] Reporte quincenal de movimientos
- [x] Cortes mensuales/bajo demanda con snapshot
- [x] PEPS en cada salida (con excepción auditada)
- [x] Descripciones SIGAF presentes y validadas
- [x] Bitácora inmutable verificable
- [x] Alertas de vencimiento (FEFO informativo)
- [x] Documentación quincenal de movimientos

---

## 🚢 Despliegue

### Entornos

- **Desarrollo**: `http://localhost:3000`
- **Staging**: Configurar según infraestructura
- **Producción**: Configurar según infraestructura

### Variables de Entorno de Producción

```env
NODE_ENV=production
DATABASE_URL="postgresql://..."
JWT_SECRET="<generar con openssl rand -hex 32>"
NEXTAUTH_SECRET="<generar con openssl rand -hex 32>"
NEXTAUTH_URL="https://inventario-peps.pani.go.cr"
FISCALIZADOR_EMAIL="fiscalizador@bodegaje.example.com"
SMTP_HOST="smtp.example.com"
SMTP_USER="notificaciones@bodegaje.example.com"
SMTP_PASSWORD="..."
```

### Checklist de Salida a Producción

- [ ] Base de datos PostgreSQL configurada
- [ ] Variables de entorno configuradas
- [ ] Migraciones ejecutadas
- [ ] Usuario administrador creado
- [ ] Datos maestros importados (artículos, unidades receptoras)
- [ ] Catálogo SIGAF importado
- [ ] Backups automáticos configurados
- [ ] Email configurado (SMTP)
- [ ] SSL/TLS habilitado
- [ ] Firewall configurado
- [ ] Monitoreo configurado
- [ ] Documentación entregada
- [ ] Capacitación realizada

### Comandos de Despliegue

```bash
# Build de producción
npm run build

# Iniciar en producción
npm start

# Ejecutar migraciones en producción
npm run db:migrate
```

---

## 🔄 Backups

### Estrategia de Backups

- **Backups diarios**: 00:00 hrs (retención 30 días)
- **Backups semanales**: Domingo 02:00 hrs (retención 3 meses)
- **Backups mensuales**: Día 1 04:00 hrs (retención 1 año)

### Comando Manual de Backup

```bash
pg_dump -U usuario -d inventario_peps -F c -b -v -f backup_$(date +%Y%m%d_%H%M%S).dump
```

### Restauración

Ver [Runbook de Restauración](./docs/runbooks/restauracion-backup.md)

---

## 🐛 Troubleshooting

### Generar informe mensual

Los informes se generan bajo demanda:
1. Ir a **Reportes** > **Mensual** > **Generar**

### Error en despacho PEPS

1. Verificar stock disponible del artículo
2. Revisar orden de lotes (fecha de ingreso)
3. Verificar que el lote no esté marcado como `agotado`

### Bitácora muestra error de integridad

1. **NO ENTRAR EN PÁNICO** - Puede ser un falso positivo
2. Ir a **Auditoría** > **Verificar Integridad**
3. Si confirma corrupción, **contactar al administrador**
4. Verificar backups
5. Investigar logs del servidor

### No se pueden importar artículos SIGAF

1. Verificar formato del CSV (debe ser UTF-8)
2. Validar que las columnas coincidan con la plantilla
3. Verificar que Descripción SIGAF no esté vacía
4. Revisar longitud de campos (límites en schema)

---

## 👥 Contribución

Este es un sistema para contrato público. Los cambios deben:

1. Mantener cumplimiento regulatorio
2. Incluir tests
3. Actualizar documentación
4. Pasar revisión de código
5. Ser aprobados por el responsable del contrato

---

## 📄 Licencia

Sistema de gestión de inventario PEPS para servicios de bodegaje.
Uso restringido según términos del contrato.

---

## 📞 Soporte

Para soporte técnico o consultas:

- **Email**: soporte-inventario@bodegaje.example.com
- **Tel**: +506 xxxx-xxxx
- **Horario**: Lunes a Viernes, 8:00 - 17:00 hrs

---

## 🎓 Capacitación

Se incluyen recursos de capacitación:

- **Videos tutoriales**: Scripts listos en `/docs/tutoriales/`
- **Guías impresas**: PDFs en `/docs/guias/`
- **Sesiones en vivo**: Coordinar con el equipo

---

## ✅ Checklist Operativo Mensual

Para imprimir y seguir:

### Primera Semana
- [ ] Día 1-3: Generar informe mensual
- [ ] Día 1-3: Enviar informe a fiscalizador
- [ ] Día 1: Generar corte mensual
- [ ] Revisar alertas de vencimiento

### Segunda Semana
- [ ] Día 15-16: Generar reporte quincenal (primera quincena)
- [ ] Día 16: Enviar reporte quincenal

### Tercera Semana
- [ ] Revisar stock mínimos
- [ ] Planificar compras según demanda

### Cuarta Semana
- [ ] Día 30-31: Generar reporte quincenal (segunda quincena)
- [ ] Preparar para corte e informe mensual siguiente

---

## 🔍 Verificación de Instalación

Ejecutar este checklist después de instalar:

```bash
# 1. Verificar dependencias
npm list

# 2. Verificar base de datos
npm run db:generate

# 3. Ejecutar tests
npm run test

# 4. Iniciar servidor
npm run dev

# 5. Acceder a http://localhost:3000
# 6. Verificar que el dashboard carga correctamente
```

---

## 📈 Métricas del Sistema

El sistema incluye métricas para monitoreo:

- Tiempo de respuesta de endpoints (p50, p95, p99)
- Número de movimientos por tipo
- Alertas generadas
- Cortes realizados
- Informes generados
- Usuarios activos

Accede desde: **Configuración** > **Métricas**

---

**Sistema de Inventario PEPS v1.0.0**
*Noviembre 2025 - Sistema de Bodegaje*
