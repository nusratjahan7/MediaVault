import { afterEach, describe, expect, it, vi } from 'vitest';
import { scanPage } from '@/content/scanner';
import { selectItemsForTarget } from '@/content/buttons/media-selection';
import { startInPageActions } from '@/content/in-page-actions';
import { findFacebookActionTargets } from '@/adapters/facebook/in-page';
import { findInstagramActionTargets } from '@/adapters/instagram/in-page';
import { findTikTokActionTargets } from '@/adapters/tiktok/in-page';
import { instagramAdapter } from '@/adapters/instagram';
import { setDocumentHtml } from '../helpers/dom';
import profileHtml from '../fixtures/instagram/profile.html?raw';
import storyHtml from '../fixtures/instagram/story.html?raw';
import feedHtml from '../fixtures/instagram/feed.html?raw';
import facebookAlbumHtml from '../fixtures/facebook/album.html?raw';
import tiktokProfileHtml from '../fixtures/tiktok/profile-embedded.html?raw';

const FACEBOOK_POST = `<!doctype html><html><head>
  <meta property="og:title" content="Atlas Films | Facebook" />
  </head><body>
  <div role="article">
    <a href="/atlasfilms/posts/123">Post</a>
    <video src="https://video.xx.fbcdn.net/v/t42/clip.mp4" poster="https://scontent.xx.fbcdn.net/v/t15/poster.jpg"></video>
    <div>
      <button aria-label="Like"><svg></svg></button>
      <button aria-label="Comment"><svg></svg></button>
      <button aria-label="Share"><svg></svg></button>
    </div>
  </div>
  </body></html>`;

const TIKTOK_VIDEO = `<!doctype html><html><head>
  <meta property="og:title" content="Creator (@creator) • TikTok" />
  </head><body>
  <main>
    <video src="https://v16-webapp.tiktokcdn.com/video/current.mp4" poster="https://p16-sign.tiktokcdn.com/current-cover.jpg"></video>
    <div>
      <button data-e2e="like-icon" aria-label="Like"><svg></svg></button>
      <button data-e2e="comment-icon" aria-label="Comment"><svg></svg></button>
      <button data-e2e="share-icon" aria-label="Share"><svg></svg></button>
    </div>
  </main>
  </body></html>`;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('native platform buttons', () => {
  it('places a Facebook post button in the action row and removes it with the media', async () => {
    setDocumentHtml(FACEBOOK_POST);
    const url = new URL('https://www.facebook.com/atlasfilms/posts/123');
    const targets = findFacebookActionTargets(document, url);

    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({
      platform: 'facebook',
      kind: 'post',
      position: 'inline',
    });
    expect(targets[0]?.mount.querySelectorAll('button').length).toBeGreaterThanOrEqual(3);

    const onDownload = vi.fn(async () => ({ message: 'Saved.', tone: 'success' as const }));
    const controller = startInPageActions({
      findTargets: () => findFacebookActionTargets(document, url),
      onDownload,
    });
    controller.refresh();
    controller.refresh();

    expect(document.querySelectorAll('[data-mediavault-action]')).toHaveLength(1);

    document.querySelector('[role="article"]')?.remove();
    controller.refresh();
    expect(document.querySelectorAll('[data-mediavault-action]')).toHaveLength(0);
    controller.destroy();
  });

  it('places a TikTok button in the native action controls', () => {
    setDocumentHtml(TIKTOK_VIDEO);
    const targets = findTikTokActionTargets(
      document,
      new URL('https://www.tiktok.com/@creator/video/730'),
    );

    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({
      platform: 'tiktok',
      kind: 'video',
      position: 'inline',
    });
    expect(targets[0]?.mount.querySelectorAll('[data-e2e]').length).toBeGreaterThanOrEqual(3);
  });

  it('places the Instagram story button on the story edge', () => {
    setDocumentHtml(storyHtml);
    const targets = findInstagramActionTargets(
      document,
      new URL('https://www.instagram.com/stories/studio.north/123/'),
    );

    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({
      platform: 'instagram',
      kind: 'story',
      position: 'overlay-left',
    });
  });

  it('selects the specific grid/story/album/TikTok item instead of every visible video', () => {
    setDocumentHtml(profileHtml);
    const profileUrl = new URL('https://www.instagram.com/studio.north/');
    const profileScan = scanPage(document, profileUrl);
    const profileTargets = findInstagramActionTargets(document, profileUrl);
    const firstGrid = profileTargets.find((target) => target.kind === 'grid')!;
    const gridItems = selectItemsForTarget(
      firstGrid,
      profileScan.items,
      profileTargets.length,
    );
    expect(gridItems).toHaveLength(1);
    expect(gridItems[0]?.url).toContain('grid-photo-1.jpg');

    setDocumentHtml(storyHtml);
    const storyUrl = new URL('https://www.instagram.com/stories/studio.north/123/');
    const storyScan = scanPage(document, storyUrl);
    const storyTarget = findInstagramActionTargets(document, storyUrl)[0]!;
    const storyItems = selectItemsForTarget(storyTarget, storyScan.items, 1);
    expect(storyItems).toHaveLength(1);
    expect(storyItems[0]?.url).toBe(
      'https://scontent.cdninstagram.com/v/t51/story-frame.jpg',
    );

    setDocumentHtml(tiktokProfileHtml);
    const tiktokUrl = new URL('https://www.tiktok.com/@creator/');
    const tiktokScan = scanPage(document, tiktokUrl);
    const tiktokTargets = findTikTokActionTargets(document, tiktokUrl);
    const tiktokTarget = tiktokTargets.find((target) => target.postUrl?.includes('333'))!;
    const tiktokItems = selectItemsForTarget(tiktokTarget, tiktokScan.items, tiktokTargets.length);
    expect(tiktokItems).toHaveLength(1);
    expect(tiktokItems[0]?.kind).toBe('image');
    expect(tiktokItems[0]?.url).toContain('three-cover.jpg');
  });

  it('keeps carousel selection scoped to the clicked post', () => {
    setDocumentHtml(profileHtml);
    const scan = scanPage(document, new URL('https://www.instagram.com/studio.north/'));
    const basePostItem = scan.items.find(
      (item) => item.postUrl === 'https://www.instagram.com/p/ABC123/',
    )!;
    const postItems = [
      ...scan.items,
      {
        ...basePostItem,
        id: 'instagram_carousel_second',
        url: 'https://scontent.cdninstagram.com/v/t51/carousel-2.jpg',
        thumbnailUrl: 'https://scontent.cdninstagram.com/v/t51/carousel-2.jpg',
      },
    ];
    const target = {
      id: 'post:ABC123',
      platform: 'instagram' as const,
      kind: 'post' as const,
      mount: document.body,
      position: 'inline' as const,
      postUrl: 'https://www.instagram.com/p/ABC123/',
      mediaUrls: [],
      selectionMode: 'all' as const,
    };

    const selected = selectItemsForTarget(target, postItems, 1);
    expect(selected.every((item) => item.postUrl === target.postUrl)).toBe(true);
    expect(selected.length).toBeGreaterThanOrEqual(2);
  });

  it('places album and reel/download buttons with scoped media', () => {
    setDocumentHtml(facebookAlbumHtml);
    const albumUrl = new URL('https://www.facebook.com/media/set/?set=a.999');
    const albumTargets = findFacebookActionTargets(document, albumUrl);
    const albumScan = scanPage(document, albumUrl);

    expect(albumTargets.length).toBeGreaterThanOrEqual(2);
    expect(albumTargets[0]?.kind).toBe('album');
    const albumSelection = selectItemsForTarget(
      albumTargets[0]!,
      albumScan.items,
      albumTargets.length,
    );
    expect(albumSelection).toHaveLength(1);
    expect(albumSelection[0]?.url).toContain('album-1.jpg');

    setDocumentHtml(FACEBOOK_POST);
    const reelUrl = new URL('https://www.facebook.com/reel/998877');
    const reelTargets = findFacebookActionTargets(document, reelUrl);
    const reelScan = scanPage(document, reelUrl);
    expect(reelTargets[0]?.kind).toBe('reel');
    const reelSelection = selectItemsForTarget(
      reelTargets[0]!,
      reelScan.items,
      reelTargets.length,
    );
    expect(reelSelection).toHaveLength(1);
    expect(reelSelection[0]?.kind).toBe('video');

    setDocumentHtml(feedHtml);
    const postUrl = new URL('https://www.instagram.com/');
    const postTarget = findInstagramActionTargets(document, postUrl)[0]!;
    const postSelection = selectItemsForTarget(
      postTarget,
      scanPage(document, postUrl).items,
      1,
    );
    expect(postSelection).toHaveLength(1);
    expect(postSelection[0]?.kind).toBe('image');
  });

  it('supports TikTok current-video and Facebook story selection', () => {
    setDocumentHtml(TIKTOK_VIDEO);
    const tiktokUrl = new URL('https://www.tiktok.com/@creator/video/730');
    const tiktokTarget = findTikTokActionTargets(document, tiktokUrl)[0]!;
    const tiktokSelection = selectItemsForTarget(
      tiktokTarget,
      scanPage(document, tiktokUrl).items,
      1,
    );
    expect(tiktokSelection).toHaveLength(1);
    expect(tiktokSelection[0]?.kind).toBe('video');

    setDocumentHtml(`<!doctype html><html><head>
      <meta property="og:title" content="Atlas Films | Facebook" />
      </head><body>
      <div role="dialog">
        <video src="https://video.xx.fbcdn.net/v/t42/story.mp4" poster="https://scontent.xx.fbcdn.net/v/t15/story-poster.jpg"></video>
      </div>
      </body></html>`);
    const storyUrl = new URL('https://www.facebook.com/stories/123');
    const storyTarget = findFacebookActionTargets(document, storyUrl)[0]!;
    const storySelection = selectItemsForTarget(
      storyTarget,
      scanPage(document, storyUrl).items,
      1,
    );
    expect(storyTarget.position).toBe('overlay-left');
    expect(storySelection).toHaveLength(1);
    expect(storySelection[0]?.kind).toBe('video');
  });

  it('marks failed buttons as retryable without alerts', async () => {
    setDocumentHtml(FACEBOOK_POST);
    const url = new URL('https://www.facebook.com/atlasfilms/posts/123');
    const onDownload = vi.fn(async () => ({
      message: 'Video source is unavailable.',
      tone: 'error' as const,
    }));
    const controller = startInPageActions({
      findTargets: () => findFacebookActionTargets(document, url),
      onDownload,
    });
    controller.refresh();
    const host = document.querySelector<HTMLElement>('[data-mediavault-action]')!;
    const button = host.shadowRoot?.querySelector<HTMLButtonElement>('button');
    if (!button) {
      throw new Error('Expected a download button.');
    }

    button.click();
    await vi.waitFor(() => {
      expect(host.dataset.mediavaultState).toBe('failed');
    });
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-label')).toBe('Retry download');
    expect(button.getAttribute('title')).toBe('Retry download');
    controller.destroy();
  });

  it('selects the profile picture and keeps detection independent from page adverts', () => {
    setDocumentHtml(profileHtml);
    const url = new URL('https://www.instagram.com/studio.north/');
    const scan = instagramAdapter.discoverMedia({ document, url });
    const targets = findInstagramActionTargets(document, url);
    const profileTarget = targets.find((target) => target.kind === 'profile-picture')!;
    const selected = selectItemsForTarget(profileTarget, scan.items, targets.length);

    expect(selected).toHaveLength(1);
    expect(selected[0]?.filenameHint).toBe('instagram-profile-picture');
  });
});
