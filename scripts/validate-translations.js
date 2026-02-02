#!/usr/bin/env node

/**
 * Translation Validation Script
 *
 * Validates that all translation files have the same keys.
 * Run this in CI/CD to prevent missing translations from reaching production.
 *
 * Usage:
 *   node scripts/validate-translations.js
 *   npm run i18n:validate
 */

const fs = require("fs");
const path = require("path");

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

/**
 * Flattens nested JSON object into dot-notation keys
 * Example: { auth: { login: "Login" } } => { "auth.login": "Login" }
 */
function flattenObject(obj, prefix = "") {
  return Object.keys(obj).reduce((acc, key) => {
    const pre = prefix.length ? `${prefix}.` : "";
    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      Object.assign(acc, flattenObject(obj[key], `${pre}${key}`));
    } else {
      acc[`${pre}${key}`] = obj[key];
    }
    return acc;
  }, {});
}

/**
 * Loads translation file and returns flattened keys
 */
function loadTranslationFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(content);
    return flattenObject(json);
  } catch (error) {
    console.error(
      `${colors.red}❌ Error loading ${filePath}:${colors.reset}`,
      error.message,
    );
    process.exit(1);
  }
}

/**
 * Main validation function
 */
function validateTranslations() {
  console.log(`${colors.cyan}🔍 Validating translations...${colors.reset}\n`);

  const translationPaths = [
    {
      name: "Frontend",
      en: path.join(__dirname, "../apps/web/src/locales/en/translation.json"),
      es: path.join(__dirname, "../apps/web/src/locales/es/translation.json"),
    },
    {
      name: "Backend",
      en: path.join(__dirname, "../apps/api/src/locales/en/translation.json"),
      es: path.join(__dirname, "../apps/api/src/locales/es/translation.json"),
    },
  ];

  let hasErrors = false;

  translationPaths.forEach(({ name, en, es }) => {
    console.log(`${colors.blue}📦 Checking ${name}...${colors.reset}`);

    // Check if files exist
    if (!fs.existsSync(en)) {
      console.error(
        `${colors.red}❌ Missing English file: ${en}${colors.reset}`,
      );
      hasErrors = true;
      return;
    }

    if (!fs.existsSync(es)) {
      console.error(
        `${colors.red}❌ Missing Spanish file: ${es}${colors.reset}`,
      );
      hasErrors = true;
      return;
    }

    // Load and flatten translations
    const enKeys = loadTranslationFile(en);
    const esKeys = loadTranslationFile(es);

    const enKeyNames = Object.keys(enKeys);
    const esKeyNames = Object.keys(esKeys);

    // Find missing keys
    const missingInSpanish = enKeyNames.filter(
      (key) => !esKeyNames.includes(key),
    );
    const missingInEnglish = esKeyNames.filter(
      (key) => !enKeyNames.includes(key),
    );

    // Find empty translations
    const emptyInEnglish = enKeyNames.filter(
      (key) => !enKeys[key] || enKeys[key].trim() === "",
    );
    const emptyInSpanish = esKeyNames.filter(
      (key) => !esKeys[key] || esKeys[key].trim() === "",
    );

    // Report results
    if (
      missingInSpanish.length === 0 &&
      missingInEnglish.length === 0 &&
      emptyInEnglish.length === 0 &&
      emptyInSpanish.length === 0
    ) {
      console.log(
        `${colors.green}✅ ${name}: All translations in sync! (${enKeyNames.length} keys)${colors.reset}\n`,
      );
    } else {
      hasErrors = true;

      if (missingInSpanish.length > 0) {
        console.error(
          `${colors.red}❌ Missing in Spanish (${missingInSpanish.length}):${colors.reset}`,
        );
        missingInSpanish.forEach((key) => {
          console.error(`   - ${key}: "${enKeys[key]}"`);
        });
        console.log("");
      }

      if (missingInEnglish.length > 0) {
        console.error(
          `${colors.red}❌ Missing in English (${missingInEnglish.length}):${colors.reset}`,
        );
        missingInEnglish.forEach((key) => {
          console.error(`   - ${key}: "${esKeys[key]}"`);
        });
        console.log("");
      }

      if (emptyInEnglish.length > 0) {
        console.error(
          `${colors.yellow}⚠️  Empty values in English (${emptyInEnglish.length}):${colors.reset}`,
        );
        emptyInEnglish.forEach((key) => {
          console.error(`   - ${key}`);
        });
        console.log("");
      }

      if (emptyInSpanish.length > 0) {
        console.error(
          `${colors.yellow}⚠️  Empty values in Spanish (${emptyInSpanish.length}):${colors.reset}`,
        );
        emptyInSpanish.forEach((key) => {
          console.error(`   - ${key}`);
        });
        console.log("");
      }
    }
  });

  console.log(
    `${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
  );

  if (hasErrors) {
    console.error(
      `${colors.red}❌ Translation validation failed!${colors.reset}`,
    );
    console.log(
      `\n${colors.yellow}Fix the issues above and run again.${colors.reset}\n`,
    );
    process.exit(1);
  } else {
    console.log(
      `${colors.green}✅ All translation files are valid!${colors.reset}\n`,
    );
    process.exit(0);
  }
}

// Run validation
validateTranslations();
