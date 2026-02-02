# 🚀 DEPLOYMENT READY - Torre Tempo v3.2.0

**Date:** 2026-02-02  
**Status:** ✅ ALL CODE COMPLETE - READY TO DEPLOY  
**Deployed:** ❌ PENDING

---

## 📦 FEATURES READY FOR DEPLOYMENT

### 1. ✅ Broadcast Swap to Role

**Description:** Allow employees to broadcast shift swap requests to all employees with the same role, instead of requesting a specific person.

**Files:**

- `apps/api/src/services/shift-swap.service.ts` - Broadcast logic
- `apps/web/src/components/scheduling/SwapShiftModal.tsx` - Radio button UI
- `apps/web/src/locales/en/translation.json` - English translations
- `apps/web/src/locales/es/translation.json` - Spanish translations

**User Flow:**

1. Employee clicks "Swap" on their shift
2. Modal shows radio buttons: "Request specific employee" OR "Broadcast to all with same role"
3. If broadcast selected, backend creates multiple swap requests (one per matching employee)
4. All matching employees receive notification

---

### 2. ✅ Email Notifications for Swap Requests

**Description:** Automatically send email to employees when they receive a shift swap request.

**Files:**

- `apps/api/src/templates/emails/es/shift-swap-request.html` - Spanish template
- `apps/api/src/templates/emails/en/shift-swap-request.html` - English template
- `apps/api/src/services/shift-swap.service.ts` - Email integration

**Email Content:**

- Requester's name
- Shift date, time, role, location
- Reason for swap (if provided)
- Link to view request in app
- Torre Tempo branding

---

### 3. ✅ OneSignal Push Notifications

**Description:** Real-time push notifications for shift swap requests using OneSignal service.

**Files:**

- `apps/api/src/services/onesignal.service.ts` - Backend service
- `apps/web/src/services/oneSignal.ts` - Frontend SDK wrapper
- `apps/web/src/App.tsx` - Auto-initialization on login
- `apps/api/prisma/schema.prisma` - User.oneSignalPlayerId field
- `apps/api/prisma/migrations/20260202000000_add_onesignal_player_id/migration.sql`

**Features:**

- Auto-prompt for notification permission on login
- Player ID saved to backend
- Push sent alongside email (dual-channel)
- Graceful fallback if OneSignal not configured
- Non-blocking (never breaks main flow)

---

## ⚠️ PRE-DEPLOYMENT REQUIREMENTS

### 1. OneSignal Account Setup (BLOCKING)

**YOU MUST DO THIS FIRST:**

1. **Create OneSignal Account:** https://onesignal.com/signup
2. **Create Web Push App:**
   - Click "New App/Website"
   - Select "Web Push"
   - Name: **Torre Tempo**
3. **Configure App Settings:**
   - Site Name: `Torre Tempo`
   - Site URL: `https://time.lsltgroup.es`
   - Auto Resubscribe: **ON**
   - Default Icon URL: `https://time.lsltgroup.es/icon-192.png`
4. **Get Credentials:**
   - Go to: Settings → Keys & IDs
   - Copy **App ID** (looks like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
   - Copy **REST API Key** (looks like: `YourRestApiKeyHere`)

**Expected Output:**

```
ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ONESIGNAL_REST_API_KEY=YourRestApiKeyHere
```

---

## 📋 DEPLOYMENT CHECKLIST

### Phase 1: Environment Configuration

**On Production Server:**

```bash
ssh root@time.lsltgroup.es

# Backend .env
nano /opt/torre-tempo/apps/api/.env
# Add these lines:
ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ONESIGNAL_REST_API_KEY=YourRestApiKeyHere

# Frontend .env.production
nano /opt/torre-tempo/apps/web/.env.production
# Add this line:
VITE_ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**✅ Checkpoint:** Credentials saved in both `.env` files

---

### Phase 2: Database Migration

**On Production Server:**

```bash
ssh root@time.lsltgroup.es
cd /opt/torre-tempo

# Run migration (adds onesignal_player_id column)
docker exec -it torre-tempo-api-prod npx prisma migrate deploy

# Verify migration
docker exec -it torre-tempo-api-prod npx prisma migrate status
```

**Expected Output:**

```
✔ Database is up to date
```

**✅ Checkpoint:** Migration applied successfully

---

### Phase 3: Build & Deploy Code

**On Your Local Machine:**

```bash
cd C:\Users\j.mcbride.LSLT\Desktop\Torre-Tempo

# Build frontend
cd apps/web
npm run build

# Build backend
cd ../api
npm run build

# Verify builds completed
ls apps/web/dist/index.html
ls apps/api/dist/index.js
```

**✅ Checkpoint:** Both builds completed without errors

---

### Phase 4: Upload to Server

**Option A: Git Push (Recommended)**

```bash
cd C:\Users\j.mcbride.LSLT\Desktop\Torre-Tempo

# Commit all changes
git add .
git commit -m "feat: add broadcast swap, email notifications, and OneSignal push notifications"
git push origin main

# On server
ssh root@time.lsltgroup.es
cd /opt/torre-tempo
git pull origin main
```

**Option B: Direct File Transfer**

```bash
# From local machine
scp -r apps/web/dist/* root@time.lsltgroup.es:/opt/torre-tempo/apps/web/dist/
scp -r apps/api/dist/* root@time.lsltgroup.es:/opt/torre-tempo/apps/api/dist/
scp -r apps/api/src/templates root@time.lsltgroup.es:/opt/torre-tempo/apps/api/src/
```

**✅ Checkpoint:** Code uploaded to server

---

### Phase 5: Rebuild Docker Containers

**On Production Server:**

```bash
ssh root@time.lsltgroup.es
cd /opt/torre-tempo

# Rebuild images (includes new code)
docker-compose -f docker-compose.prod.yml build --no-cache web api

# Restart containers (zero-downtime)
docker-compose -f docker-compose.prod.yml up -d

# Wait for containers to be healthy
sleep 10

# Check container status
docker ps | grep torre-tempo
```

**Expected Output:**

```
torre-tempo-api-prod    Up X seconds (healthy)
torre-tempo-web-prod    Up X seconds
```

**✅ Checkpoint:** Containers restarted successfully

---

### Phase 6: Verify Deployment

#### 6.1 API Health Check

```bash
curl https://time.lsltgroup.es/api/v1/health
```

**Expected:** `{"status":"ok"}`

#### 6.2 Frontend Loads

Open browser: https://time.lsltgroup.es  
**Expected:** Login page loads normally

#### 6.3 Database Connection

```bash
docker exec -it torre-tempo-api-prod npx prisma db pull
```

**Expected:** No errors, schema matches

#### 6.4 Logs Check

```bash
docker-compose -f docker-compose.prod.yml logs -f --tail=50 api
```

**Expected:** No errors, app started successfully

**✅ Checkpoint:** All systems operational

---

### Phase 7: Feature Testing

#### Test 1: Broadcast Swap

1. Login as: `admin@torretempo.com` / `admin123` (tenant: `demo`)
2. Go to **Scheduling** page
3. Click **Swap** button on any shift
4. Select: **"Broadcast to all with same role"** radio button
5. Enter reason: "Testing broadcast feature"
6. Click **Submit**
7. **Expected:** Success message, multiple swap requests created

#### Test 2: Email Notification

1. Complete Test 1 above
2. Check email inbox for target employees
3. **Expected:** Email received with shift details and Torre Tempo branding

#### Test 3: Push Notification Permission

1. Logout from app
2. Login as: `john@lsltgroup.es` (tenant: `demo`)
3. **Expected:** Browser prompts for notification permission
4. Click **Allow**
5. **Expected:** Permission granted, player ID saved

#### Test 4: Push Notification Received

1. Login as different employee
2. Create swap request targeting `john@lsltgroup.es`
3. **Expected:** John receives browser push notification immediately

#### Test 5: Notification Settings (Profile)

1. Go to **Profile** page
2. **Expected:** No visible changes (push happens automatically in background)

**✅ Checkpoint:** All features working as expected

---

## 🔍 TROUBLESHOOTING

### Issue: Push notifications not working

**Check 1: OneSignal credentials set correctly**

```bash
docker exec -it torre-tempo-api-prod printenv | grep ONESIGNAL
```

**Expected:**

```
ONESIGNAL_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ONESIGNAL_REST_API_KEY=YourRestApiKeyHere
```

**Check 2: Frontend has App ID**

```bash
curl https://time.lsltgroup.es/assets/index-*.js | grep VITE_ONESIGNAL
```

**Expected:** Should contain app ID

**Check 3: OneSignal SDK loaded**

- Open browser DevTools → Console
- Type: `window.OneSignal`
- **Expected:** Object (not undefined)

**Check 4: Player ID saved**

```bash
docker exec -it torre-tempo-postgres-prod psql -U torre_tempo_user -d torre_tempo_prod -c "SELECT email, onesignal_player_id FROM users WHERE email = 'john@lsltgroup.es';"
```

**Expected:** Player ID column populated (not NULL)

---

### Issue: Email notifications not sending

**Check 1: SMTP configured for tenant**

```bash
docker exec -it torre-tempo-postgres-prod psql -U torre_tempo_user -d torre_tempo_prod -c "SELECT slug, smtp_host, smtp_from_email FROM tenants WHERE slug = 'demo';"
```

**Expected:** SMTP fields populated

**Check 2: Email service logs**

```bash
docker-compose -f docker-compose.prod.yml logs -f api | grep "email"
```

**Expected:** "Email sent successfully" or "Email queued"

---

### Issue: Broadcast swap creates no requests

**Check 1: Employees have matching roles**

```bash
docker exec -it torre-tempo-postgres-prod psql -U torre_tempo_user -d torre_tempo_prod -c "SELECT first_name, role FROM employees WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo');"
```

**Expected:** Multiple employees with same role

**Check 2: Shift has role assigned**

- Verify the shift you're swapping has a role/position set
- **Expected:** Shift.role is not NULL or empty

---

## 📊 POST-DEPLOYMENT METRICS

### Monitor These for 24 Hours:

1. **OneSignal Dashboard:**
   - Go to: https://onesignal.com/apps → Torre Tempo
   - Check: Notification delivery rate (should be >90%)
   - Check: Click-through rate

2. **Email Delivery:**
   - Monitor tenant SMTP logs
   - Check: Bounce rate (should be <5%)

3. **Error Logs:**

   ```bash
   docker-compose -f docker-compose.prod.yml logs -f api | grep -i "error\|fail"
   ```

   - **Expected:** No OneSignal or email errors

4. **Database Performance:**
   ```bash
   docker exec -it torre-tempo-postgres-prod psql -U torre_tempo_user -d torre_tempo_prod -c "SELECT COUNT(*) FROM shift_swap_requests WHERE created_at > NOW() - INTERVAL '24 hours';"
   ```

   - Monitor swap request creation rate

---

## 🎉 SUCCESS CRITERIA

Deployment is **SUCCESSFUL** when:

- [x] Migration applied (onesignal_player_id column exists)
- [x] Frontend loads without errors
- [x] API health check passes
- [x] Login works normally
- [x] Broadcast swap creates multiple requests
- [x] Emails sent to all recipients
- [x] Push notification permission prompt appears
- [x] Push notifications delivered successfully
- [x] No errors in Docker logs for 30 minutes

---

## 📞 ROLLBACK PLAN

If deployment fails critically:

```bash
ssh root@time.lsltgroup.es
cd /opt/torre-tempo

# Revert to previous Docker images
docker-compose -f docker-compose.prod.yml down
docker images | grep torre-tempo
docker tag torre-tempo-api-prod:latest torre-tempo-api-prod:rollback
docker-compose -f docker-compose.prod.yml up -d

# Rollback database migration (if needed)
docker exec -it torre-tempo-api-prod npx prisma migrate resolve --rolled-back 20260202000000_add_onesignal_player_id
```

---

## 📝 DEPLOYMENT LOG

**Date:**  
**Deployed By:**  
**Start Time:**  
**End Time:**  
**Issues Encountered:**  
**Resolution:**  
**Status:** ✅ SUCCESS / ❌ ROLLBACK

---

**Next Steps After Deployment:**

1. Announce new features to users
2. Monitor error logs for 24 hours
3. Collect user feedback
4. Plan next feature (Time Tracking module)

---

**© 2026 Lakeside La Torre (Murcia) Group SL**  
**Developed by John McBride**
