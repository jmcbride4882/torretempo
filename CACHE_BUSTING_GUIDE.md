# 🚀 Torre Tempo v3.0 - Nuclear Cache Busting Deployment

**Date:** 2026-02-02 18:50  
**Version:** 3.0.0-20260202-1820  
**Status:** ✅ Deployed to Production

---

## 🎯 What Was Fixed

### The Problem

- **Service Worker** was aggressively caching old JS/CSS files
- **Browser cache** kept serving stale `index.html` despite server updates
- **Mobile devices** showed old code (day tabs instead of week grid)
- **Cache headers** were too aggressive on HTML files

### The Solution (3-Tier Nuclear Cache Busting)

#### 1️⃣ **Service Worker v3.0 - Network-First Strategy**

- **Old behavior:** Cache-first (serve stale cache even when online)
- **New behavior:** Network-first (always try fresh fetch, cache only as offline fallback)
- **Cache scope:** ONLY static assets (icons, manifest) - NOT HTML/JS/CSS
- **Cache name:** `torre-tempo-v3.0-20260202-1820` (forces cache invalidation)

#### 2️⃣ **Nginx Headers - Aggressive No-Cache for HTML**

- **HTML files:** `Cache-Control: no-cache, no-store, must-revalidate`
- **Hashed assets** (e.g., `index-CtTeXesV.js`): 1 year cache (safe because hash changes)
- **Static assets** (images, fonts): 30 days cache

#### 3️⃣ **App-Level Cache Clearer - Version Check on Load**

- **Checks:** `localStorage.getItem("app_version")` vs current version
- **On version change:**
  1. Deletes ALL browser caches (`caches.delete()`)
  2. Unregisters ALL service workers
  3. Updates stored version
  4. Registers new service worker v3.0

---

## 📋 Testing Instructions (CRITICAL - Follow Exactly)

### **Option A: Nuclear Cache Clear (Recommended First)**

**On Mobile Chrome:**

1. Open Chrome settings (⋮ → Settings)
2. Navigate to **Privacy and security** → **Clear browsing data**
3. Select **"All time"** time range
4. Check ALL boxes:
   - ✅ Browsing history
   - ✅ Cookies and site data
   - ✅ Cached images and files
5. Tap **"Clear data"**
6. **Close ALL tabs** with `time.lsltgroup.es`
7. **Force-close Chrome** (swipe away from recent apps)
8. **Restart Chrome** (fresh launch)
9. Navigate to: `https://time.lsltgroup.es/scheduling`

**Expected Result:**

- Console shows: `🔄 Version change detected: null → 3.0.0-20260202-1820`
- Console shows: `🗑️ Deleted cache: torre-tempo-v2.1-20260202-1800` (and others)
- Console shows: `✅ Service Worker v3 registered`
- **Mobile view:** Horizontal scrolling grid with employee names (NO day tabs)

---

### **Option B: Force Refresh (If Nuclear Fails)**

**On Mobile Chrome:**

1. Navigate to: `https://time.lsltgroup.es/scheduling`
2. Tap address bar → Tap "⋮" menu
3. Tap **"Desktop site"** checkbox ON
4. Wait for page reload
5. Tap **"Desktop site"** checkbox OFF
6. Force refresh: Pull down to refresh

**Expected Result:**

- Week grid visible with horizontal scroll

---

### **Option C: Incognito Mode (Verification Test)**

**On Mobile Chrome:**

1. Open new **Incognito tab**
2. Navigate to: `https://time.lsltgroup.es`
3. Login with: `admin@torretempo.com` / `admin123` / tenant: `demo`
4. Go to **Scheduling** page

**Expected Result:**

- Week grid shows immediately (proves server has latest code)

---

## 🔍 Verification Checklist

### ✅ Server-Side Verification (Already Confirmed)

```bash
# 1. Correct JS file deployed
ssh root@time.lsltgroup.es "cat /opt/torre-tempo/apps/web/dist/index.html | grep 'index-.*\.js'"
# Output: index-CtTeXesV.js ✅

# 2. Service worker updated
ssh root@time.lsltgroup.es "head -n 5 /opt/torre-tempo/apps/web/dist/sw.js"
# Output: Version 3.0.0 - NUCLEAR CACHE BUSTING ✅

# 3. Nginx headers applied
ssh root@time.lsltgroup.es "curl -I https://time.lsltgroup.es/ 2>&1 | grep -i cache"
# Output: cache-control: no-cache, no-store, must-revalidate ✅
```

### 📱 Client-Side Verification (User Must Test)

**Open Browser DevTools Console:**

1. Navigate to `https://time.lsltgroup.es/scheduling`
2. Open DevTools (Chrome: Settings → More tools → Developer tools)
3. Go to **Console** tab

**Expected Console Logs:**

```
🔄 Version change detected: <old-version> → 3.0.0-20260202-1820
🗑️ Deleted cache: torre-tempo-v2.1-20260202-1800
🗑️ Unregistered service worker
✅ Updated app version to 3.0.0-20260202-1820
✅ Service Worker v3 registered: https://time.lsltgroup.es/
```

**Check Network Tab:**

1. Open DevTools → **Network** tab
2. Reload page
3. Find `index-CtTeXesV.js` request
4. Check **Size** column: should show file size (e.g., `196 KB`), NOT `(memory cache)` or `(disk cache)`

**Check Application Tab:**

1. Open DevTools → **Application** tab
2. Expand **Service Workers**
3. Should show: `https://time.lsltgroup.es/sw.js` - **Status: activated and is running**
4. Expand **Cache Storage**
5. Should show: `torre-tempo-v3.0-20260202-1820` (ONLY this version)
6. Click it → should ONLY contain: `manifest.json`, `icon.svg` (NOT index.html or JS files)

---

## 🐛 Troubleshooting

### Problem: Still seeing day tabs (old code)

**Diagnosis:**

```javascript
// Open DevTools Console and run:
localStorage.getItem("app_version");
// If it returns "3.0.0-20260202-1820" → cache clear worked but CSS not loading
// If it returns old version or null → cache clear didn't trigger
```

**Solution 1: Manual Cache Clear**

```javascript
// Run in DevTools Console:
localStorage.setItem("app_version", "0.0.0-old");
location.reload();
// This forces version mismatch → triggers cache clear
```

**Solution 2: Unregister Service Worker Manually**

```javascript
// Run in DevTools Console:
navigator.serviceWorker.getRegistrations().then((regs) => {
  regs.forEach((reg) => reg.unregister());
  console.log("✅ Unregistered all service workers");
  location.reload();
});
```

**Solution 3: Clear Caches Manually**

```javascript
// Run in DevTools Console:
caches.keys().then((names) => {
  names.forEach((name) => caches.delete(name));
  console.log("✅ Cleared all caches");
  location.reload();
});
```

---

### Problem: Network tab shows `(disk cache)` for JS files

**Diagnosis:**

- Browser is still using cached JS despite no-cache headers
- Service worker might be interfering

**Solution:**

1. Open DevTools → **Application** tab → **Service Workers**
2. Click **"Unregister"** next to service worker
3. Click **"Update on reload"** checkbox
4. Reload page (Ctrl+Shift+R or Cmd+Shift+R)

---

### Problem: Console shows old version number

**Diagnosis:**

- `localStorage` wasn't cleared properly

**Solution:**

```javascript
// Run in DevTools Console:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

---

## 📊 File Changes Summary

### Files Modified:

| File                    | Change                 | Purpose                 |
| ----------------------- | ---------------------- | ----------------------- |
| `apps/web/public/sw.js` | Network-first strategy | Stop aggressive caching |
| `apps/web/src/main.tsx` | Version check on load  | Auto cache clear        |
| `apps/web/index.html`   | Version bump (3.0.0)   | Force reload            |
| `nginx/nginx.prod.conf` | No-cache for HTML      | Prevent HTML caching    |

### Deployed Assets:

| File                 | Hash     | Size      |
| -------------------- | -------- | --------- |
| `index.html`         | N/A      | 3.39 KB   |
| `index-CtTeXesV.js`  | CtTeXesV | 685.32 KB |
| `index-IF0Spz1N.css` | IF0Spz1N | 67.38 KB  |
| `sw.js`              | v3.0.0   | Updated   |

---

## 🎯 Expected Behavior After Fix

### Mobile Scheduling Page:

**OLD (Before Fix):**

```
┌─────────────────────────┐
│  [lun 2] [mar 3] [mié 4]│ ← Day selector tabs
├─────────────────────────┤
│  👤 John McBride        │
│  08:00 - 16:00          │
│  [View Details]         │
├─────────────────────────┤
│  👤 Jane Doe            │
│  09:00 - 17:00          │
│  [View Details]         │
└─────────────────────────┘
```

**NEW (After Fix):**

```
┌─────────────────────────────────────────┐
│ Week Grid (Horizontal Scroll)           │
├────────┬─────┬─────┬─────┬─────┬───────┤
│Employee│ Lun │ Mar │ Mié │ Jue │  ...  │
├────────┼─────┼─────┼─────┼─────┼───────┤
│ John   │08-16│08-16│08-16│ OFF │  ...  │
│ Jane   │09-17│09-17│09-17│09-17│  ...  │
└────────┴─────┴─────┴─────┴─────┴───────┘
         ← Swipe left/right →
```

---

## 🚨 If All Else Fails

### Last Resort: Server-Side Force Reload

**Change app version in code:**

```javascript
// apps/web/src/main.tsx
const APP_VERSION = "3.0.1-20260202-1900"; // Increment version
```

**Rebuild and deploy:**

```bash
cd apps/web && npm run build
scp -r dist/* root@time.lsltgroup.es:/opt/torre-tempo/apps/web/dist/
ssh root@time.lsltgroup.es "cd /opt/torre-tempo && docker-compose -f docker-compose.prod.yml restart web nginx"
```

This will force ALL clients to detect version change and clear cache.

---

## 📞 Support

If issues persist after ALL troubleshooting steps:

1. **Screenshot:** Console logs showing version number
2. **Screenshot:** Network tab showing cached resources
3. **Screenshot:** Application tab showing service workers + caches
4. **Screenshot:** Actual page view (day tabs or week grid?)

**Contact:** John McBride - [LSLT Apps](https://lsltapps.com)

---

**🎉 Cache busting deployed successfully! Users should now see the week grid on mobile.**
