# Torre Tempo - Progressive Web App (PWA)

## ✅ PWA Features Implemented

Torre Tempo is now a fully-functional Progressive Web App with the following features:

### 🎯 Core PWA Features

1. **Installable**
   - Users can install the app on their home screen
   - Works on Android, iOS, Windows, macOS, Linux
   - Custom install prompt with dismiss functionality

2. **Offline Capable**
   - Service worker caches static assets
   - Offline fallback page (`/offline.html`)
   - Network-first strategy for API calls
   - Cache-first strategy for static assets

3. **Mobile-First Design**
   - Responsive layout optimized for mobile devices
   - Touch-friendly UI (44px minimum tap targets)
   - Fast loading on 3G networks
   - Smooth animations and transitions

4. **Native App Experience**
   - Standalone display mode (no browser chrome)
   - Custom theme colors (#6366f1)
   - Branded splash screen (via manifest)
   - App shortcuts for quick actions

5. **Modern Web Standards**
   - Service Worker API
   - Web App Manifest
   - Cache API
   - Background Sync (ready for implementation)
   - Push Notifications (ready for implementation)

---

## 📁 PWA File Structure

```
apps/web/
├── public/
│   ├── manifest.json         # Web app manifest
│   ├── sw.js                 # Service worker
│   ├── icon.svg              # App icon (SVG)
│   ├── offline.html          # Offline fallback page
│   ├── robots.txt            # SEO configuration
│   ├── browserconfig.xml     # Microsoft tiles config
│   └── README-ICONS.md       # Icon generation guide
├── src/
│   ├── utils/
│   │   └── serviceWorkerRegistration.ts  # SW registration
│   └── components/
│       ├── InstallPrompt.tsx   # Install banner
│       └── InstallPrompt.css
├── index.html                # PWA meta tags
└── generate-icons.js         # Icon generation script
```

---

## 🚀 Installation

### For Users

#### Android (Chrome/Edge)
1. Visit https://time.lsltgroup.es
2. Tap the "Install" button in the banner, OR
3. Tap menu (⋮) → "Add to Home screen"
4. App icon appears on home screen
5. Launch like any native app

#### iOS (Safari)
1. Visit https://time.lsltgroup.es
2. Tap Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Customize name if desired
5. Tap "Add"

#### Desktop (Chrome/Edge/Brave)
1. Visit https://time.lsltgroup.es
2. Click install icon in address bar (⊕), OR
3. Click menu → "Install Torre Tempo..."
4. App opens in standalone window

---

## 🔧 Development

### Service Worker

The service worker (`public/sw.js`) provides:

- **Caching Strategy**: Cache-first for static assets, network-first for API
- **Version Management**: Automatic cleanup of old caches
- **Offline Support**: Fallback to `/offline.html` when offline
- **Auto-Update**: Checks for updates every hour

### Manifest Configuration

`public/manifest.json` defines:

```json
{
  "name": "Torre Tempo - Control de Jornada Laboral",
  "short_name": "Torre Tempo",
  "display": "standalone",
  "theme_color": "#6366f1",
  "background_color": "#1e293b",
  "icons": [...],
  "shortcuts": [...]
}
```

### Install Prompt

`InstallPrompt.tsx` component:

- Listens for `beforeinstallprompt` event
- Shows custom install banner
- Dismissal stored in localStorage (7-day cooldown)
- Only shown to users who haven't installed
- Mobile-responsive design

---

## 📱 Testing PWA

### Lighthouse Audit

```bash
# Run Lighthouse PWA audit
npm run lighthouse

# Or manually in Chrome DevTools:
# 1. Open DevTools
# 2. Go to "Lighthouse" tab
# 3. Check "Progressive Web App"
# 4. Click "Generate report"
```

**Target Scores:**
- ✅ PWA Score: 100/100
- ✅ Installable: Pass
- ✅ Works Offline: Pass
- ✅ Service Worker: Registered
- ✅ Manifest: Valid

### Manual Testing Checklist

- [ ] **Installability**
  - [ ] Install prompt appears
  - [ ] App can be installed on Android
  - [ ] App can be installed on iOS
  - [ ] App can be installed on Desktop
  - [ ] Icon displays correctly on home screen

- [ ] **Offline Functionality**
  - [ ] App loads when offline (after first visit)
  - [ ] Offline page appears for network requests
  - [ ] Cached pages work without internet
  - [ ] API requests fail gracefully

- [ ] **Service Worker**
  - [ ] Service worker registers successfully
  - [ ] Old caches are cleaned up on update
  - [ ] Console shows SW lifecycle events
  - [ ] Updates prompt user to reload

- [ ] **Mobile UX**
  - [ ] 44px minimum tap targets
  - [ ] Smooth scrolling
  - [ ] No horizontal scroll
  - [ ] Theme color applied to browser UI
  - [ ] Standalone mode (no browser chrome)

- [ ] **Performance**
  - [ ] First Contentful Paint < 2s
  - [ ] Time to Interactive < 3.5s
  - [ ] Loads on 3G networks
  - [ ] No layout shifts

---

## 🎨 Icons & Branding

### Current Status

The app currently uses `icon.svg` as the base icon. This works in modern browsers but PNG icons are recommended for full compatibility.

### Generate PNG Icons

```bash
# Option 1: Using Node.js script
npm install --save-dev sharp
node generate-icons.js

# Option 2: Online converter
# Visit https://realfavicongenerator.net/
# Upload public/icon.svg
# Download generated icons

# Option 3: ImageMagick
convert public/icon.svg -resize 192x192 public/icon-192.png
convert public/icon.svg -resize 512x512 public/icon-512.png
```

### Icon Sizes

- **192x192** - Standard PWA icon
- **512x512** - High-res PWA icon
- **180x180** - Apple Touch Icon
- **32x32** - Favicon
- **16x16** - Favicon

See `public/README-ICONS.md` for detailed instructions.

---

## 🔄 Update Strategy

### Service Worker Updates

When you deploy a new version:

1. Service worker detects new version
2. Downloads and installs new SW in background
3. Prompts user: "Nueva versión disponible. ¿Actualizar ahora?"
4. If accepted: `skipWaiting()` + page reload
5. If declined: Update on next app launch

### Force Update

```javascript
// In browser console:
navigator.serviceWorker.getRegistration()
  .then(reg => reg.update());
```

### Clear Cache

```javascript
// In browser console:
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

---

## 📊 Analytics & Monitoring

### Service Worker Events

All SW events are logged to console:

```
[SW] Installing service worker...
[SW] Service worker installed
[SW] Activating service worker...
[SW] Service worker activated
[SW] Serving from cache: /index.html
[SW] Fetching from network: /api/v1/employees
```

### Useful Metrics

- Installation rate: Track `beforeinstallprompt` → `appinstalled`
- Offline usage: Track SW fetch events when `navigator.onLine === false`
- Update acceptance: Track user responses to update prompt

---

## 🐛 Troubleshooting

### Service Worker Not Registering

```bash
# Check browser support
if ('serviceWorker' in navigator) {
  console.log('✅ Service Worker supported');
} else {
  console.log('❌ Service Worker NOT supported');
}
```

**Common Issues:**
- Not running on HTTPS (required for SW)
- Service worker file not in `/public`
- MIME type error (must be `text/javascript`)
- Browser cache preventing update

### Install Prompt Not Showing

**Requirements:**
- HTTPS connection
- Valid manifest.json
- Service worker registered
- Not already installed
- Meets PWA criteria (Lighthouse)

**Check:**
```javascript
// In DevTools → Application → Manifest
// Should show "App can be installed"
```

### Offline Page Not Working

**Verify:**
1. Service worker active
2. `/offline.html` cached
3. Network requests failing (check Network tab)
4. SW fetch handler catching errors

---

## 🚀 Future Enhancements

### Planned Features

1. **Background Sync**
   - Sync time entries when back online
   - Queue clock in/out events
   - Retry failed requests

2. **Push Notifications**
   - Shift reminders
   - Leave request approvals
   - Clock in/out notifications

3. **Share Target API**
   - Share files to app
   - Quick time entry creation

4. **Periodic Background Sync**
   - Auto-sync data in background
   - Keep app data fresh

5. **App Shortcuts**
   - Quick actions from home screen
   - Jump to specific pages

---

## 📚 Resources

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Workbox (Advanced SW)](https://developers.google.com/web/tools/workbox)

---

## ✅ Production Checklist

Before deploying PWA to production:

- [ ] Generate PNG icons (192x192, 512x512)
- [ ] Update manifest.json to reference PNG icons
- [ ] Test install on Android Chrome
- [ ] Test install on iOS Safari
- [ ] Test install on Desktop Chrome
- [ ] Run Lighthouse audit (score 90+)
- [ ] Test offline functionality
- [ ] Verify service worker registration
- [ ] Test update flow
- [ ] Verify theme colors on all platforms
- [ ] Check favicon displays correctly
- [ ] Test app shortcuts
- [ ] Verify robots.txt
- [ ] Monitor SW console logs

---

## 🎉 Deployment

PWA features are automatically enabled on:

**Production:** https://time.lsltgroup.es

**Requirements:**
- ✅ HTTPS enabled (via Let's Encrypt)
- ✅ Service worker served from root
- ✅ Manifest.json accessible
- ✅ Icons available in `/public`
- ✅ Offline page cached

**Test Installation:**
1. Visit site on mobile device
2. Look for install prompt
3. Tap "Install"
4. Launch from home screen
5. Verify standalone mode

---

**Need Help?** Check DevTools → Application tab for PWA status and debugging.
