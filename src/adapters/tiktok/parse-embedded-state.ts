const MAX_STATE_LENGTH = 2_000_000;

type JsonRecord = Record<string, unknown>;

export interface TikTokEmbeddedItem {
  id?: string;
  author?: string;
  authorName?: string;
  caption?: string;
  videoUrl?: string;
  downloadUrl?: string;
  coverUrl?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  publishedAt?: number;
  imageUrls: string[];
}

function asRecord(value: unknown): JsonRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined;
}

function readString(record: JsonRecord | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(record: JsonRecord | undefined, key: string): number | undefined {
  const value = record?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function readJsonScript(document: Document, selector: string): JsonRecord | undefined {
  const text = document.querySelector<HTMLScriptElement>(selector)?.textContent;
  if (!text || text.length > MAX_STATE_LENGTH) {
    return undefined;
  }

  try {
    return asRecord(JSON.parse(text));
  } catch {
    return undefined;
  }
}

function readImageUrls(itemStruct: JsonRecord): string[] {
  const imagePost = asRecord(itemStruct.imagePost);
  const images = Array.isArray(imagePost?.images) ? imagePost.images : [];
  const urls: string[] = [];

  for (const image of images) {
    const record = asRecord(image);
    if (!record) {
      continue;
    }

    const imageUrl = asRecord(record.imageURL);
    const urlList = imageUrl?.urlList;

    if (Array.isArray(urlList)) {
      const first = urlList.find(
        (entry): entry is string => typeof entry === 'string' && entry.length > 0,
      );
      if (first) {
        urls.push(first);
        continue;
      }
    }

    const direct = readString(record, 'displayImage') ?? readString(imageUrl, 'displayImage');
    if (direct) {
      urls.push(direct);
    }
  }

  return urls;
}

function extractItem(itemStruct: JsonRecord | undefined): TikTokEmbeddedItem | null {
  if (!itemStruct) {
    return null;
  }

  const video = asRecord(itemStruct.video);
  const author = asRecord(itemStruct.author);
  const imageUrls = readImageUrls(itemStruct);
  const createTime = readNumber(itemStruct, 'createTime');

  const item: TikTokEmbeddedItem = {
    id: readString(itemStruct, 'id'),
    author: readString(author, 'uniqueId'),
    authorName: readString(author, 'nickname'),
    caption: readString(itemStruct, 'desc'),
    publishedAt:
      createTime !== undefined
        ? createTime < 1_000_000_000_000
          ? createTime * 1000
          : createTime
        : undefined,
    videoUrl: readString(video, 'playAddr'),
    downloadUrl: readString(video, 'downloadAddr'),
    coverUrl:
      readString(video, 'cover') ??
      readString(video, 'originCover') ??
      readString(video, 'dynamicCover'),
    width: readNumber(video, 'width'),
    height: readNumber(video, 'height'),
    durationSeconds: readNumber(video, 'duration'),
    imageUrls,
  };

  return item.author || item.videoUrl || item.downloadUrl || imageUrls.length > 0 ? item : null;
}

function itemKey(item: TikTokEmbeddedItem): string | undefined {
  return item.id ?? item.videoUrl ?? item.downloadUrl ?? item.imageUrls[0];
}

function addItem(
  items: TikTokEmbeddedItem[],
  seen: Set<string>,
  item: TikTokEmbeddedItem | null,
): void {
  if (!item || items.length >= 50) {
    return;
  }

  const key = itemKey(item);
  if (key && seen.has(key)) {
    return;
  }

  if (key) {
    seen.add(key);
  }

  items.push(item);
}

function collectItemArrays(
  record: JsonRecord,
  items: TikTokEmbeddedItem[],
  seen: Set<string>,
  depth = 0,
): void {
  if (depth > 4 || items.length >= 50) {
    return;
  }

  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value) && /item/i.test(key)) {
      for (const entry of value) {
        const entryRecord = asRecord(entry);
        const itemStruct = asRecord(entryRecord?.itemStruct) ?? entryRecord;
        addItem(items, seen, extractItem(itemStruct));
      }
      continue;
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      /(detail|scope|user|challenge|list|item)/i.test(key)
    ) {
      const child = asRecord(value);
      if (child) {
        collectItemArrays(child, items, seen, depth + 1);
      }
    }
  }
}

/**
 * Collects every public item embedded on the current page. Video pages usually
 * contain one item; profile/tag/feed pages may embed an item list. Only page
 * data is used — no signed internal APIs or anti-bot bypasses.
 */
export function parseTikTokEmbeddedItems(document: Document): TikTokEmbeddedItem[] {
  const items: TikTokEmbeddedItem[] = [];
  const seen = new Set<string>();

  const universal = readJsonScript(document, 'script#__UNIVERSAL_DATA_FOR_REHYDRATION__');
  if (universal) {
    const scope = asRecord(universal['__DEFAULT_SCOPE__']);

    if (scope) {
      const detail = asRecord(scope['webapp.video-detail']);
      const itemInfo = asRecord(detail?.itemInfo);
      addItem(items, seen, extractItem(asRecord(itemInfo?.itemStruct)));

      const userDetail = asRecord(scope['webapp.user-detail']);
      if (userDetail) {
        collectItemArrays(userDetail, items, seen);
      }

      collectItemArrays(scope, items, seen);
    }
  }

  const sigi = readJsonScript(document, 'script#SIGI_STATE');
  if (sigi) {
    const itemModule = asRecord(sigi.ItemModule);
    if (itemModule) {
      for (const value of Object.values(itemModule)) {
        addItem(items, seen, extractItem(asRecord(value)));
      }
    }
  }

  return items;
}

export function parseTikTokEmbeddedState(document: Document): TikTokEmbeddedItem | null {
  return parseTikTokEmbeddedItems(document)[0] ?? null;
}
