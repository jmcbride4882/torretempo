# Torre Tempo - PWA Icons

## Current Status

The PWA uses `icon.svg` as the base icon. For full PWA support, PNG icons need to be generated.

## Quick Solution: Use SVG Directly (Current)

The manifest and HTML currently reference `icon.svg` which works in most modern browsers. However, for full compatibility (especially older Android devices), PNG icons are recommended.

## Generate PNG Icons (Optional but Recommended)

### Option 1: Online Converter (Easiest)
1. Go to https://realfavicongenerator.net/
2. Upload `icon.svg`
3. Download the generated icons
4. Replace in `public/` directory:
   - `icon-192.png` (192x192)
   - `icon-512.png` (512x512)

### Option 2: Using ImageMagick (Command Line)
```bash
# Install ImageMagick first
# Windows: choco install imagemagick
# Mac: brew install imagemagick
# Linux: apt-get install imagemagick

# Generate icons
convert icon.svg -resize 192x192 icon-192.png
convert icon.svg -resize 512x512 icon-512.png
```

### Option 3: Using Node.js Script
```bash
# Install sharp library
npm install --save-dev sharp

# Run generation script (see below)
node generate-icons.js
```

## Icon Sizes Needed

- **192x192** - Standard PWA icon
- **512x512** - High-res PWA icon
- **180x180** - Apple Touch Icon (optional)
- **32x32** - Favicon (optional)
- **16x16** - Favicon (optional)

## Update Manifest After Generation

Once PNG icons are generated, update `manifest.json`:

```json
{
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

## Testing PWA

### Desktop (Chrome/Edge)
1. Open DevTools → Application → Manifest
2. Check if manifest loads correctly
3. Click "Add to Home Screen"

### Mobile (Android)
1. Visit site in Chrome
2. Tap menu → "Add to Home screen"
3. Icon should appear on home screen

### iOS (Safari)
1. Visit site in Safari
2. Tap Share → "Add to Home Screen"
3. Icon should appear on home screen

## Current Fallback

If PNG icons are not generated, the app will fall back to `icon.svg` which is supported by:
- ✅ Chrome 80+
- ✅ Edge 80+
- ✅ Firefox 65+
- ✅ Safari 13+
- ⚠️ Older Android devices may show generic icon

## Production Checklist

- [ ] Generate PNG icons (192x192, 512x512)
- [ ] Update manifest.json to reference PNG icons
- [ ] Test "Add to Home Screen" on Android
- [ ] Test "Add to Home Screen" on iOS
- [ ] Verify icons display correctly
- [ ] Test offline functionality
- [ ] Verify service worker registration

## Notes

The SVG icon uses Torre Tempo's brand gradient (#6366f1 → #8b5cf6) and features a clock design representing time management functionality.
