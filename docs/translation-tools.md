# Translation Management Tools & Best Practices

## 🎯 Current Situation

**Tool:** Manual JSON file editing  
**Languages:** English (en), Spanish (es)  
**Files:**

- Frontend: `apps/web/src/locales/{lang}/translation.json`
- Backend: `apps/api/src/locales/{lang}/translation.json`

**Pain Points:**

- ❌ Manual copy-paste between language files
- ❌ Easy to miss keys or create inconsistencies
- ❌ No validation for missing translations
- ❌ Hard to collaborate with translators (non-technical)
- ❌ No context for translators (what is "clockInOut"?)
- ❌ Version control conflicts in JSON files

---

## 🚀 Recommended Solutions (Best → Good)

### 1️⃣ **Tolgee** - Self-Hosted, Developer-Friendly (★★★★★)

**Best for:** Full control, privacy, Spanish compliance (GDPR)

#### Why Tolgee?

- ✅ **Self-hosted** - You control your data (critical for GDPR/LOPDGDD)
- ✅ **In-context editing** - Translators edit text directly in your app UI
- ✅ **Developer-friendly** - Git integration, works with i18next
- ✅ **Free & open-source** - No per-seat pricing
- ✅ **Machine translation** - DeepL, Google Translate, AWS built-in
- ✅ **Screenshot context** - Translators see where text appears
- ✅ **CLI tools** - Sync translations via command line

#### Setup:

```bash
# 1. Install Tolgee SDK
npm install @tolgee/react @tolgee/i18next

# 2. Run Tolgee server (Docker)
docker run -d \
  -p 8085:8080 \
  -e TOLGEE_AUTHENTICATION_ENABLED=true \
  -e TOLGEE_POSTGRES_HOST=postgres \
  -e TOLGEE_POSTGRES_PASSWORD=tolgee \
  tolgee/tolgee

# 3. Replace i18next init with Tolgee wrapper
```

**Code Changes:**

```typescript
// apps/web/src/i18n/index.ts (BEFORE)
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// apps/web/src/i18n/index.ts (AFTER)
import { Tolgee, DevTools, FormatSimple } from "@tolgee/react";
import { FormatIcu } from "@tolgee/format-icu";

const tolgee = Tolgee()
  .use(DevTools())
  .use(FormatSimple())
  .init({
    language: "es",
    apiUrl: process.env.VITE_TOLGEE_API_URL,
    apiKey: process.env.VITE_TOLGEE_API_KEY,
    // Fallback to local JSON in production
    staticData: {
      en: () => import("./locales/en/translation.json"),
      es: () => import("./locales/es/translation.json"),
    },
  });
```

**Workflow:**

1. Developer adds `<T keyName="schedule.myShiftsToday">My Shifts Today</T>` in code
2. Tolgee detects new key, marks as "needs translation"
3. Translator logs into Tolgee UI, sees screenshot + context
4. Translator provides Spanish translation
5. CLI syncs translations back to Git: `tolgee pull`

**Cost:** FREE (self-hosted)  
**Deployment:** Add Tolgee container to docker-compose.prod.yml

---

### 2️⃣ **Crowdin** - Full-Featured SaaS (★★★★☆)

**Best for:** Professional translation workflows, multiple languages

#### Why Crowdin?

- ✅ **Industry standard** - Used by Spotify, Facebook, Mozilla
- ✅ **Context screenshots** - Auto-captures where text appears
- ✅ **Translation memory** - Reuses past translations
- ✅ **Machine translation** - DeepL, Google, Microsoft built-in
- ✅ **Collaboration** - Invite translators, reviewers, proofreaders
- ✅ **GitHub integration** - Auto-creates PRs with translations
- ✅ **CLI** - `crowdin push` / `crowdin pull`

#### Setup:

```bash
# 1. Install Crowdin CLI
npm install -g @crowdin/cli

# 2. Create crowdin.yml config
cat > crowdin.yml <<EOF
project_id: "your-project-id"
api_token: "your-api-token"
files:
  - source: /apps/web/src/locales/en/translation.json
    translation: /apps/web/src/locales/%two_letters_code%/translation.json
  - source: /apps/api/src/locales/en/translation.json
    translation: /apps/api/src/locales/%two_letters_code%/translation.json
EOF

# 3. Upload source strings
crowdin upload sources

# 4. Download translations
crowdin download
```

**Workflow:**

1. Developer adds new keys to `en/translation.json`
2. Run `crowdin upload sources` (or auto-sync via GitHub Action)
3. Translator translates in Crowdin web UI
4. Run `crowdin download` to pull completed translations
5. Commit updated JSON files

**Pricing:**

- **FREE:** Open-source projects
- **$50/month:** 1 project, unlimited strings
- **$167/month:** 5 projects, unlimited strings

**Drawback:** Cloud-hosted (data leaves your infrastructure)

---

### 3️⃣ **Lokalise** - Enterprise-Grade (★★★★☆)

**Best for:** Large teams, advanced workflows, analytics

#### Why Lokalise?

- ✅ **Advanced features** - Translation analytics, quality checks
- ✅ **Screenshot context** - Auto-tag UI elements
- ✅ **Order translations** - Built-in marketplace for professional translators
- ✅ **CDN delivery** - Serve translations from edge locations
- ✅ **Git integration** - GitHub, GitLab, Bitbucket
- ✅ **CLI** - `lokalise2 file upload` / `lokalise2 file download`

**Pricing:**

- **$120/month:** Essential plan (3 users, 10k keys)
- **$270/month:** Professional plan (unlimited)

**Drawback:** Expensive, overkill for 2 languages

---

### 4️⃣ **SimpleLocalize** - Developer-First (★★★★☆)

**Best for:** Small teams, simple workflows, cost-conscious

#### Why SimpleLocalize?

- ✅ **Affordable** - $49/month for unlimited strings
- ✅ **CLI-first** - `simplelocalize upload` / `simplelocalize download`
- ✅ **Auto-translation** - DeepL, Google Translate built-in
- ✅ **i18next support** - Works with your current setup
- ✅ **No vendor lock-in** - Export to JSON anytime

**Setup:**

```bash
# Install CLI
npm install -g simplelocalize-cli

# Upload keys
simplelocalize upload \
  --apiKey YOUR_API_KEY \
  --uploadPath ./apps/web/src/locales/en/translation.json \
  --uploadFormat i18next

# Download translations
simplelocalize download \
  --apiKey YOUR_API_KEY \
  --downloadPath ./apps/web/src/locales \
  --downloadFormat i18next
```

**Pricing:** $49/month (all features)

---

### 5️⃣ **i18n-tasks** - CLI Automation (★★★☆☆)

**Best for:** Already happy with JSON files, just need validation

#### Why i18n-tasks?

- ✅ **FREE** - Open-source Ruby gem
- ✅ **Finds missing keys** - Scans code for unused/missing translations
- ✅ **Auto-translate** - Google Translate integration
- ✅ **No SaaS** - Runs locally in CI/CD

**Setup:**

```bash
# Install
npm install -g i18next-scanner

# Scan code for translation keys
i18next-scanner --config i18next-scanner.config.js 'apps/web/src/**/*.{ts,tsx}'

# Finds missing translations
```

**Config (`i18next-scanner.config.js`):**

```javascript
module.exports = {
  input: ["apps/web/src/**/*.{ts,tsx}"],
  output: "./apps/web/src/locales",
  options: {
    defaultLng: "en",
    lngs: ["en", "es"],
    ns: ["translation"],
    resource: {
      loadPath: "{{lng}}/{{ns}}.json",
      savePath: "{{lng}}/{{ns}}.json",
    },
  },
};
```

**Drawback:** No translation UI, still manual editing

---

### 6️⃣ **Google Sheets + Script** - DIY Approach (★★☆☆☆)

**Best for:** Non-technical translators, zero budget

#### Setup:

1. Export JSON to Google Sheets (columns: key, en, es)
2. Share sheet with translator
3. Script converts sheet back to JSON

**Pros:**

- ✅ FREE
- ✅ Familiar interface for translators
- ✅ Easy collaboration

**Cons:**

- ❌ Manual export/import
- ❌ No context for translators
- ❌ Prone to errors

---

## 🏆 **My Recommendation for Torre Tempo**

### 🚨 IMPORTANT: End-Users vs Translators

**Most tools charge for "translators" (people creating translations), NOT "end-users" (people viewing your app).**

- ✅ **1,000,000 app users** consuming translations = FREE (they just read JSON)
- 💰 **10 translators** editing translations = Paid tier on some platforms

**Your Requirements:**

- ❌ FREE (no monthly costs)
- ✅ Scalable to 1000s of users (SaaS multi-tenant)
- ✅ Only 2 languages (English/Spanish)

---

### Option A: **Current Approach (i18next + JSON)** ⭐ RECOMMENDED ⭐

**Why This Actually Scales:**

- ✅ **FREE forever** - No vendor fees, ever
- ✅ **Proven at scale** - Used by Netflix, Airbnb, Uber
- ✅ **Zero runtime cost** - Static JSON files bundled in build
- ✅ **CDN-friendly** - Serve from edge locations
- ✅ **No external dependencies** - App works offline
- ✅ **Fast** - No API calls, instant language switching

**What You Currently Have:**

```javascript
// JSON files loaded at build time
import en from "./locales/en/translation.json";
import es from "./locales/es/translation.json";

// Distributed to millions of users - zero extra cost
```

**Scale Testing:**

- 1 user downloads JSON → ~50KB (gzipped: ~10KB)
- 1,000,000 users → Same 50KB file (cached by browser + CDN)
- Cost: $0 (static file serving via Nginx/Cloudflare)

**This is ALREADY production-ready for unlimited users.**

---

### Option B: **Tolgee Self-Hosted** (If You Want Better DX)

**For Translation Management ONLY (not end-users):**

- ✅ FREE (self-hosted)
- ✅ In-context editing for developers
- ✅ Scales to millions of end-users
- ⚠️ Adds complexity (another container to manage)

**How Tolgee Works:**

```
Development: Tolgee server → In-context editing
Production:  Static JSON files → No Tolgee involved
```

**Production users NEVER hit Tolgee server** - they just load JSON files like normal.

**Cost:** $0 (only uses your existing VPS resources)

---

### Option C: **Crowdin Free Tier** (If Open-Source)

**IF you make Torre Tempo open-source:**

- ✅ FREE forever (open-source plan)
- ✅ Unlimited strings, unlimited users
- ✅ Machine translation included
- ❌ Requires public GitHub repo

**Your repo is currently private → NOT ELIGIBLE**

---

## ✅ **FINAL RECOMMENDATION: Stick with Current Approach + Add Tooling**

**Your current setup (i18next + JSON) is PERFECT for 1000s of users.**

### Why Change Nothing?

1. **Scales infinitely** - Static files are the most scalable solution
2. **FREE forever** - No per-user, per-string, or per-month fees
3. **Fast** - Translations loaded instantly from local bundle
4. **Reliable** - No external API that can go down
5. **Offline-friendly** - PWA works without internet

### Just Add These Developer Tools (All FREE):

#### 1. **Validation Script** (Prevents Missing Translations)

```bash
# Runs in CI/CD, blocks broken translations
npm run i18n:validate
```

#### 2. **VS Code i18n Ally** (Better Developer Experience)

- Inline preview of translations
- Missing key detection
- Edit translations in sidebar
- Auto-translate with Google/DeepL

#### 3. **GitHub Action** (Auto-Check PRs)

```yaml
# Fails PR if translations are out of sync
- name: Validate translations
  run: npm run i18n:validate
```

**Total Cost: $0**  
**Setup Time: 30 minutes**  
**Scales to: ∞ users**

---

## 🛠️ Quick Wins (No Tool Changes)

### 1. **Add Translation Validation Script**

```bash
# scripts/validate-translations.js
const fs = require('fs');
const path = require('path');

const enFile = require('../apps/web/src/locales/en/translation.json');
const esFile = require('../apps/web/src/locales/es/translation.json');

function flattenObject(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, key) => {
    const pre = prefix.length ? `${prefix}.` : '';
    if (typeof obj[key] === 'object') {
      Object.assign(acc, flattenObject(obj[key], `${pre}${key}`));
    } else {
      acc[`${pre}${key}`] = obj[key];
    }
    return acc;
  }, {});
}

const enKeys = Object.keys(flattenObject(enFile));
const esKeys = Object.keys(flattenObject(esFile));

const missingInSpanish = enKeys.filter((key) => !esKeys.includes(key));
const missingInEnglish = esKeys.filter((key) => !enKeys.includes(key));

if (missingInSpanish.length > 0) {
  console.error('❌ Missing in Spanish:', missingInSpanish);
  process.exit(1);
}

if (missingInEnglish.length > 0) {
  console.error('❌ Missing in English:', missingInEnglish);
  process.exit(1);
}

console.log('✅ All translations in sync!');
```

**Add to package.json:**

```json
{
  "scripts": {
    "i18n:validate": "node scripts/validate-translations.js"
  }
}
```

**Run in CI/CD:**

```yaml
# .github/workflows/ci.yml
- name: Validate translations
  run: npm run i18n:validate
```

---

### 2. **Add Type Safety for Translation Keys**

```typescript
// apps/web/src/types/i18n.ts
import type en from "../locales/en/translation.json";

export type TranslationKeys = keyof typeof en;

// Usage (now you get autocomplete!)
const { t } = useTranslation();
t("schedule.myShiftsToday"); // ✅ Autocomplete + type checking
t("schedule.invalidKey"); // ❌ TypeScript error
```

---

### 3. **VS Code Extension: i18n Ally**

Install: [i18n Ally](https://marketplace.visualstudio.com/items?itemName=lokalise.i18n-ally)

**Features:**

- Inline preview of translations in code
- Missing key detection
- Edit translations in VS Code
- Machine translation (Google/DeepL)

**Config (`.vscode/settings.json`):**

```json
{
  "i18n-ally.localesPaths": ["apps/web/src/locales", "apps/api/src/locales"],
  "i18n-ally.keystyle": "nested",
  "i18n-ally.enabledFrameworks": ["react", "i18next"]
}
```

---

## 📊 Tool Comparison Matrix

| Feature                 | Tolgee | Crowdin | Lokalise | SimpleLocalize | i18n-tasks | Manual JSON |
| ----------------------- | ------ | ------- | -------- | -------------- | ---------- | ----------- |
| **Cost**                | FREE   | $50/mo  | $120/mo  | $49/mo         | FREE       | FREE        |
| **Self-Hosted**         | ✅     | ❌      | ❌       | ❌             | ✅         | ✅          |
| **In-Context Editing**  | ✅     | ✅      | ✅       | ❌             | ❌         | ❌          |
| **Machine Translation** | ✅     | ✅      | ✅       | ✅             | ✅         | ❌          |
| **GitHub Integration**  | ✅     | ✅      | ✅       | ❌             | ❌         | ✅          |
| **CLI**                 | ✅     | ✅      | ✅       | ✅             | ✅         | ❌          |
| **Translation Memory**  | ✅     | ✅      | ✅       | ❌             | ❌         | ❌          |
| **Context Screenshots** | ✅     | ✅      | ✅       | ❌             | ❌         | ❌          |
| **GDPR Compliant**      | ✅     | ⚠️      | ⚠️       | ⚠️             | ✅         | ✅          |
| **Setup Complexity**    | Medium | Low     | Low      | Low            | Low        | None        |

**Legend:**

- ✅ = Yes / Excellent
- ⚠️ = Requires configuration (DPA/BAA agreement)
- ❌ = No / Not Available

---

## 🎬 Action Plan

### Immediate (This Week)

1. ✅ Add `scripts/validate-translations.js` validation script
2. ✅ Install VS Code extension: i18n Ally
3. ✅ Add `npm run i18n:validate` to CI/CD

### Short-Term (Next Sprint)

1. ⏳ Evaluate Tolgee vs Crowdin (trial both)
2. ⏳ Set up staging environment with chosen tool
3. ⏳ Migrate existing translations

### Long-Term (When Scaling)

1. 🔮 Add more languages (French, German, Portuguese)
2. 🔮 Professional translation service integration
3. 🔮 Translation analytics dashboard

---

## 🤔 Decision Framework

**Choose Tolgee if:**

- You value data privacy/control
- Budget is limited
- Self-hosting is acceptable
- You want in-context editing

**Choose Crowdin if:**

- You want a proven SaaS solution
- GitHub integration is critical
- Budget allows $50-167/month
- You plan to add many languages

**Choose SimpleLocalize if:**

- You want simple CLI-first workflow
- Budget is $50/month
- No need for advanced features

**Stay with Manual JSON if:**

- Only 2 languages forever
- Very infrequent changes
- - Use validation script + i18n Ally

---

## 📚 Resources

- **Tolgee:** https://tolgee.io/
- **Crowdin:** https://crowdin.com/
- **Lokalise:** https://lokalise.com/
- **SimpleLocalize:** https://simplelocalize.io/
- **i18n-tasks:** https://github.com/i18next/i18next-scanner
- **i18n Ally:** https://github.com/lokalise/i18n-ally

---

**Author:** John McBride  
**Last Updated:** 2026-02-03  
**Status:** 📖 Recommendation Document
