import { describe, expect, it } from 'vitest';
import {
  addSavedProfile,
  advanceProfileWorkflow,
  buildSavedListsExport,
  clearSavedLists,
  createSavedList,
  deleteSavedList,
  getProfileWorkflow,
  getSavedLists,
  importSavedLists,
  parseImportedSavedLists,
  removeSavedProfile,
  renameSavedList,
  startProfileWorkflow,
  stopProfileWorkflow,
} from '@/storage/lists';

describe('saved lists storage', () => {
  it('creates, renames, adds profiles, removes profiles, and deletes lists locally', async () => {
    const list = await createSavedList('Fashion Inspiration', 'instagram');
    expect(list.name).toBe('Fashion Inspiration');
    expect(list.accounts).toHaveLength(0);

    const renamed = await renameSavedList(list.id, 'Fashion');
    expect(renamed[0]?.name).toBe('Fashion');

    const added = await addSavedProfile(list.id, {
      username: '@example',
      displayName: 'Example',
    });
    expect(added[0]?.accounts[0]?.username).toBe('example');
    expect(added[0]?.accounts[0]?.profileUrl).toBe(
      'https://www.instagram.com/example/',
    );
    expect(added[0]?.accounts[0]?.displayName).toBe('Example');

    const profileId = added[0]!.accounts[0]!.id;
    const removed = await removeSavedProfile(list.id, profileId);
    expect(removed[0]?.accounts).toHaveLength(0);

    await deleteSavedList(list.id);
    await expect(getSavedLists()).resolves.toEqual([]);
  });

  it('preserves stable ids and rejects duplicate profiles', async () => {
    const list = await createSavedList('TikTok creators', 'tiktok');
    await addSavedProfile(list.id, { username: 'creator' });

    const first = await getSavedLists();
    const second = await getSavedLists();
    expect(first[0]?.id).toBe(list.id);
    expect(first[0]?.accounts[0]?.id).toBe(second[0]?.accounts[0]?.id);

    await expect(
      addSavedProfile(list.id, { username: '@creator' }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('rejects profile URLs from the wrong platform and stores no credentials', async () => {
    const list = await createSavedList('Facebook', 'facebook');

    await expect(
      addSavedProfile(list.id, {
        username: 'example',
        profileUrl: 'https://www.instagram.com/example/',
        password: 'secret',
        cookie: 'session',
      } as never),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });

    await addSavedProfile(list.id, {
      username: 'example',
      profileUrl: 'https://www.facebook.com/example/',
      password: 'secret',
    } as never);

    const saved = await getSavedLists();
    expect(saved[0]?.accounts[0]?.profileUrl).toBe(
      'https://www.facebook.com/example/',
    );
    expect(JSON.stringify(saved)).not.toContain('secret');
    expect(JSON.stringify(saved)).not.toContain('cookie');
  });

  it('validates imported JSON and accepts a single list or lists envelope', async () => {
    const single = parseImportedSavedLists({
      name: 'Fashion Inspiration',
      platform: 'instagram',
      accounts: [
        {
          username: 'example',
          profileUrl: 'https://www.instagram.com/example/',
        },
      ],
    });

    expect(single).toHaveLength(1);
    expect(single[0]?.accounts[0]?.profileUrl).toBe(
      'https://www.instagram.com/example/',
    );

    const envelope = parseImportedSavedLists({
      app: 'MediaVault',
      version: 1,
      lists: [
        {
          name: 'TikTok',
          platform: 'tiktok',
          accounts: [{ username: 'creator' }],
        },
      ],
    });

    expect(envelope[0]?.accounts[0]?.profileUrl).toBe(
      'https://www.tiktok.com/@creator',
    );

    await importSavedLists(envelope);
    expect((await getSavedLists())[0]?.name).toBe('TikTok');
  });

  it('rejects malformed imported data', () => {
    expect(() => parseImportedSavedLists('{oops')).toThrow(/valid JSON/i);
    expect(() =>
      parseImportedSavedLists({
        name: '',
        platform: 'instagram',
        accounts: [],
      }),
    ).toThrow(/name/i);
    expect(() =>
      parseImportedSavedLists({
        name: 'Bad URL',
        platform: 'instagram',
        accounts: [
          {
            username: 'example',
            profileUrl: 'https://www.tiktok.com/@example',
          },
        ],
      }),
    ).toThrow(/instagram profile URL/i);
    expect(() =>
      parseImportedSavedLists({
        name: 'No accounts',
        platform: 'instagram',
      }),
    ).toThrow(/accounts/i);
  });

  it('exports only saved list fields and clears lists', async () => {
    const list = await createSavedList('Export me', 'instagram');
    await addSavedProfile(list.id, { username: 'example' });
    const exportPayload = buildSavedListsExport(await getSavedLists());

    expect(exportPayload.app).toBe('MediaVault');
    expect(exportPayload.lists[0]?.accounts[0]?.username).toBe('example');
    expect(exportPayload.lists[0]?.accounts[0]?.profileUrl).toContain(
      'instagram.com/example',
    );

    await clearSavedLists();
    await expect(getSavedLists()).resolves.toEqual([]);
  });

  it('runs a local profile workflow sequentially and stops it', async () => {
    const list = await createSavedList('Workflow', 'instagram');
    await addSavedProfile(list.id, { username: 'one' });
    await addSavedProfile(list.id, { username: 'two' });
    const profiles = (await getSavedLists())[0]!.accounts;

    const workflow = await startProfileWorkflow(profiles);
    expect(workflow.index).toBe(0);
    expect(workflow.profiles).toHaveLength(2);

    const next = await advanceProfileWorkflow(workflow);
    expect(next?.index).toBe(1);
    expect((await getProfileWorkflow())?.index).toBe(1);

    expect(await advanceProfileWorkflow(next!)).toBeNull();
    await stopProfileWorkflow();
    expect(await getProfileWorkflow()).toBeNull();
  });
});
