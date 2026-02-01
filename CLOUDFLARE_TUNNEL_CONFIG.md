# ☁️ Cloudflare Tunnel Configuration

## ✅ Current Status
- **Tunnel ID**: `7cd54684-e942-4379-9bd3-ebb528930039`
- **Domain**: `kalijaga.fun`
- **Tunnel Status**: ✅ Healthy (running on host)
- **Docker Services**: ✅ All running

---

## 🔧 Cloudflare Dashboard Configuration

### Step 1: Configure Public Hostname

Pergi ke: https://dash.cloudflare.com/ → **Zero Trust** → **Access** → **Tunnels**

Klik tunnel: `7cd54684-e942-4379-9bd3-ebb528930039`

### Step 2: Add/Edit Public Hostname

**Tambahkan konfigurasi berikut:**

| Field | Value |
|-------|-------|
| **Subdomain** | `@` atau kosongkan (untuk root domain) |
| **Domain** | `kalijaga.fun` |
| **Type** | `HTTP` |
| **URL** | `localhost:8080` |

**ATAU jika ingin pakai subdomain:**

| Field | Value |
|-------|-------|
| **Subdomain** | `app` |
| **Domain** | `kalijaga.fun` |
| **Type** | `HTTP` |
| **URL** | `localhost:8080` |

⚠️ **PENTING**: Gunakan `localhost:8080` BUKAN `nginx:80` karena cloudflared running di host OS, bukan di Docker.

### Step 3: Save Configuration

Klik **Save hostname** dan tunggu beberapa detik.

---

## 🧪 Test Configuration

Setelah konfigurasi tersimpan, test endpoints:

```bash
# Frontend
curl -I https://kalijaga.fun/

# Backend API
curl https://kalijaga.fun/api/halo/

# Swagger UI
curl -I https://kalijaga.fun/swaggerui/

# PgAdmin
curl -I https://kalijaga.fun/pgadmin/
```

**Atau buka di browser:**
- Frontend: https://kalijaga.fun/
- API Docs: https://kalijaga.fun/swaggerui/
- PgAdmin: https://kalijaga.fun/pgadmin/

---

## 📊 Service Architecture

```
Internet
   ↓
Cloudflare Edge (kalijaga.fun)
   ↓ HTTPS
Cloudflare Tunnel (running on host)
   ↓ HTTP
localhost:8080
   ↓
Docker: reverse-proxy (nginx)
   ├─→ frontend:80 (/)
   ├─→ backend:5000 (/api/)
   ├─→ backend:5000 (/swaggerui/)
   └─→ pgadmin:80 (/pgadmin/)
```

---

## 🔍 Verify Services

### Check all containers running:
```bash
docker ps
```

Expected output:
```
reverse-proxy      (nginx)
vite-frontend      (frontend)
flask-backend      (backend)
face-db-pgadmin    (pgadmin)
face-db-postgres   (database)
```

### Check nginx is accessible:
```bash
curl http://localhost:8080/api/halo/
```

Expected: `{"message": "Halo! Welcome to Flask API"}`

### Check cloudflared tunnel:
```bash
ps aux | grep cloudflared
```

Should show process running with token.

---

## 🐛 Troubleshooting

### Tunnel tidak connect

```bash
# Check process
ps aux | grep cloudflared

# Restart service (jika pakai systemd)
sudo systemctl restart cloudflared

# Atau kill dan restart
sudo pkill cloudflared
sudo cloudflared tunnel --no-autoupdate run --token YOUR_TOKEN
```

### 502 Bad Gateway

```bash
# Check nginx
docker logs reverse-proxy

# Check if nginx listening on 8080
curl http://localhost:8080/

# Restart nginx
docker restart reverse-proxy
```

### Backend tidak respond

```bash
# Check backend logs
docker logs flask-backend

# Check database connection
docker exec flask-backend python -c "from utils.db import get_db_connection; conn = get_db_connection(); print('DB Connected!')"
```

### PgAdmin tidak bisa diakses

```bash
# Check pgadmin logs
docker logs face-db-pgadmin

# Verify SCRIPT_NAME env
docker exec face-db-pgadmin env | grep SCRIPT_NAME
```

---

## 🔄 Restart All Services

```bash
cd /home/ubuntusvr/flask-docker/docker/prod
docker compose -f unified-docker-compose.yml restart
```

## 🛑 Stop All Services

```bash
cd /home/ubuntusvr/flask-docker/docker/prod
docker compose -f unified-docker-compose.yml down
```

## ▶️ Start All Services

```bash
cd /home/ubuntusvr/flask-docker/docker/prod
docker compose -f unified-docker-compose.yml up -d
```

---

## 📋 Success Checklist

- [x] Cloudflared tunnel running dan healthy
- [x] Docker containers semua running (5 containers)
- [x] Nginx accessible di localhost:8080
- [x] Backend API responding
- [ ] Cloudflare public hostname configured
- [ ] Domain kalijaga.fun accessible dari internet
- [ ] Frontend loaded di browser
- [ ] Backend API working via domain
- [ ] PgAdmin accessible via domain

---

## 🎉 Next Steps

Setelah konfigurasi Cloudflare selesai:

1. Test semua endpoints via https://kalijaga.fun
2. Login ke PgAdmin dan connect ke postgres
3. Test face recognition features
4. Monitor logs untuk errors
5. Setup monitoring/alerting (optional)

**Database Connection Info untuk PgAdmin:**
- Host: `postgres` (atau `face-db-postgres`)
- Port: `5432`
- Database: `face_db`
- Username: `sultan`
- Password: `Sulfat123#!`
