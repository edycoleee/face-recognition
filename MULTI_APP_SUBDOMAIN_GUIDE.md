# 🌐 Multi-Application Subdomain Strategy

## 📋 Pertanyaan: Menambah Aplikasi dengan Subdomain Baru?

**Jawaban: TIDAK PERLU tunnel baru!** ✅

Anda bisa menggunakan **1 tunnel yang sama** untuk banyak aplikasi dengan subdomain berbeda.

---

## 🎯 2 Strategi Deployment

### **Strategi 1: Nginx Central Routing** ⭐ **RECOMMENDED**

**Semua subdomain → 1 tunnel → 1 nginx → routing berdasarkan subdomain**

```
app.kalijaga.fun      ──┐
api.kalijaga.fun      ──┤
admin.kalijaga.fun    ──┼──→ Cloudflare Tunnel → localhost:8080 (Nginx)
blog.kalijaga.fun     ──┤
crm.kalijaga.fun      ──┘
```

**Nginx yang handle routing berdasarkan `server_name`**

#### Kelebihan:
✅ **1 Tunnel** - Hemat resource  
✅ **Central Management** - Semua konfigurasi di nginx  
✅ **Easy SSL** - Cloudflare handle semua  
✅ **Flexible Routing** - Mudah tambah/hapus apps  
✅ **Port Management** - Tidak perlu expose banyak port  

#### Kekurangan:
⚠️ Nginx jadi single point of failure (tapi bisa di-monitor)  
⚠️ Semua apps harus di server yang sama  

---

### **Strategi 2: Multiple Port Routing**

**Setiap subdomain → port berbeda → tunnel yang sama**

```
app.kalijaga.fun     → localhost:8080 (Nginx - Face Recognition)
api.kalijaga.fun     → localhost:3000 (Node.js App)
admin.kalijaga.fun   → localhost:8000 (Django Admin)
blog.kalijaga.fun    → localhost:4000 (WordPress)
```

#### Kelebihan:
✅ Isolasi app lebih jelas  
✅ Tidak depend on central nginx  

#### Kekurangan:
⚠️ Harus manage banyak port  
⚠️ Konfigurasi Cloudflare lebih banyak  

---

## 🔧 Implementasi Strategi 1 (Recommended)

### Contoh: Tambah 3 Aplikasi Baru

**Aplikasi:**
1. `app.kalijaga.fun` - Face Recognition (current)
2. `blog.kalijaga.fun` - WordPress Blog
3. `crm.kalijaga.fun` - CRM System
4. `api.kalijaga.fun` - Public API

---

### Step 1: Update Nginx Configuration

Edit `/home/ubuntusvr/flask-docker/docker/prod/nginx.conf`:

```nginx
# ============================================================
# APP.KALIJAGA.FUN - Face Recognition System
# ============================================================
server {
  listen 80;
  server_name app.kalijaga.fun;
  
  client_max_body_size 10m;

  location /api/ {
    proxy_pass http://backend:5000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }

  location /pgadmin/ {
    proxy_pass http://pgadmin:80/;
    proxy_set_header Host $host;
    proxy_set_header X-Script-Name /pgadmin;
  }

  location / {
    proxy_pass http://frontend:80;
    proxy_set_header Host $host;
  }
}

# ============================================================
# BLOG.KALIJAGA.FUN - WordPress Blog
# ============================================================
server {
  listen 80;
  server_name blog.kalijaga.fun;

  location / {
    proxy_pass http://wordpress:80;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }
}

# ============================================================
# CRM.KALIJAGA.FUN - CRM System
# ============================================================
server {
  listen 80;
  server_name crm.kalijaga.fun;

  location / {
    proxy_pass http://crm-app:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }
}

# ============================================================
# API.KALIJAGA.FUN - Public API Gateway
# ============================================================
server {
  listen 80;
  server_name api.kalijaga.fun;

  location / {
    proxy_pass http://api-gateway:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }
}

# ============================================================
# DEFAULT - Root Domain (kalijaga.fun)
# ============================================================
server {
  listen 80 default_server;
  server_name kalijaga.fun www.kalijaga.fun;

  # Redirect to app subdomain or show landing page
  return 301 https://app.kalijaga.fun$request_uri;
}
```

---

### Step 2: Cloudflare Dashboard Configuration

**Pergi ke:** Cloudflare Dashboard → Zero Trust → Tunnels → `7cd54684-e942-4379-9bd3-ebb528930039`

**Tab: Public Hostnames**

Tambahkan entry berikut:

| Subdomain | Domain | Type | URL |
|-----------|--------|------|-----|
| `app` | `kalijaga.fun` | HTTP | `localhost:8080` |
| `blog` | `kalijaga.fun` | HTTP | `localhost:8080` |
| `crm` | `kalijaga.fun` | HTTP | `localhost:8080` |
| `api` | `kalijaga.fun` | HTTP | `localhost:8080` |
| `@` (root) | `kalijaga.fun` | HTTP | `localhost:8080` |

**Semua point ke `localhost:8080`** - Nginx yang handle routing!

---

### Step 3: Update Docker Compose

Tambahkan apps baru ke `unified-docker-compose.yml`:

```yaml
services:
  # ... existing services (postgres, backend, frontend, pgadmin, nginx)

  # WordPress Blog
  wordpress:
    image: wordpress:latest
    container_name: wordpress-blog
    environment:
      WORDPRESS_DB_HOST: postgres
      WORDPRESS_DB_NAME: wordpress_db
      WORDPRESS_DB_USER: sultan
      WORDPRESS_DB_PASSWORD: Sulfat123#!
    networks:
      - app_network
    restart: unless-stopped

  # CRM Application
  crm-app:
    image: your-crm-image:latest
    container_name: crm-system
    environment:
      DATABASE_URL: postgres://sultan:Sulfat123#!@postgres:5432/crm_db
    networks:
      - app_network
    restart: unless-stopped

  # API Gateway
  api-gateway:
    image: your-api-gateway:latest
    container_name: api-gateway
    networks:
      - app_network
    restart: unless-stopped
```

---

### Step 4: Deploy

```bash
cd /home/ubuntusvr/flask-docker/docker/prod

# Restart nginx untuk apply config baru
docker compose -f unified-docker-compose.yml restart nginx

# Atau deploy semua apps baru
docker compose -f unified-docker-compose.yml up -d
```

---

## 📊 Architecture Diagram

```
Internet
   ↓
Cloudflare Edge
   ↓
app.kalijaga.fun  ──┐
blog.kalijaga.fun ──┤
crm.kalijaga.fun  ──┼─→ Cloudflare Tunnel (1 tunnel)
api.kalijaga.fun  ──┤        ↓
kalijaga.fun      ──┘   localhost:8080
                             ↓
                      Nginx (Reverse Proxy)
                             ↓
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
   Face Recognition      WordPress             CRM App
   (frontend+backend)      (blog)              (crm-app)
        ↓                    ↓                    ↓
      PostgreSQL         PostgreSQL          PostgreSQL
   (face_db)          (wordpress_db)         (crm_db)
```

---

## 🎯 Routing Logic di Nginx

Nginx menggunakan **`server_name`** untuk routing:

```nginx
# Request dengan Host: app.kalijaga.fun
server_name app.kalijaga.fun;  ← Cocok! Route ke frontend

# Request dengan Host: blog.kalijaga.fun
server_name blog.kalijaga.fun; ← Cocok! Route ke wordpress

# Request dengan Host: unknown.kalijaga.fun
default_server; ← Catch-all, redirect atau 404
```

**Cloudflare Tunnel hanya perlu tahu:**
- Semua traffic ke `*.kalijaga.fun` forward ke `localhost:8080`
- Nginx yang decide kemana traffic di-route

---

## 🔄 Menambah Aplikasi Baru (Quick Steps)

### 1. Tambah container di docker-compose.yml
```yaml
new-app:
  image: new-app:latest
  networks:
    - app_network
```

### 2. Tambah server block di nginx.conf
```nginx
server {
  listen 80;
  server_name newapp.kalijaga.fun;
  location / {
    proxy_pass http://new-app:8080;
  }
}
```

### 3. Tambah public hostname di Cloudflare
```
Subdomain: newapp
Domain: kalijaga.fun
Type: HTTP
URL: localhost:8080
```

### 4. Restart nginx
```bash
docker compose -f unified-docker-compose.yml restart nginx
```

**SELESAI!** ✅ Aplikasi baru accessible di `newapp.kalijaga.fun`

---

## 💡 Pro Tips

### 1. Database Isolation
Buat database terpisah untuk setiap app:
```sql
CREATE DATABASE face_db;
CREATE DATABASE wordpress_db;
CREATE DATABASE crm_db;
```

### 2. Network Segmentation (Optional)
Untuk security lebih baik:
```yaml
networks:
  face_network:
  blog_network:
  crm_network:
  public_network: # untuk nginx
```

### 3. Environment-Based Config
Gunakan `.env` untuk manage config:
```env
FACE_APP_DOMAIN=app.kalijaga.fun
BLOG_DOMAIN=blog.kalijaga.fun
CRM_DOMAIN=crm.kalijaga.fun
```

### 4. SSL/TLS
Cloudflare otomatis handle SSL untuk semua subdomain! ✅

### 5. Monitoring
Monitor nginx access log:
```bash
docker exec reverse-proxy tail -f /var/log/nginx/access.log
```

---

## 🚨 Troubleshooting

### Subdomain tidak accessible

**Check:**
1. Cloudflare public hostname sudah ditambahkan
2. Nginx config sudah benar (check `server_name`)
3. Container app sudah running
4. Test internal: `curl -H "Host: blog.kalijaga.fun" http://localhost:8080/`

### 502 Bad Gateway

**Check:**
1. Container app running? `docker ps`
2. App listening di port yang benar?
3. Network settings benar?

```bash
# Test dari nginx ke app
docker exec reverse-proxy wget -O- http://wordpress:80
```

### Nginx tidak route dengan benar

**Debug:**
```bash
# Check nginx config syntax
docker exec reverse-proxy nginx -t

# Check nginx error log
docker exec reverse-proxy tail -f /var/log/nginx/error.log
```

---

## 📈 Scalability

Dengan setup ini, Anda bisa:

✅ **10+ aplikasi** dengan subdomain berbeda  
✅ **1 Tunnel** untuk semua  
✅ **1 Nginx** untuk routing  
✅ **1 Database** dengan multiple databases  
✅ **1 SSL Certificate** dari Cloudflare  

**Resource efficient & easy to manage!**

---

## 🎉 Summary

**Untuk menambah aplikasi baru dengan subdomain:**

1. ❌ **TIDAK PERLU** tunnel baru
2. ✅ **Pakai tunnel yang sama**: `7cd54684-e942-4379-9bd3-ebb528930039`
3. ✅ **Tambah public hostname** di Cloudflare Dashboard
4. ✅ **Tambah server block** di nginx.conf
5. ✅ **Tambah container** di docker-compose.yml
6. ✅ **Restart nginx**

**Semua traffic tetap via 1 tunnel → nginx routing berdasarkan subdomain!**

Lebih efisien, mudah manage, dan scalable! 🚀

---

## 🐳 Docker Internal Network vs External IP

### **Konsep Dasar: `proxy_pass` di Nginx**

Nginx bisa melakukan proxy ke berbagai target:
1. **Docker container dalam network yang sama** - menggunakan nama service
2. **Service di IP/server lain** - menggunakan IP lengkap
3. **Domain external** - menggunakan URL lengkap

---

### **1️⃣ Docker Internal Network (Service Name)**

#### **Cara Kerja:**

Ketika Anda menulis:
```nginx
proxy_pass http://frontend:80;
```

**`frontend` adalah nama Docker service**, bukan IP address!

#### **Contoh Docker Compose:**

```yaml
services:
  frontend:
    container_name: vite-frontend
    image: vite-frontend:latest
    networks:
      - app_network
  
  backend:
    container_name: flask-backend
    image: flask-backend:latest
    networks:
      - app_network
  
  nginx:
    container_name: reverse-proxy
    image: nginx:alpine
    networks:
      - app_network  # ← HARUS network yang SAMA
```

#### **DNS Internal Docker:**

Docker secara otomatis create **DNS internal** untuk resolve nama container:

```bash
# Dari dalam nginx container
ping frontend          # ✅ Bisa resolve ke IP container
ping vite-frontend     # ✅ Bisa resolve (container name)
ping backend           # ✅ Bisa resolve
ping flask-backend     # ✅ Bisa resolve
```

#### **Nginx Config untuk Docker Internal:**

```nginx
server {
  listen 80;
  server_name app.kalijaga.fun;
  
  location /api/ {
    proxy_pass http://backend:5000/api/;  # ← Service name
    proxy_set_header Host $host;
  }
  
  location / {
    proxy_pass http://frontend:80;  # ← Service name
    proxy_set_header Host $host;
  }
}
```

#### **Keuntungan:**
✅ **Tidak perlu tahu IP** - Docker resolve otomatis  
✅ **IP bisa berubah** - Docker update DNS otomatis  
✅ **Simple config** - Cukup tulis nama service  
✅ **Tidak perlu expose port** - Komunikasi internal  

---

### **2️⃣ External IP Address (Cross-Server/VM)**

#### **Scenario:**

Anda punya aplikasi di VM/server lain:

```
Proxmox VM: 192.10.10.154
├─ Docker (Face Recognition + Nginx)
│  ├─ nginx (reverse-proxy)
│  ├─ frontend
│  └─ backend

Proxmox VM: 192.10.10.155
├─ CRM System (Node.js)
│  └─ Port: 3000

Proxmox VM: 192.10.10.156
├─ WordPress Blog
│  └─ Port: 8080
```

#### **Nginx Config di 192.10.10.154:**

```nginx
# ============================================================
# APP.KALIJAGA.FUN - Docker Internal (192.10.10.154)
# ============================================================
server {
  listen 80;
  server_name app.kalijaga.fun;
  
  location /api/ {
    # Docker internal - pakai service name
    proxy_pass http://backend:5000/api/;
  }
  
  location / {
    # Docker internal - pakai service name
    proxy_pass http://frontend:80;
  }
}

# ============================================================
# CRM.KALIJAGA.FUN - External VM (192.10.10.155)
# ============================================================
server {
  listen 80;
  server_name crm.kalijaga.fun;
  
  location / {
    # External IP - tulis LENGKAP dengan IP:PORT
    proxy_pass http://192.10.10.155:3000;
    
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    
    # Optional: Timeout settings untuk external
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }
}

# ============================================================
# BLOG.KALIJAGA.FUN - External VM (192.10.10.156)
# ============================================================
server {
  listen 80;
  server_name blog.kalijaga.fun;
  
  location / {
    # External IP - tulis LENGKAP
    proxy_pass http://192.10.10.156:8080;
    
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

#### **Kebutuhan untuk External IP:**

##### **1. Service Harus Listen di 0.0.0.0 (bukan 127.0.0.1)**

❌ **SALAH - Hanya localhost:**
```bash
# Di VM 192.10.10.155 (CRM)
node app.js --host 127.0.0.1 --port 3000  # ❌ Tidak bisa diakses dari luar
```

✅ **BENAR - All interfaces:**
```bash
# Di VM 192.10.10.155 (CRM)
node app.js --host 0.0.0.0 --port 3000  # ✅ Bisa diakses dari network
```

**Untuk berbagai aplikasi:**

```bash
# Node.js/Express
app.listen(3000, '0.0.0.0');

# Python Flask
app.run(host='0.0.0.0', port=5000)

# Django
python manage.py runserver 0.0.0.0:8000

# Docker
docker run -p 0.0.0.0:3000:3000 myapp
```

##### **2. Firewall Rules**

Di VM target (192.10.10.155), izinkan traffic dari nginx (192.10.10.154):

```bash
# Ubuntu/Debian dengan UFW
sudo ufw allow from 192.10.10.154 to any port 3000
sudo ufw status

# Atau allow dari subnet
sudo ufw allow from 192.10.10.0/24 to any port 3000

# CentOS/RHEL dengan firewalld
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.10.10.154" port port="3000" protocol="tcp" accept'
sudo firewall-cmd --reload
```

##### **3. Network Connectivity Test**

```bash
# Dari host nginx (192.10.10.154)
curl http://192.10.10.155:3000
telnet 192.10.10.155 3000
nc -zv 192.10.10.155 3000

# Dari dalam nginx container
docker exec reverse-proxy wget -O- http://192.10.10.155:3000
docker exec reverse-proxy curl http://192.10.10.155:3000
```

---

### **📊 Comparison Table:**

| Aspek | Docker Internal | External IP |
|-------|----------------|-------------|
| **Format** | `http://service-name:port` | `http://192.10.10.155:port` |
| **Contoh** | `http://frontend:80` | `http://192.10.10.155:3000` |
| **DNS** | Docker internal DNS | Manual IP address |
| **Network** | Docker network | Physical/VM network |
| **Port Expose** | Tidak perlu | Harus expose & allow firewall |
| **Latency** | Sangat cepat (internal) | Tergantung network |
| **Isolasi** | Container network | Cross-server |
| **Complexity** | Simple | Lebih kompleks |
| **Use Case** | Apps dalam 1 server | Apps di multiple servers |

---

### **🎯 Real-World Example:**

#### **Scenario: E-Commerce Platform**

```
Proxmox Host: 192.10.10.154 (Main Server)
├─ Nginx Reverse Proxy (Docker)
├─ Frontend React (Docker) - port 80
├─ Backend API (Docker) - port 5000
└─ PostgreSQL (Docker) - port 5432

Proxmox Host: 192.10.10.155 (Microservices)
├─ Payment Service (Node.js) - port 3001
├─ Email Service (Python) - port 3002
└─ Analytics Service (Go) - port 3003

Proxmox Host: 192.10.10.156 (Content)
├─ WordPress Blog - port 8080
└─ Media Server - port 8081
```

#### **Unified Nginx Config:**

```nginx
# ============================================================
# MAIN APP - Docker Internal (192.10.10.154)
# ============================================================
server {
  listen 80;
  server_name shop.kalijaga.fun;
  
  location /api/ {
    proxy_pass http://backend:5000/api/;  # ← Docker internal
  }
  
  location / {
    proxy_pass http://frontend:80;  # ← Docker internal
  }
}

# ============================================================
# PAYMENT API - External (192.10.10.155:3001)
# ============================================================
server {
  listen 80;
  server_name payment.kalijaga.fun;
  
  location / {
    proxy_pass http://192.10.10.155:3001;  # ← External IP
    
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    
    # Security headers untuk payment
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Server $host;
  }
}

# ============================================================
# EMAIL SERVICE - External (192.10.10.155:3002)
# ============================================================
server {
  listen 80;
  server_name email.kalijaga.fun;
  
  location / {
    proxy_pass http://192.10.10.155:3002;  # ← External IP
    
    proxy_set_header Host $host;
    proxy_connect_timeout 30s;
    proxy_send_timeout 30s;
    proxy_read_timeout 30s;
  }
}

# ============================================================
# BLOG - External (192.10.10.156:8080)
# ============================================================
server {
  listen 80;
  server_name blog.kalijaga.fun;
  
  location / {
    proxy_pass http://192.10.10.156:8080;  # ← External IP
    
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
  }
}
```

#### **Architecture Diagram:**

```
Internet
   ↓
Cloudflare Tunnel (7cd54684-e942-4379-9bd3-ebb528930039)
   ↓
192.10.10.154:8080 (Nginx)
   ↓
   ├─→ shop.kalijaga.fun
   │   ├─→ http://frontend:80       ← Docker internal
   │   └─→ http://backend:5000      ← Docker internal
   │
   ├─→ payment.kalijaga.fun
   │   └─→ http://192.10.10.155:3001  ← External IP
   │
   ├─→ email.kalijaga.fun
   │   └─→ http://192.10.10.155:3002  ← External IP
   │
   └─→ blog.kalijaga.fun
       └─→ http://192.10.10.156:8080  ← External IP
```

---

### **🔧 Setup Checklist untuk External IP:**

#### **Di Server Target (contoh: 192.10.10.155 - CRM):**

```bash
# 1. Check service listening pada 0.0.0.0
sudo netstat -tlnp | grep 3000
# Expected: 0.0.0.0:3000 (bukan 127.0.0.1:3000)

# 2. Test dari localhost
curl http://localhost:3000

# 3. Allow firewall dari nginx server
sudo ufw allow from 192.10.10.154 to any port 3000

# 4. Check firewall status
sudo ufw status

# 5. Test dari server lain
# Dari 192.10.10.154
curl http://192.10.10.155:3000
```

#### **Di Server Nginx (192.10.10.154):**

```bash
# 1. Test koneksi ke target
curl http://192.10.10.155:3000
telnet 192.10.10.155 3000

# 2. Test dari dalam nginx container
docker exec reverse-proxy curl http://192.10.10.155:3000

# 3. Check nginx config syntax
docker exec reverse-proxy nginx -t

# 4. Reload nginx
docker exec reverse-proxy nginx -s reload
# Atau restart
docker restart reverse-proxy
```

---

### **⚠️ Common Issues & Solutions:**

#### **Issue 1: Connection Refused**

```bash
curl: (7) Failed to connect to 192.10.10.155 port 3000: Connection refused
```

**Penyebab & Solusi:**

✅ **Check 1:** Service running?
```bash
# Di VM 192.10.10.155
sudo systemctl status myapp
ps aux | grep node  # untuk Node.js app
```

✅ **Check 2:** Listening di 0.0.0.0?
```bash
sudo netstat -tlnp | grep 3000
# Harus: 0.0.0.0:3000 BUKAN 127.0.0.1:3000
```

✅ **Check 3:** Firewall blocking?
```bash
sudo ufw status
sudo ufw allow 3000
```

---

#### **Issue 2: Connection Timeout**

```bash
curl: (28) Failed to connect to 192.10.10.155 port 3000: Connection timed out
```

**Penyebab & Solusi:**

✅ **Network routing issue:**
```bash
# Ping target
ping 192.10.10.155

# Traceroute
traceroute 192.10.10.155

# Check if port is reachable
nc -zv 192.10.10.155 3000
```

✅ **Firewall di target VM:**
```bash
# Di 192.10.10.155
sudo ufw allow from 192.10.10.154 to any port 3000
```

---

#### **Issue 3: 502 Bad Gateway**

```
502 Bad Gateway - nginx/1.29.4
```

**Penyebab & Solusi:**

✅ **Backend service down:**
```bash
# Check service status
curl http://192.10.10.155:3000
```

✅ **Nginx config salah:**
```bash
# Check nginx config
docker exec reverse-proxy nginx -t

# Check nginx error log
docker exec reverse-proxy tail -f /var/log/nginx/error.log
```

✅ **Timeout terlalu pendek:**
```nginx
location / {
  proxy_pass http://192.10.10.155:3000;
  
  # Tambahkan timeout lebih besar
  proxy_connect_timeout 60s;
  proxy_send_timeout 60s;
  proxy_read_timeout 60s;
}
```

---

### **💡 Best Practices:**

#### **1. Gunakan Docker Internal untuk Apps dalam 1 Server**

✅ **Recommended:**
```yaml
# Semua apps dalam 1 docker-compose
services:
  nginx:
    networks: [app_network]
  frontend:
    networks: [app_network]
  backend:
    networks: [app_network]
  crm:
    networks: [app_network]
```

```nginx
# Nginx config - simple!
proxy_pass http://frontend:80;
proxy_pass http://backend:5000;
proxy_pass http://crm:3000;
```

#### **2. Gunakan External IP untuk Microservices/Multi-Server**

✅ **For scalability:**
- Payment service di server dedicated
- Database di server dedicated
- Media processing di server dengan GPU

```nginx
# Nginx config
proxy_pass http://frontend:80;              # Local
proxy_pass http://192.10.10.155:3000;      # Payment server
proxy_pass http://192.10.10.156:5432;      # Database server
proxy_pass http://192.10.10.157:8000;      # GPU server
```

#### **3. Security untuk External Connection**

```nginx
location / {
  proxy_pass http://192.10.10.155:3000;
  
  # Security headers
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto https;
  
  # Hide backend info
  proxy_hide_header X-Powered-By;
  proxy_hide_header Server;
  
  # Rate limiting (optional)
  limit_req zone=mylimit burst=20 nodelay;
}
```

#### **4. Health Checks**

```nginx
# Health check endpoint
location /health {
  access_log off;
  proxy_pass http://192.10.10.155:3000/health;
  proxy_set_header Host $host;
}
```

#### **5. Monitoring & Logging**

```nginx
# Custom log format untuk debugging
log_format upstream_log '$remote_addr - $remote_user [$time_local] '
                        '"$request" $status $body_bytes_sent '
                        '"$http_referer" "$http_user_agent" '
                        'upstream: $upstream_addr '
                        'upstream_status: $upstream_status '
                        'request_time: $request_time '
                        'upstream_response_time: $upstream_response_time';

server {
  access_log /var/log/nginx/upstream.log upstream_log;
  
  location / {
    proxy_pass http://192.10.10.155:3000;
  }
}
```

---

### **📝 Quick Reference:**

#### **Docker Internal (Same Network):**
```nginx
proxy_pass http://service-name:port;
proxy_pass http://frontend:80;
proxy_pass http://backend:5000;
```

**Requirements:**
- ✅ Service dalam docker network yang sama
- ✅ Service name defined di docker-compose.yml
- ❌ Tidak perlu expose port
- ❌ Tidak perlu firewall rules

---

#### **External IP (Different Server):**
```nginx
proxy_pass http://IP:PORT;
proxy_pass http://192.10.10.155:3000;
proxy_pass http://192.10.10.156:8080;
```

**Requirements:**
- ✅ Service listening di 0.0.0.0 (bukan 127.0.0.1)
- ✅ Port exposed & accessible
- ✅ Firewall allow dari nginx server
- ✅ Network routing configured
- ✅ Additional proxy headers

---

### **🎓 Summary:**

| Scenario | Nginx Config | Notes |
|----------|-------------|-------|
| **Container dalam Docker** | `http://frontend:80` | Service name dari docker-compose |
| **Container di host lain** | `http://192.10.10.155:3000` | Full IP + port |
| **External API** | `http://api.example.com` | Full domain |
| **Localhost service** | `http://127.0.0.1:3000` | Jarang dipakai, prefer Docker |

**Golden Rule:**
- 🐳 **Same Docker Network** → Use service name
- 🌐 **Different Server/VM** → Use full IP:PORT
- 🔒 **Always use HTTPS** di Cloudflare Tunnel level

Dokumentasi ini bisa jadi referensi saat ingin menambah aplikasi baru dengan IP berbeda! 🚀
