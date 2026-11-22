import { access, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const distRoot = resolve('dist');
const failures = [];

async function requireFile(relativePath) {
  try {
    await access(join(distRoot, relativePath));
    return true;
  } catch {
    failures.push(`Missing from dist: ${relativePath}`);
    return false;
  }
}

async function readJson(relativePath) {
  try {
    return JSON.parse(await readFile(join(distRoot, relativePath), 'utf8'));
  } catch (error) {
    failures.push(`Could not parse ${relativePath}: ${error.message}`);
    return null;
  }
}

function collectHtmlReferences(html) {
  const references = new Set();
  const pattern = /(?:src|href)="([^"]+)"/g;

  for (const match of html.matchAll(pattern)) {
    const reference = match[1];
    if (
      reference.startsWith('http://') ||
      reference.startsWith('https://') ||
      reference.startsWith('data:') ||
      reference.startsWith('#')
    ) {
      continue;
    }

    references.add(reference.replace(/^\//, '').split('?')[0]);
  }

  return references;
}

const manifest = await readJson('manifest.json');

if (!manifest) {
  console.error('Extension package verification failed: manifest is not readable.');
  process.exit(1);
}

if (manifest.manifest_version !== 3) {
  failures.push('manifest_version must be 3');
}

for (const field of ['name', 'version', 'description', 'minimum_chrome_version']) {
  if (!manifest[field]) {
    failures.push(`Manifest is missing required field: ${field}`);
  }
}

const extraPages = [
  'dashboard.html',
  'history.html',
  'accounts.html',
  'stories.html',
  'relationships.html',
];
const requiredFiles = new Set([
  'manifest.json',
  'content.js',
  ...extraPages,
  manifest.action?.default_popup,
  manifest.options_ui?.page,
  manifest.side_panel?.default_path,
  manifest.background?.service_worker,
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
]);

for (const file of requiredFiles) {
  if (typeof file === 'string' && file.length > 0) {
    await requireFile(file);
  }
}

if (manifest.background?.type !== 'module') {
  failures.push('The service worker must be an ES module');
}

if (manifest.content_scripts) {
  failures.push('Static content scripts are not allowed; registration must be opt-in');
}

for (const forbidden of ['cookies', 'webRequest', 'tabs', 'history', 'management']) {
  if ((manifest.permissions ?? []).includes(forbidden)) {
    failures.push(`Forbidden permission present: ${forbidden}`);
  }
}

if (!manifest.content_security_policy?.extension_pages?.includes("script-src 'self'")) {
  failures.push('Extension pages must use a self-only script CSP.');
}

const requiredPermissions = [
  'storage',
  'downloads',
  'downloads.open',
  'notifications',
  'scripting',
  'activeTab',
  'sidePanel',
];
for (const permission of requiredPermissions) {
  if (!(manifest.permissions ?? []).includes(permission)) {
    failures.push(`Expected permission missing: ${permission}`);
  }
}

if (manifest.host_permissions) {
  failures.push('Host permissions must be optional, not granted at install');
}

if (!Array.isArray(manifest.optional_host_permissions) || manifest.optional_host_permissions.length === 0) {
  failures.push('Expected optional_host_permissions for supported platforms');
}

const htmlPages = [
  manifest.action?.default_popup,
  manifest.options_ui?.page,
  manifest.side_panel?.default_path,
  ...extraPages,
].filter((page) => typeof page === 'string');

for (const page of htmlPages) {
  try {
    const html = await readFile(join(distRoot, page), 'utf8');
    for (const reference of collectHtmlReferences(html)) {
      await requireFile(reference);
    }
  } catch {
    failures.push(`Could not read HTML page: ${page}`);
  }
}

const backgroundFile = manifest.background?.service_worker;
if (typeof backgroundFile === 'string') {
  try {
    const background = await readFile(join(distRoot, backgroundFile), 'utf8');
    const importPattern = /(?:from|import)\s*["']\.\/([^"']+\.js)["']/g;

    for (const match of background.matchAll(importPattern)) {
      await requireFile(match[1]);
    }
  } catch {
    failures.push(`Could not read ${backgroundFile}`);
  }
}

if (failures.length > 0) {
  console.error('Extension package verification failed:');
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Verified extension package: ${manifest.name} v${manifest.version} in dist/ (${requiredFiles.size} entry files checked).`,
);
