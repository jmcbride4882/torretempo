# SSL CERTIFICATE LOCATIONS - PERMANENT REFERENCE

**Last Updated:** 2026-02-04  
**Domain:** time.lsltgroup.es  
**Status:** ✅ ACTIVE & RESTORED

---

## 🔐 PRIMARY CERTIFICATE LOCATION (Production VPS)

**Host Path:**

```
/opt/torre-tempo/certbot/conf/live/time.lsltgroup.es/
```

**Certificate Files (Symlinks):**

- `fullchain.pem` → `../../archive/time.lsltgroup.es/fullchain1.pem`
- `privkey.pem` → `../../archive/time.lsltgroup.es/privkey1.pem`
- `cert.pem` → `../../archive/time.lsltgroup.es/cert1.pem`
- `chain.pem` → `../../archive/time.lsltgroup.es/chain1.pem`

**Actual Certificate Files (Archive):**

```
/opt/torre-tempo/certbot/conf/archive/time.lsltgroup.es/
├── fullchain1.pem
├── privkey1.pem
├── cert1.pem
└── chain1.pem
```

---

## 💾 BACKUP LOCATIONS

**Most Recent Backup (Verified Working):**

```
/opt/torre-tempo-backup-20260202-171214/certbot/conf/
```

**All Available Backups (10+ locations):**

```bash
/opt/torre-tempo-backup-20260202-171214/
/opt/torre-tempo-backup-20260202-170231/
/opt/torre-tempo-backup-20260202-165535/
/opt/torre-tempo-backup-20260202-164517/
/opt/torre-tempo-backup-20260202-164401/
/opt/torre-tempo-backup-20260202-164149/
/opt/torre-tempo-backup-20260202-120820/
/opt/torre-tempo-backup-20260202-120300/
/opt/torre-tempo-backup-20260202-115944/
/opt/torre-tempo-backup-20260202-115648/
```

**Backup Structure:**

```
certbot/
├── conf/
│   ├── live/time.lsltgroup.es/
│   │   ├── fullchain.pem (symlink)
│   │   ├── privkey.pem (symlink)
│   │   ├── cert.pem (symlink)
│   │   └── chain.pem (symlink)
│   └── archive/time.lsltgroup.es/
│       ├── fullchain1.pem (actual file)
│       ├── privkey1.pem (actual file)
│       ├── cert1.pem (actual file)
│       └── chain1.pem (actual file)
└── www/ (ACME challenge webroot)
```

---

## 🐳 DOCKER CONFIGURATION

### Volume Mounts (docker-compose.prod.yml)

**Nginx Container:**

```yaml
volumes:
  - ./certbot/conf:/etc/letsencrypt:ro # Read-only certificate mount
  - ./certbot/www:/var/www/certbot:ro # ACME challenge webroot
```

**Certbot Container:**

```yaml
volumes:
  - ./certbot/conf:/etc/letsencrypt # Read-write for certificate renewal
  - ./certbot/www:/var/www/certbot # ACME challenge webroot
```

### Container Paths

- **Nginx sees certificates at:** `/etc/letsencrypt/live/time.lsltgroup.es/`
- **Certbot manages certificates at:** `/etc/letsencrypt/`
- **Host filesystem location:** `/opt/torre-tempo/certbot/conf/`

---

## 📝 NGINX CONFIGURATION

**Config File:**

```
/opt/torre-tempo/nginx/nginx.prod.conf
```

**SSL Certificate References (Lines 63-64):**

```nginx
ssl_certificate /etc/letsencrypt/live/time.lsltgroup.es/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/time.lsltgroup.es/privkey.pem;
```

**Docker Mount:**

```yaml
volumes:
  - ./nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
```

---

## 🔄 CERTIFICATE RESTORATION PROCEDURE

### If Certificates Are Lost:

**Method 1: Restore from Backup (FASTEST)**

```bash
ssh root@time.lsltgroup.es
cd /opt/torre-tempo

# Copy from most recent backup
cp -r /opt/torre-tempo-backup-20260202-171214/certbot/conf/* /opt/torre-tempo/certbot/conf/

# Restart Nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

**Method 2: Regenerate with Let's Encrypt**

```bash
ssh root@time.lsltgroup.es
cd /opt/torre-tempo

# Generate new certificate
docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@lsltgroup.es \
    --agree-tos \
    --no-eff-email \
    -d time.lsltgroup.es

# Restart Nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

---

## ✅ VERIFICATION COMMANDS

### Check Certificate Existence

```bash
ssh root@time.lsltgroup.es
ls -la /opt/torre-tempo/certbot/conf/live/time.lsltgroup.es/
```

### Verify Certificate Details

```bash
openssl x509 -in /opt/torre-tempo/certbot/conf/live/time.lsltgroup.es/fullchain.pem -noout -dates -subject
```

### Test HTTPS Endpoint

```bash
curl -I https://time.lsltgroup.es/health
```

### Check Nginx SSL Configuration

```bash
docker exec torre-tempo-nginx-prod nginx -t
```

---

## 🔍 TROUBLESHOOTING CHECKLIST

**If HTTPS is down:**

1. **Check certificate files exist:**

   ```bash
   ssh root@time.lsltgroup.es "ls -la /opt/torre-tempo/certbot/conf/live/time.lsltgroup.es/"
   ```

2. **Check Nginx container:**

   ```bash
   docker ps | grep nginx
   docker logs torre-tempo-nginx-prod --tail 50
   ```

3. **Check Nginx config:**

   ```bash
   docker exec torre-tempo-nginx-prod nginx -t
   docker exec torre-tempo-nginx-prod cat /etc/nginx/nginx.conf | head -100
   ```

4. **Check Docker volume mount:**

   ```bash
   docker inspect torre-tempo-nginx-prod | grep -A 20 'Mounts'
   ```

5. **Restore from backup if missing:**
   ```bash
   cp -r /opt/torre-tempo-backup-20260202-171214/certbot/conf/* /opt/torre-tempo/certbot/conf/
   docker-compose -f docker-compose.prod.yml down nginx
   docker-compose -f docker-compose.prod.yml up -d nginx
   ```

---

## 📊 CERTIFICATE INFORMATION

**Domain:** time.lsltgroup.es  
**Issuer:** Let's Encrypt  
**Validity:** 90 days  
**Last Issued:** February 2, 2026  
**Auto-Renewal:** ✅ Enabled (Certbot container checks every 12 hours)  
**Renewal Threshold:** 30 days before expiration

---

## 🚨 INCIDENT LOG

### 2026-02-04: Certificate Loss & Restoration

**Issue:** SSL certificates missing from `/opt/torre-tempo/certbot/conf/`  
**Cause:** Unknown (possibly overwritten during deployment)  
**Resolution:** Restored from backup `/opt/torre-tempo-backup-20260202-171214/`  
**Time to Resolve:** ~10 minutes  
**Impact:** Site was accessible via HTTP but HTTPS was down

**Restoration Commands Used:**

```bash
cp -r /opt/torre-tempo-backup-20260202-171214/certbot/conf/* /opt/torre-tempo/certbot/conf/
docker-compose -f docker-compose.prod.yml down nginx
docker-compose -f docker-compose.prod.yml up -d nginx
```

**Verified Working:**

```bash
curl -I https://time.lsltgroup.es/health
# HTTP/2 200 ✅
```

---

## 📚 RELATED DOCUMENTATION

- `SSL-SETUP-COMPLETE.md` - Initial SSL setup guide
- `docker-compose.prod.yml` - Production Docker configuration
- `nginx/nginx.prod.conf` - Nginx SSL configuration
- `deploy.sh` - Automated deployment script with SSL setup
- `AGENTS.md` - Developer knowledge base

---

**🔒 CRITICAL: Keep this document updated whenever certificate locations or procedures change.**
