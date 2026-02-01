# 🚀 Cloudflare Tunnel Setup Guide - Opsi B (Unified)

## 📋 Architecture Overview

```
Internet
   ↓
Cloudflare Edge (kalijaga.fun)
   ↓
Cloudflare Tunnel (7cd54684-e942-4379-9bd3-ebb528930039)
   ↓
[Docker Internal Network]
   ├── cloudflared (connector)
   ├── nginx (reverse proxy) ← ONLY accessible via tunnel
   ├── frontend (vite)
   ├── backend (flask)
   ├── pgadmin (db management)
   └── postgres (database)

NO PORTS EXPOSED TO PUBLIC INTERNET! ✅
```

## 🎯 Service Routes

| URL | Service | Internal Route |
|-----|---------|----------------|
| `https://kalijaga.fun/` | Frontend | nginx → frontend:80 |
| `https://kalijaga.fun/api/` | Backend API | nginx → backend:5000 |
| `https://kalijaga.fun/swaggerui/` | API Docs | nginx → backend:5000/swaggerui |
| `https://kalijaga.fun/pgadmin/` | PgAdmin | nginx → pgadmin:80 |
| PostgreSQL | Internal Only | postgres:5432 (no external access) |

---

## 🔧 Setup Steps

### Step 1: Get Cloudflare Tunnel Token

1. Login to Cloudflare Dashboard: https://dash.cloudflare.com/
2. Go to **Zero Trust** → **Access** → **Tunnels**
3. Click your tunnel: `7cd54684-e942-4379-9bd3-ebb528930039`
4. Copy the **Tunnel Token** (starts with `eyJ...`)

### Step 2: Configure Cloudflare Tunnel Routing

Di dashboard Cloudflare, set public hostname:

```
Service: kalijaga.fun
Type: HTTP
URL: nginx:80
```

**Important:** Gunakan `nginx:80` bukan `localhost:80` karena cloudflared dan nginx dalam network yang sama.

### Step 3: Create `.env` File

```bash
cd /home/ubuntusvr/flask-docker/docker/prod
cp .env.example .env
nano .env
```

Edit dan isi:
```env
CLOUDFLARE_TUNNEL_TOKEN=eyJh......your_actual_token_here
```

### Step 4: Deploy All Services

```bash
cd /home/ubuntusvr/flask-docker/docker/prod

# Stop old services if running
docker-compose down
cd ../../database && docker-compose down
cd ../docker/prod

# Deploy unified stack
docker-compose -f unified-docker-compose.yml up -d

# Check all services running
docker-compose -f unified-docker-compose.yml ps

# Check logs
docker-compose -f unified-docker-compose.yml logs -f
```

### Step 5: Verify Deployment

Test each endpoint:

```bash
# Frontend
curl -I https://kalijaga.fun/

# Backend API
curl https://kalijaga.fun/api/halo

# Swagger UI
curl -I https://kalijaga.fun/swaggerui/

# PgAdmin (will redirect to login)
curl -I https://kalijaga.fun/pgadmin/
```

---

## 🔒 Security Advantages

✅ **No Public Ports** - Tidak ada port 80/443/5432/5050 exposed ke internet  
✅ **Zero Trust Network** - Semua akses via Cloudflare Tunnel  
✅ **Automatic SSL** - Cloudflare handles SSL certificate  
✅ **DDoS Protection** - Included from Cloudflare  
✅ **Database Isolation** - PostgreSQL tidak bisa diakses dari luar  
✅ **Single Entry Point** - Nginx sebagai gatekeeper internal  

---

## 📊 Service Management

### Start All Services
```bash
docker-compose -f unified-docker-compose.yml up -d
```

### Stop All Services
```bash
docker-compose -f unified-docker-compose.yml down
```

### Restart Specific Service
```bash
docker-compose -f unified-docker-compose.yml restart backend
docker-compose -f unified-docker-compose.yml restart nginx
```

### View Logs
```bash
# All services
docker-compose -f unified-docker-compose.yml logs -f

# Specific service
docker-compose -f unified-docker-compose.yml logs -f backend
docker-compose -f unified-docker-compose.yml logs -f cloudflared
```

### Check Service Health
```bash
docker-compose -f unified-docker-compose.yml ps
docker exec face-db-postgres pg_isready -U sultan -d face_db
```

---

## 🐛 Troubleshooting

### Tunnel Not Connecting

```bash
# Check cloudflared logs
docker logs cloudflare-tunnel

# Restart tunnel
docker-compose -f unified-docker-compose.yml restart cloudflared
```

### 502 Bad Gateway

```bash
# Check nginx logs
docker logs reverse-proxy

# Check if backend is running
docker exec flask-backend curl http://localhost:5000/api/halo

# Restart nginx
docker-compose -f unified-docker-compose.yml restart nginx
```

### Database Connection Issues

```bash
# Check database
docker exec face-db-postgres pg_isready -U sultan -d face_db

# Check backend can connect
docker exec flask-backend python -c "import psycopg2; conn = psycopg2.connect(host='postgres', port=5432, dbname='face_db', user='sultan', password='Sulfat123#!'); print('Connected!')"
```

### PgAdmin Not Accessible

PgAdmin butuh konfigurasi khusus untuk path `/pgadmin/`:

```bash
# Check pgadmin logs
docker logs face-db-pgadmin

# Verify environment variable
docker exec face-db-pgadmin env | grep SCRIPT_NAME
```

---

## 🔄 Update Application

### Update Backend Code
```bash
cd /home/ubuntusvr/flask-docker/docker/prod
docker-compose -f unified-docker-compose.yml build backend
docker-compose -f unified-docker-compose.yml up -d backend
```

### Update Frontend Code
```bash
docker-compose -f unified-docker-compose.yml build frontend
docker-compose -f unified-docker-compose.yml up -d frontend
```

### Update Nginx Config
```bash
# Edit nginx-unified.conf
nano nginx-unified.conf

# Reload nginx
docker-compose -f unified-docker-compose.yml restart nginx
```

---

## 📈 Monitoring

### Check Resource Usage
```bash
docker stats
```

### Database Size
```bash
docker exec face-db-postgres psql -U sultan -d face_db -c "
SELECT 
  pg_size_pretty(pg_database_size('face_db')) as db_size,
  (SELECT count(*) FROM users) as total_users,
  (SELECT count(*) FROM face_embeddings) as total_embeddings,
  (SELECT count(*) FROM attendance) as total_attendance;
"
```

---

## 🎉 Success Checklist

- [ ] Cloudflare Tunnel token configured in `.env`
- [ ] All services running: `docker-compose ps` shows 6 containers
- [ ] Frontend accessible: https://kalijaga.fun/
- [ ] Backend API working: https://kalijaga.fun/api/halo
- [ ] Swagger UI accessible: https://kalijaga.fun/swaggerui/
- [ ] PgAdmin accessible: https://kalijaga.fun/pgadmin/
- [ ] No ports exposed on host: `sudo netstat -tlnp | grep -E ':(80|443|5432|5050)'` returns nothing
- [ ] Database internal only: Cannot connect to postgres from outside

---

## 🌐 DNS Configuration

Your current DNS is already correct:

```
Type: CNAME
Name: kalijaga.fun
Target: 7cd54684-e942-4379-9bd3-ebb528930039.cfargotunnel.com
Proxied: Yes (Orange Cloud)
```

✅ No changes needed!

---

## 💡 Pro Tips

1. **Backup Database**: 
   ```bash
   docker exec face-db-postgres pg_dump -U sultan face_db > backup.sql
   ```

2. **Monitor Tunnel Status**:
   ```bash
   docker logs -f cloudflare-tunnel
   ```

3. **Check Nginx Access Logs**:
   ```bash
   docker exec reverse-proxy cat /var/log/nginx/access.log
   ```

4. **Restart Everything**:
   ```bash
   docker-compose -f unified-docker-compose.yml restart
   ```
