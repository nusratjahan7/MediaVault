import { describe, expect, it } from 'vitest';
import { parseRelationshipImport } from '@/services/relationship-import';
import {
  buildRelationshipRows,
  filterRelationships,
  relationshipsToCsv,
  relationshipsToJson,
} from '@/utils/relationship-export';

const JSON_EXPORT = JSON.stringify({
  relationships_following: [
    {
      title: '',
      string_list_data: [
        {
          href: 'https://www.instagram.com/alice/',
          value: 'alice',
        },
      ],
    },
    {
      title: '',
      string_list_data: [
        {
          href: 'https://www.instagram.com/bob/',
          value: 'bob',
        },
      ],
    },
  ],
});

const CSV_EXPORT = [
  'Username,Profile URL,Display Name',
  'alice,https://www.instagram.com/alice/,Alice',
  '"bob,jr",https://www.instagram.com/bobjr/,Bob Jr',
].join('\n');

describe('relationship import', () => {
  it('parses an official Instagram JSON export using allowed fields only', () => {
    const entries = parseRelationshipImport(JSON_EXPORT, {
      platform: 'instagram',
      kind: 'following',
      fileName: 'followers.json',
    });

    expect(entries).toEqual([
      {
        username: 'alice',
        profileUrl: 'https://www.instagram.com/alice/',
      },
      {
        username: 'bob',
        profileUrl: 'https://www.instagram.com/bob/',
      },
    ]);
  });

  it('parses CSV with quoted values and headers', () => {
    const entries = parseRelationshipImport(CSV_EXPORT, {
      platform: 'instagram',
      kind: 'followers',
      fileName: 'followers.csv',
    });

    expect(entries).toHaveLength(2);
    expect(entries[1]?.username).toBe('bob,jr');
    expect(entries[1]?.displayName).toBe('Bob Jr');
  });

  it('does not mix following rows into a followers import', () => {
    expect(() =>
      parseRelationshipImport(JSON_EXPORT, {
        platform: 'instagram',
        kind: 'followers',
        fileName: 'following.json',
      }),
    ).toThrow(/No followers rows/i);
  });

  it('rejects malformed, empty, or unrelated data', () => {
    expect(() =>
      parseRelationshipImport('{nope', {
        platform: 'instagram',
        kind: 'followers',
        fileName: 'bad.json',
      }),
    ).toThrow(/valid JSON/i);

    expect(() =>
      parseRelationshipImport('', {
        platform: 'instagram',
        kind: 'followers',
      }),
    ).toThrow(/empty/i);

    expect(() =>
      parseRelationshipImport('{"foo":[]}', {
        platform: 'instagram',
        kind: 'followers',
        fileName: 'unrelated.json',
      }),
    ).toThrow(/No followers rows/i);
  });

  it('ignores unknown private fields and normalizes mismatched profile URLs', () => {
    const entries = parseRelationshipImport(
      JSON.stringify([
        {
          username: 'alice',
          profileUrl: 'https://www.tiktok.com/@alice',
          email: 'alice@example.com',
          phone: '123',
        },
      ]),
      {
        platform: 'instagram',
        kind: 'followers',
        fileName: 'data.json',
      },
    );

    expect(entries[0]).toEqual({
      username: 'alice',
      profileUrl: 'https://www.instagram.com/alice/',
    });
  });
});

describe('relationship export fields', () => {
  const entries = [
    {
      username: 'alice',
      profileUrl: 'https://www.instagram.com/alice/',
      displayName: 'Alice',
    },
    {
      username: 'bob',
      profileUrl: 'https://www.instagram.com/bob/',
    },
  ];

  it('filters before export', () => {
    expect(filterRelationships(entries, 'ali')).toHaveLength(1);
    expect(filterRelationships(entries, 'instagram.com/bob')).toHaveLength(1);
  });

  it('selects fields for JSON and CSV', () => {
    expect(buildRelationshipRows(entries, ['username', 'displayName'])[0]).toEqual({
      username: 'alice',
      displayName: 'Alice',
    });

    const csv = relationshipsToCsv(entries, ['username', 'profileUrl']);
    expect(csv).toBe(
      [
        'username,profileUrl',
        'alice,https://www.instagram.com/alice/',
        'bob,https://www.instagram.com/bob/',
      ].join('\r\n'),
    );

    const json = JSON.parse(
      relationshipsToJson(entries, ['username', 'displayName']),
    ) as Array<Record<string, string>>;
    expect(json[0]).toEqual({ username: 'alice', displayName: 'Alice' });
    expect(json[1]).toEqual({ username: 'bob' });
  });

  it('escapes CSV values safely', () => {
    const csv = relationshipsToCsv(
      [
        {
          username: 'a"b',
          displayName: 'Line, "one"',
        },
      ],
      ['username', 'displayName'],
    );

    expect(csv).toContain('"a""b"');
    expect(csv).toContain('"Line, ""one"""');
  });
});
