const ALLOWED_MEDIA_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'jfif',
  'png',
  'webp',
  'gif',
  'avif',
  'mp4',
  'webm',
  'mov',
  'm4v',
]);

export function safeUrl(raw: string | null | undefined, base?: string | URL): URL | null {
  if (!raw) {
    return null;
  }

  try {
    return base ? new URL(raw, base) : new URL(raw);
  } catch {
    return null;
  }
}

export function isHttpUrl(raw: string | null | undefined): boolean {
  const url = safeUrl(raw);
  return url !== null && (url.protocol === 'http:' || url.protocol === 'https:');
}

export function normalizeHttpUrl(raw: string | null | undefined, base?: string | URL): string | null {
  const url = safeUrl(raw, base);
  if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
    return null;
  }

  url.hash = '';
  return url.toString();
}

export function extensionFromUrl(raw: string | null | undefined): string | null {
  const url = safeUrl(raw);
  if (!url) {
    return null;
  }

  const match = /\.([a-z0-9]{2,5})$/i.exec(url.pathname);
  const extension = match?.[1]?.toLowerCase();
  return extension && ALLOWED_MEDIA_EXTENSIONS.has(extension) ? extension : null;
}

export function hostMatches(hostname: string, domain: string): boolean {
  const host = hostname.toLowerCase();
  const root = domain.toLowerCase();
  return host === root || host.endsWith(`.${root}`);
}

export function matchesAnyHost(url: URL, domains: readonly string[]): boolean {
  return domains.some((domain) => hostMatches(url.hostname, domain));
}

export function pathMatches(url: URL, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(url.pathname));
}
