import { beforeEach, describe, expect, it } from 'vitest';
import { instagramAdapter } from '@/adapters/instagram';
import { findInstagramActionTargets } from '@/adapters/instagram/in-page';
import { setDocumentHtml } from '../helpers/dom';
import profileHtml from '../fixtures/instagram/profile.html?raw';
import storyHtml from '../fixtures/instagram/story.html?raw';
import feedHtml from '../fixtures/instagram/feed.html?raw';

beforeEach(() => {
  setDocumentHtml('');
});

describe('Instagram module discovery', () => {
  it('discovers a profile picture and accessible profile-grid media with post context', () => {
    setDocumentHtml(profileHtml);
    const url = new URL('https://www.instagram.com/studio.north/');
    const discovery = instagramAdapter.discoverMedia({ document, url });

    expect(discovery.pageType).toBe('profile');
    expect(discovery.account?.username).toBe('studio.north');

    const profilePicture = discovery.items.find(
      (item) => item.filenameHint === 'instagram-profile-picture',
    );
    expect(profilePicture).toBeDefined();
    expect(profilePicture?.url).toBe(
      'https://scontent.cdninstagram.com/v/t51/profile-hd.jpg',
    );
    expect(profilePicture?.downloadStatus).toBe('available');
    expect(profilePicture?.sourcePageUrl).toBe(url.toString());
    expect(instagramAdapter.getDownloadOptions(profilePicture!).length).toBe(1);

    const grid = discovery.items.filter(
      (item) => item.filenameHint === 'instagram-grid-image',
    );
    expect(grid).toHaveLength(2);
    expect(grid.map((item) => item.postUrl)).toEqual([
      'https://www.instagram.com/p/ABC123/',
      'https://www.instagram.com/reel/REEL9/',
    ]);
    expect(grid.map((item) => item.postId)).toEqual(['ABC123', 'REEL9']);
    expect(
      discovery.limitations.find((limitation) =>
        limitation.message.includes('Profile-grid downloads'),
      ),
    ).toBeDefined();
  });

  it('finds profile-grid download targets and avoids the small avatar', () => {
    setDocumentHtml(profileHtml);
    const url = new URL('https://www.instagram.com/studio.north/');
    const targets = findInstagramActionTargets(document, url);

    expect(targets).toHaveLength(3);
    expect(targets.map((target) => target.kind)).toEqual([
      'profile-picture',
      'grid',
      'grid',
    ]);
    expect(targets.slice(1).map((target) => target.postUrl)).toEqual([
      'https://www.instagram.com/p/ABC123/',
      'https://www.instagram.com/reel/REEL9/',
    ]);
    expect(targets[0]?.position).toBe('after');
    expect(targets[1]?.position).toBe('overlay');
  });

  it('discovers story media with direct URLs and reports blob-only video', () => {
    setDocumentHtml(storyHtml);
    const url = new URL('https://www.instagram.com/stories/studio.north/123/');
    const discovery = instagramAdapter.discoverMedia({ document, url });

    expect(discovery.pageType).toBe('story');
    const image = discovery.items.find((item) => item.kind === 'image');
    const blobVideo = discovery.items.find((item) => item.kind === 'video');

    expect(image?.url).toBe(
      'https://scontent.cdninstagram.com/v/t51/story-frame.jpg',
    );
    expect(image?.downloadStatus).toBe('available');
    expect(blobVideo?.downloadable).toBe(false);
    expect(discovery.limitations.map((limitation) => limitation.code)).toContain(
      'blob-video',
    );
  });

  it('detects highlights and reports unsupported story media clearly', () => {
    setDocumentHtml(
      `<html><head><meta property="og:title" content="Studio (@studio.north)" /></head><body>
        <div role="dialog"><video src="blob:https://www.instagram.com/x"></video></div>
      </body></html>`,
    );

    const url = new URL(
      'https://www.instagram.com/stories/highlights/17841400000000000/',
    );
    const discovery = instagramAdapter.discoverMedia({ document, url });

    expect(discovery.pageType).toBe('highlight');
    expect(discovery.items).toHaveLength(0);
    expect(discovery.limitations.map((limitation) => limitation.code)).toContain(
      'unsupported-media',
    );
    expect(discovery.limitations.map((limitation) => limitation.code)).toContain(
      'no-media',
    );
  });

  it('places feed download actions beside the post action row', () => {
    setDocumentHtml(feedHtml);
    const url = new URL('https://www.instagram.com/');
    const targets = findInstagramActionTargets(document, url);

    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({
      kind: 'post',
      postUrl: 'https://www.instagram.com/p/FEED123/',
      position: 'inline',
    });
    expect(targets[0]?.mount.querySelectorAll('button').length).toBeGreaterThanOrEqual(4);
  });

  it('does not inject buttons when the page is gated by a login wall', () => {
    setDocumentHtml(
      '<html><body><form><input type="password" /></form><p>Log in to continue</p></body></html>',
    );

    expect(
      findInstagramActionTargets(document, new URL('https://www.instagram.com/')),
    ).toEqual([]);
  });
});
