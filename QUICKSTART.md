# 🚀 Guía de Inicio Rápido - Sistema de Inventario PEPS

Esta guía te permitirá tener el sistema corriendo en **menos de 10 minutos**.

---

## ⚡ Opción 1: Docker Compose (Recomendado)

### Requisitos
- Docker instalado
- 5 minutos de tiempo

### Pasos

```bash
# 1. Clonar el repositorio
git clone <repository-url>
cd inventario-peps

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Iniciar servicios
docker-compose up -d

# 4. Esperar a que la base de datos esté lista (30 segundos)
docker-compose logs -f db

# 5. Ejecutar migraciones
docker-compose exec app npx prisma migrate deploy

# 6. Cargar datos de prueba
docker-compose exec app npm run db:seed

# 7. Abrir en el navegador
open http://localhost:3000
```

**Credenciales por defecto:**
- Email: `admin@pani.go.cr`
- Password: `Password123!`

---

## 💻 Opción 2: Desarrollo Local

### Requisitos
- Node.js 20+
- PostgreSQL 14+
- 10 minutos de tiempo

### Pasos

```bash
# 1. Clonar repositorio
git clone <repository-url>
cd inventario-peps

# 2. Instalar dependencias
npm install

# 3. Configurar base de datos PostgreSQL
# Crear base de datos:
psql -U postgres
CREATE DATABASE inventario_peps;
CREATE USER inventario_user WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE inventario_peps TO inventario_user;
\q

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL

# 5. Generar cliente de Prisma
npm run db:generate

# 6. Ejecutar migraciones
npm run db:migrate

# 7. Cargar datos de prueba
npm run db:seed

# 8. Iniciar servidor de desarrollo
npm run dev

# 9. Abrir en el navegador
open http://localhost:3000
```

**Credenciales por defecto:**
- Email: `admin@pani.go.cr`
- Password: `Password123!`

---

## ✅ Verificación de Instalación

Una vez iniciado el sistema, verifica:

1. **Dashboard carga correctamente**
   - Abrir `http://localhost:3000`
   - Ver métricas y widgets

2. **Datos de prueba cargados**
   - 4 usuarios
   - 10 artículos
   - 12 lotes
   - 4 unidades receptoras

3. **Servicios funcionando**
   ```bash
   # Docker
   docker-compose ps

   # Local
   curl http://localhost:3000/api/health
   ```

---

## 🎯 Primeros Pasos

### 1. Explorar el Dashboard

Inicia sesión y navega por las secciones principales:
- Dashboard
- Artículos
- Recepciones
- Despachos
- Reportes
- Cortes

### 2. Registrar una Recepción

1. Ir a **Recepciones** > **Nueva Recepción**
2. Seleccionar artículo: "Arroz Blanco"
3. Cantidad: 50 kg
4. Fecha de vencimiento: 6 meses adelante
5. Proveedor: "Test S.A."
6. Confirmar

### 3. Realizar un Despacho PEPS

1. Ir a **Despachos** > **Nuevo Despacho**
2. Seleccionar artículo: "Arroz Blanco"
3. Cantidad: 20 kg
4. **Sistema sugiere automáticamente el lote más antiguo (PEPS)**
5. Completar receptor
6. Confirmar despacho

### 4. Generar un Corte

1. Ir a **Cortes** > **Nuevo Corte**
2. Tipo: "Bajo Demanda"
3. Motivo: "Corte de prueba para verificar funcionamiento"
4. Generar
5. Ver snapshot con hash inmutable

### 5. Verificar Bitácora

1. Ir a **Auditoría** > **Bitácora**
2. Ver todos los eventos registrados
3. Clic en **Verificar Integridad**
4. Sistema verifica cadena de hashes

---

## 🔧 Comandos Útiles

```bash
# Ver logs
docker-compose logs -f app        # Docker
npm run dev                        # Local

# Acceder a base de datos
docker-compose exec db psql -U inventario_user inventario_peps
# o
npm run db:studio

# Regenerar datos de prueba
docker-compose exec app npm run db:seed
# o
npm run db:seed

# Ejecutar tests
npm run test

# Build de producción
npm run build
npm start
```

---

## 📚 Próximos Pasos

Una vez que el sistema esté corriendo:

1. **Leer documentación completa**: `README.md`
2. **Revisar cumplimiento regulatorio**: `COMPLIANCE.md`
3. **Configurar para producción**: `DEPLOYMENT.md`
4. **Explorar los manuales**: `/docs/`

---

## 🆘 Problemas Comunes

### Error: "Cannot connect to database"

```bash
# Docker: Verificar que PostgreSQL esté corriendo
docker-compose ps db

# Local: Verificar servicio de PostgreSQL
sudo systemctl status postgresql
```

### Error: "Port 3000 already in use"

```bash
# Cambiar puerto en .env
PORT=3001

# O matar proceso en puerto 3000
lsof -ti:3000 | xargs kill -9
```

### Error: "Prisma Client not generated"

```bash
npm run db:generate
```

### Datos de prueba no aparecen

```bash
# Limpiar y volver a cargar
npm run db:seed
```

---

## 📞 Soporte

¿Necesitas ayuda?

- **Documentación**: Ver `README.md`
- **Issues**: GitHub Issues
- **Email**: soporte@pani.go.cr

---

## 🎉 ¡Listo!

El Sistema de Inventario PEPS está corriendo y listo para usar.

**Próximos pasos recomendados:**

1. ✅ Explorar todas las funcionalidades
2. ✅ Probar flujo completo: Recepción → Despacho PEPS → Reporte
3. ✅ Verificar cumplimiento regulatorio
4. ✅ Configurar para tu entorno específico
5. ✅ Importar catálogo SIGAF real
6. ✅ Crear usuarios reales
7. ✅ Configurar backups automáticos

**¡Disfruta del sistema! 🚀**

---

**Sistema de Inventario PEPS v1.0.0**
*Noviembre 2025 - PANI Costa Rica*
