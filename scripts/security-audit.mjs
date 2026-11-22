import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve('.');
const manifest = JSON.parse(await readFile(join(root, 'public/manifest.json'), 'utf8'));
const failures = [];

const allowedPermissions = new Set([
  'storage',
  'downloads',
  'downloads.open',
  'notifications',
  'scripting',
  'activeTab',
  'sidePanel',
]);

for (const permission of manifest.permissions ?? []) {
  if (!allowedPermissions.has(permission)) {
    failures.push(`Unexpected permission: ${permission}`);
  }
}

for (const required of allowedPermissions) {
  if (!(manifest.permissions ?? []).includes(required)) {
    failures.push(`Expected permission missing: ${required}`);
  }
}

if (manifest.host_permissions) {
  failures.push('host_permissions must not be granted at install.');
}

if (manifest.content_scripts) {
  failures.push('Static content scripts are forbidden; registration must be dynamic and site-scoped.');
}

const allowedOrigins = new Set([
  'https://*.instagram.com/*',
  'https://*.facebook.com/*',
  'https://*.tiktok.com/*',
  'https://*.cdninstagram.com/*',
  'https://*.fbcdn.net/*',
  'https://*.tiktokcdn.com/*',
  'https://*.tiktokcdn-us.com/*',
  'https://*.tiktokcdn-eu.com/*',
  'https://*.ibytedtos.com/*',
]);

for (const origin of manifest.optional_host_permissions ?? []) {
  if (!allowedOrigins.has(origin)) {
    failures.push(`Unexpected optional host origin: ${origin}`);
  }
}

const csp = manifest.content_security_policy?.extension_pages ?? '';
if (!csp.includes("script-src 'self'") || !csp.includes("object-src 'self'")) {
  failures.push('Extension pages must use a self-only CSP without remote script execution.');
}

const forbiddenPatterns = [
  { pattern: /\beval\s*\(/g, label: 'eval(' },
  { pattern: /\bnew\s+Function\s*\(/g, label: 'new Function(' },
  { pattern: /dangerouslySetInnerHTML/g, label: 'dangerouslySetInnerHTML' },
  { pattern: /document\.write\s*\(/g, label: 'document.write(' },
  { pattern: /chrome\.cookies/g, label: 'chrome.cookies' },
  { pattern: /document\.cookie/g, label: 'document.cookie' },
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist') {
      continue;
    }
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
    } else if (/\.(ts|tsx|js|jsx|html)$/.test(entry.name)) {
      const text = await readFile(path, 'utf8');
      for (const { pattern, label } of forbiddenPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(text)) {
          failures.push(`${label} found in ${path}`);
        }
      }
    }
  }
}

await walk(join(root, 'src'));

if (failures.length > 0) {
  console.error('Security audit failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Security audit passed: manifest permissions, CSP, optional origins, and risky-source scan.');
