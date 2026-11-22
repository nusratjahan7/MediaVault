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

export function parseTikTokEmbeddedState(document: Document): TikTokEmbeddedItem | null {
  const universal = readJsonScript(document, 'script#__UNIVERSAL_DATA_FOR_REHYDRATION__');
  if (universal) {
    const scope = asRecord(universal['__DEFAULT_SCOPE__']);
    const detail = asRecord(scope?.['webapp.video-detail']);
    const itemInfo = asRecord(detail?.itemInfo);
    const itemStruct = asRecord(itemInfo?.itemStruct);
    const item = extractItem(itemStruct);
    if (item) {
      return item;
    }
  }

  const sigi = readJsonScript(document, 'script#SIGI_STATE');
  if (sigi) {
    const itemModule = asRecord(sigi.ItemModule);
    if (itemModule) {
      for (const value of Object.values(itemModule)) {
        const item = extractItem(asRecord(value));
        if (item) {
          return item;
        }
      }
    }
  }

  return null;
}
