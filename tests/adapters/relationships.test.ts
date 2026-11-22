import { describe, expect, it } from 'vitest';
import { scanPage } from '@/content/scanner';
import { setDocumentHtml } from '../helpers/dom';

function html(body: string): string {
  return `<!doctype html><html><body>${body}</body></html>`;
}

describe('visible relationship discovery', () => {
  it('discovers Instagram follower rows from the rendered dialog only', () => {
    setDocumentHtml(
      html(`
        <main>
          <a href="/not-a-profile/followers/">Followers</a>
          <div role="dialog">
            <a href="/alice/"><img alt="Alice" />alice</a>
            <a href="/bob/"><img alt="Bob" />bob</a>
            <a href="/alice/">duplicate</a>
            <a href="/explore/">Explore</a>
          </div>
        </main>
      `),
    );

    const result = scanPage(
      document,
      new URL('https://www.instagram.com/studio/followers/'),
    );

    expect(result.relationshipKind).toBe('followers');
    expect(result.relationships?.map((entry) => entry.username)).toEqual([
      'alice',
      'bob',
    ]);
    expect(result.relationships?.[0]?.profileUrl).toBe(
      'https://www.instagram.com/alice/',
    );
    expect(result.relationships?.[0]?.displayName).toBe('Alice');
  });

  it('discovers Facebook following rows and rejects unrelated links', () => {
    setDocumentHtml(
      html(`
        <main>
          <a href="/alice.smith/">Alice Smith</a>
          <a href="/alice.smith/followers/">Followers</a>
          <a href="/groups/test/">Group</a>
        </main>
      `),
    );

    const result = scanPage(
      document,
      new URL('https://www.facebook.com/studio/following/'),
    );

    expect(result.relationshipKind).toBe('following');
    expect(result.relationships?.map((entry) => entry.username)).toEqual([
      'alice.smith',
    ]);
  });

  it('discovers TikTok following rows and leaves other pages empty', () => {
    setDocumentHtml(
      html(`
        <main>
          <a href="/@creator.one/"><img alt="Creator One" />Creator One</a>
          <a href="/@creator.one/video/1">Video</a>
        </main>
      `),
    );

    const result = scanPage(
      document,
      new URL('https://www.tiktok.com/@studio/following'),
    );

    expect(result.relationshipKind).toBe('following');
    expect(result.relationships?.[0]?.profileUrl).toBe(
      'https://www.tiktok.com/@creator.one',
    );

    setDocumentHtml(html('<main><a href="/@someone/">Someone</a></main>'));
    const other = scanPage(
      document,
      new URL('https://www.tiktok.com/@studio'),
    );
    expect(other.relationshipKind).toBeUndefined();
    expect(other.relationships).toEqual([]);
  });
});
