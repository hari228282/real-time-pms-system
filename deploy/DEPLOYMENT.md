# Deployment Guide

Two supported targets. Pick one.

- **A. Self-managed VM (non-AWS/GCP)** — Nginx + Let's Encrypt + the app under a process
  manager. This is the path the Nginx config + this guide are written for.
- **B. Managed (Render + Netlify)** — zero-server fallback if no VM is provided.

---

## A. Self-managed VM (e.g. DigitalOcean / Hetzner / Linode)

### 0. Prerequisites on the VM
```bash
# Node 18+, Nginx, and a process manager
sudo apt update && sudo apt install -y nginx
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```
MongoDB and Redis: run them as managed services (MongoDB Atlas + Redis Cloud) **or** install
locally. In production, **always** use an authenticated, TLS-enabled Mongo connection string
and a password-protected Redis — never bind them to a public interface.

### 1. Get the code & configure env
```bash
git clone <repo> /var/www/pms && cd /var/www/pms

# Backend env (never committed)
cp backend/.env.example backend/.env
# edit backend/.env: set MONGO_URI (with auth+TLS), REDIS_URL, a strong JWT_SECRET,
# CORS_ORIGIN=https://example.com, NODE_ENV=production
```

### 2. Build
```bash
cd backend && npm ci
cd ../frontend && npm ci && npm run build   # outputs frontend/dist (served by Nginx)
```

### 3. Run the backend under PM2
```bash
cd /var/www/pms/backend
pm2 start server.js --name pms-api
pm2 save && pm2 startup        # restart on reboot
```

### 4. Nginx
```bash
sudo cp /var/www/pms/deploy/nginx.conf /etc/nginx/sites-available/pms
# edit server_name + paths to match your domain
sudo ln -s /etc/nginx/sites-available/pms /etc/nginx/sites-enabled/pms
sudo nginx -t && sudo systemctl reload nginx
```

### 5. SSL via Let's Encrypt
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo mkdir -p /var/www/certbot

# Issue + auto-wire certs into the Nginx server block
sudo certbot --nginx -d example.com

# certbot installs a systemd timer that auto-renews. Verify:
sudo certbot renew --dry-run
```

### 6. Verify
- `https://example.com` loads the SPA.
- `https://example.com/api/health` returns `{ "success": true, ... }`.
- DevTools → Network → WS shows a `101 Switching Protocols` on `/socket.io/`.

---

## B. Managed fallback — Render (backend) + Netlify (frontend)

**Backend → Render Web Service**
- Root: `backend/`, build: `npm ci`, start: `node server.js`.
- Add a **Render Redis** instance and a **MongoDB Atlas** cluster; set env vars
  (`MONGO_URI`, `REDIS_URL`, `JWT_SECRET`, `CORS_ORIGIN=https://<your-netlify-site>`).
- Render terminates SSL and proxies WebSockets automatically — no Nginx needed.

**Frontend → Netlify**
- Base `frontend/`, build `npm run build`, publish `frontend/dist`.
- Env: `VITE_API_URL=https://<render-backend>/api`, `VITE_SOCKET_URL=https://<render-backend>`.
- Add a SPA redirect (`/* /index.html 200`) so client routing works.

> Live URLs go in the root `README.md` placeholders once deployed.
