import { beforeEach, describe, expect, it } from 'vitest';
import { facebookAdapter } from '@/adapters/facebook';
import { instagramAdapter } from '@/adapters/instagram';
import { tiktokAdapter } from '@/adapters/tiktok';
import { scanPage } from '@/content/scanner';
import { findInPageTargets } from '@/content/buttons/find-targets';
import { setDocumentHtml } from '../helpers/dom';

/**
 * Platform pages embed i18n dictionaries and serialized state inside `<script>`
 * tags. Those payloads contain phrases like "this account is private" on every
 * public page, so phrase detection must only read rendered text. Reading
 * `body.textContent` marked every public TikTok page as restricted and blocked
 * all downloads.
 */
const EMBEDDED_SCRIPT_PHRASES = `
  <script type="application/json">
    {
      "i18n": {
        "private_body": "You cannot view the videos due to this user's privacy settings.",
        "private_title": "this account is private",
        "unavailable": "This content isn't available right now",
        "login_copy": "Log in to continue"
      }
    }
  </script>
`;

describe('page-level gating ignores embedded script payloads', () => {
  beforeEach(() => {
    setDocumentHtml('');
  });

  it('keeps a public TikTok video downloadable when the page embeds privacy strings', () => {
    setDocumentHtml(`
      <html><head>
        <meta property="og:title" content="Creator (@creator) • TikTok" />
        ${EMBEDDED_SCRIPT_PHRASES}
        <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">
          {
            "__DEFAULT_SCOPE__": {
              "webapp.video-detail": {
                "itemInfo": {
                  "itemStruct": {
                    "id": "7300000000000000100",
                    "desc": "A public video",
                    "author": { "uniqueId": "creator", "nickname": "Creator" },
                    "video": {
                      "playAddr": "https://v16-webapp-prime.tiktok.com/video/tos/main.mp4",
                      "downloadAddr": "https://v16-webapp-prime.tiktok.com/video/tos/main-dl.mp4",
                      "cover": "https://p16-sign.tiktokcdn.com/main-cover.jpg"
                    }
                  }
                }
              }
            }
          }
        </script>
      </head>
      <body><main><video></video></main></body></html>
    `);

    const discovery = tiktokAdapter.discoverMedia({
      document,
      url: new URL('https://www.tiktok.com/@creator/video/7300000000000000100'),
    });

    expect(discovery.limitations.map((entry) => entry.code)).not.toContain(
      'private-content',
    );
    expect(discovery.limitations.map((entry) => entry.code)).not.toContain(
      'login-required',
    );

    const video = discovery.items.find((item) => item.kind === 'video');
    expect(video?.downloadable).toBe(true);
    expect(video?.downloadStatus).toBe('available');
  });

  it('still reports a genuine private page whose visible text says so', () => {
    setDocumentHtml(
      `<html><body><main><h1>This account is private</h1><p>Follow to see photos.</p></main></body></html>`,
    );

    const discovery = instagramAdapter.discoverMedia({
      document,
      url: new URL('https://www.instagram.com/privateuser/'),
    });

    expect(
      discovery.limitations.find((entry) => entry.code === 'private-content')
        ?.severity,
    ).toBe('blocking');
    expect(discovery.items.every((item) => !item.downloadable)).toBe(true);
  });

  it('does not treat a persistent header login form as a wall when media is rendered', () => {
    setDocumentHtml(`
      <html><body>
        <form><input type="password" placeholder="Password" /></form>
        <main>
          <img src="https://scontent.xx.fbcdn.net/v/t1/public-photo.jpg" width="640" height="480" alt="Public photo" />
        </main>
      </body></html>
    `);

    const discovery = facebookAdapter.discoverMedia({
      document,
      url: new URL('https://www.facebook.com/NASA/photos/'),
    });

    expect(discovery.limitations.map((entry) => entry.code)).not.toContain(
      'login-required',
    );
    const photo = discovery.items.find((item) => item.kind === 'image');
    expect(photo?.downloadable).toBe(true);
  });

  it('still blocks a page whose only credential field has no media', () => {
    setDocumentHtml(
      '<html><body><form><input type="password" /></form><p>Log in to continue</p></body></html>',
    );

    const discovery = facebookAdapter.discoverMedia({
      document,
      url: new URL('https://www.facebook.com/photo/?fbid=1'),
    });

    expect(
      discovery.limitations.find((entry) => entry.code === 'login-required')
        ?.severity,
    ).toBe('blocking');
  });
});

describe('profile-scoped media URLs resolve to a media page type', () => {
  beforeEach(() => {
    setDocumentHtml('');
  });

  it('detects Instagram media nested under a profile path', () => {
    expect(
      instagramAdapter.detectPageType({
        document,
        url: new URL('https://www.instagram.com/nasa/reel/Dfc1mYxFevS/'),
      }),
    ).toBe('reel');
    expect(
      instagramAdapter.detectPageType({
        document,
        url: new URL('https://www.instagram.com/nasa/p/Df-NlR0PjmN/'),
      }),
    ).toBe('post');
    expect(
      instagramAdapter.detectPageType({
        document,
        url: new URL('https://www.instagram.com/nasa/tv/ABC123/'),
      }),
    ).toBe('video');
  });

  it('detects Facebook media nested under a page path', () => {
    expect(
      facebookAdapter.detectPageType({
        document,
        url: new URL('https://www.facebook.com/facebook/videos/10153231379946729/'),
      }),
    ).toBe('video');
    expect(
      facebookAdapter.detectPageType({
        document,
        url: new URL('https://www.facebook.com/NASA/reels/222/'),
      }),
    ).toBe('reel');
    expect(
      facebookAdapter.detectPageType({
        document,
        url: new URL('https://www.facebook.com/NASA/posts/333/'),
      }),
    ).toBe('post');
  });

  it('extracts media and mounts the in-page button for a profile-scoped reel', () => {
    setDocumentHtml(`
      <html><head>
        <meta property="og:title" content="Creator (@creator) • Instagram" />
        <meta property="og:image" content="https://scontent.cdninstagram.com/v/t51/cover.jpg" />
      </head><body>
        <main><article>
          <a href="/creator/reel/REELPROFILE/">
            <video poster="https://scontent.cdninstagram.com/v/t51/cover.jpg" width="1080" height="1920"></video>
          </a>
          <section>
            <button aria-label="Like"><svg></svg></button>
            <button aria-label="Comment"><svg></svg></button>
            <button aria-label="Share"><svg></svg></button>
            <button aria-label="Save"><svg></svg></button>
          </section>
          <script type="application/json">
            { "video_versions": [
              { "width": 1080, "height": 1920,
                "url": "https://scontent.cdninstagram.com/v/t51/profile-reel-1080.mp4" }
            ] }
          </script>
        </article></main>
      </body></html>
    `);

    const url = new URL('https://www.instagram.com/creator/reel/REELPROFILE/');
    const scan = scanPage(document, url);

    expect(scan.pageType).toBe('reel');
    expect(scan.items.some((item) => item.kind === 'video' && item.downloadable)).toBe(
      true,
    );
    expect(findInPageTargets(document, url).length).toBeGreaterThan(0);
  });
});
