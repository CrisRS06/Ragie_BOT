# Guía de Despliegue - Sistema de Inventario PEPS

## 🎯 Opciones de Despliegue

Este sistema puede desplegarse de múltiples formas:

1. **Docker Compose** (Recomendado para desarrollo y staging)
2. **Kubernetes** (Recomendado para producción enterprise)
3. **Plataformas Cloud** (Vercel, Railway, Render, etc.)
4. **VPS Tradicional** (Ubuntu/Debian con PM2)

---

## 🐳 Opción 1: Docker Compose (Recomendado)

### Requisitos
- Docker 24.x o superior
- Docker Compose 2.x o superior
- 2GB RAM mínimo
- 10GB espacio en disco

### Pasos

1. **Clonar el repositorio**

```bash
git clone <repository-url>
cd inventario-peps
```

2. **Configurar variables de entorno**

```bash
cp .env.example .env.production
```

Editar `.env.production`:

```env
DB_PASSWORD=generate_secure_password_here
JWT_SECRET=generate_with_openssl_rand_hex_32
NEXTAUTH_SECRET=generate_with_openssl_rand_hex_32
NEXTAUTH_URL=https://inventario.pani.go.cr
FISCALIZADOR_EMAIL=fiscalizador@pani.go.cr
SMTP_HOST=smtp.example.com
SMTP_USER=notificaciones@pani.go.cr
SMTP_PASSWORD=smtp_password_here
ENABLE_CRON_JOBS=true
```

3. **Generar secretos seguros**

```bash
# Para JWT_SECRET y NEXTAUTH_SECRET
openssl rand -hex 32

# Para DB_PASSWORD (32 caracteres alfanuméricos)
openssl rand -base64 24
```

4. **Iniciar los contenedores**

```bash
# Producción
docker-compose up -d

# Con pgAdmin para administración (solo dev/staging)
docker-compose --profile dev up -d
```

5. **Ejecutar migraciones**

```bash
docker-compose exec app npx prisma migrate deploy
```

6. **Crear usuario administrador inicial**

```bash
docker-compose exec app npm run create-admin
```

7. **Verificar estado**

```bash
docker-compose ps
docker-compose logs -f app
```

### Actualizaciones

```bash
# Pull de la nueva versión
git pull origin main

# Rebuild y restart
docker-compose up -d --build

# Ejecutar nuevas migraciones
docker-compose exec app npx prisma migrate deploy
```

### Backups

```bash
# Backup manual de la base de datos
docker-compose exec db pg_dump -U inventario_user inventario_peps > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
docker-compose exec -T db psql -U inventario_user inventario_peps < backup_YYYYMMDD_HHMMSS.sql
```

---

## ☸️ Opción 2: Kubernetes

### Requisitos
- Cluster Kubernetes 1.28+
- kubectl configurado
- Helm 3.x (opcional)

### Archivos de configuración

Ver carpeta `/kubernetes` para:
- `deployment.yaml`
- `service.yaml`
- `ingress.yaml`
- `configmap.yaml`
- `secrets.yaml`
- `pvc.yaml`

### Despliegue

```bash
# Crear namespace
kubectl create namespace inventario-peps

# Crear secrets
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret=$(openssl rand -hex 32) \
  --from-literal=nextauth-secret=$(openssl rand -hex 32) \
  --from-literal=db-password=$(openssl rand -base64 24) \
  -n inventario-peps

# Aplicar configuraciones
kubectl apply -f kubernetes/ -n inventario-peps

# Verificar estado
kubectl get pods -n inventario-peps
kubectl logs -f deployment/inventario-peps-app -n inventario-peps
```

---

## ☁️ Opción 3: Vercel + Supabase

### Vercel (Frontend + API)

1. Conectar repositorio en Vercel
2. Configurar variables de entorno en Vercel Dashboard
3. Deploy automático en push a main

### Supabase (Base de Datos + Auth)

1. Crear proyecto en Supabase
2. Copiar `DATABASE_URL` de Settings > Database
3. Ejecutar migraciones:

```bash
npx prisma migrate deploy
```

4. Configurar RLS policies en Supabase SQL Editor

---

## 🖥️ Opción 4: VPS Tradicional (Ubuntu 22.04)

### Requisitos
- Ubuntu 22.04 LTS
- 2GB RAM mínimo
- Node.js 20.x
- PostgreSQL 14+
- Nginx
- PM2

### Pasos

1. **Instalar dependencias del sistema**

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar Nginx
sudo apt install -y nginx

# Instalar PM2
sudo npm install -g pm2
```

2. **Configurar PostgreSQL**

```bash
sudo -u postgres psql

CREATE USER inventario_user WITH PASSWORD 'secure_password_here';
CREATE DATABASE inventario_peps OWNER inventario_user;
GRANT ALL PRIVILEGES ON DATABASE inventario_peps TO inventario_user;
\q
```

3. **Clonar y configurar aplicación**

```bash
cd /var/www
sudo git clone <repository-url> inventario-peps
cd inventario-peps
sudo chown -R $USER:$USER /var/www/inventario-peps

# Instalar dependencias
npm ci --omit=dev

# Configurar variables
cp .env.example .env
nano .env  # Editar con tus valores

# Generar Prisma client
npx prisma generate

# Ejecutar migraciones
npx prisma migrate deploy

# Build de Next.js
npm run build
```

4. **Configurar PM2**

```bash
# Iniciar aplicación
pm2 start npm --name "inventario-peps" -- start

# Guardar configuración
pm2 save

# Configurar inicio automático
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
```

5. **Configurar Nginx**

```bash
sudo nano /etc/nginx/sites-available/inventario-peps
```

Contenido:

```nginx
server {
    listen 80;
    server_name inventario.pani.go.cr;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Activar sitio:

```bash
sudo ln -s /etc/nginx/sites-available/inventario-peps /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

6. **Configurar SSL con Let's Encrypt**

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d inventario.pani.go.cr
```

7. **Configurar backups automáticos**

```bash
sudo nano /etc/cron.daily/backup-inventario-peps
```

Contenido:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/inventario-peps"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup de base de datos
sudo -u postgres pg_dump inventario_peps > $BACKUP_DIR/db_$DATE.sql

# Comprimir
gzip $BACKUP_DIR/db_$DATE.sql

# Mantener solo últimos 30 días
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
```

Dar permisos:

```bash
sudo chmod +x /etc/cron.daily/backup-inventario-peps
```

---

## 🔐 Checklist de Seguridad Post-Despliegue

- [ ] Cambiar todas las contraseñas por defecto
- [ ] Generar nuevos JWT_SECRET y NEXTAUTH_SECRET
- [ ] Configurar SSL/TLS (HTTPS)
- [ ] Configurar firewall (UFW/iptables)
- [ ] Habilitar solo puertos necesarios (80, 443)
- [ ] Configurar fail2ban para protección contra brute force
- [ ] Actualizar sistema operativo
- [ ] Configurar backups automáticos
- [ ] Configurar monitoreo (Prometheus, Grafana, o similar)
- [ ] Configurar alertas (email, SMS)
- [ ] Revisar logs regularmente
- [ ] Habilitar 2FA para usuarios administradores
- [ ] Configurar políticas de contraseñas fuertes
- [ ] Documentar procedimientos de emergencia

---

## 📊 Monitoreo

### Logs

```bash
# Docker Compose
docker-compose logs -f app

# PM2
pm2 logs inventario-peps

# Kubernetes
kubectl logs -f deployment/inventario-peps-app -n inventario-peps
```

### Métricas

El sistema expone métricas en `/api/metrics` (Prometheus format).

Configurar Prometheus para scraping:

```yaml
scrape_configs:
  - job_name: 'inventario-peps'
    static_configs:
      - targets: ['inventario.pani.go.cr:3000']
```

### Health Checks

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "timestamp": "2025-11-06T10:00:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```

---

## 🆘 Troubleshooting

### La aplicación no inicia

```bash
# Verificar logs
docker-compose logs app  # Docker
pm2 logs inventario-peps  # PM2

# Verificar conexión a base de datos
docker-compose exec app npx prisma db execute --stdin <<< "SELECT 1;"
```

### Error de conexión a base de datos

1. Verificar que PostgreSQL esté corriendo
2. Verificar credenciales en `.env`
3. Verificar conectividad de red
4. Verificar permisos del usuario de BD

### Migraciones fallan

```bash
# Ver estado de migraciones
npx prisma migrate status

# Resolver manualmente
npx prisma migrate resolve --rolled-back MIGRATION_NAME
npx prisma migrate deploy
```

### Cron jobs no se ejecutan

1. Verificar `ENABLE_CRON_JOBS=true`
2. Verificar logs del sistema
3. Ejecutar manualmente para probar

---

## 📞 Soporte

Para asistencia técnica:
- Email: soporte-inventario@pani.go.cr
- Tel: +506 xxxx-xxxx
- Documentación: Ver `/docs`

---

**Sistema de Inventario PEPS v1.0.0**
*Noviembre 2025*
