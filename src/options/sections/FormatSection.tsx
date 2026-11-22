import { useEffect, useState } from 'react';
import { Images, ShieldCheck, Video } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/hooks/useToast';
import {
  hasMediaProcessingAccess,
  requestMediaProcessingAccess,
} from '@/services/permissions';
import type {
  ImageFormatPreference,
  VideoQualityPreference,
} from '@/types/settings';

const IMAGE_LABELS: Record<ImageFormatPreference, string> = {
  original: 'Original format',
  jpeg: 'JPG (local conversion)',
  png: 'PNG (local conversion)',
  webp: 'WebP (local conversion)',
};

export function FormatSection() {
  const { settings, updateSettings } = useSettings();
  const { toast } = useToast();
  const [mediaAccess, setMediaAccess] = useState<boolean | null>(null);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    let active = true;
    hasMediaProcessingAccess().then((granted) => {
      if (active) {
        setMediaAccess(granted);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const requestAccess = async () => {
    setRequesting(true);

    try {
      const granted = await requestMediaProcessingAccess();
      setMediaAccess(granted);
      toast({
        title: granted ? 'Media processing allowed' : 'Access not granted',
        description: granted
          ? 'Local image conversion can now read media from supported CDNs.'
          : 'Image conversion will fall back to the original format without this access.',
        variant: granted ? 'success' : 'error',
      });
    } finally {
      setRequesting(false);
    }
  };

  const imageLabel = IMAGE_LABELS[settings.imageFormat];
  const videoLabel =
    settings.videoQuality === 'highest'
      ? 'Highest legitimately available source'
      : 'Exact source URL';

  return (
    <Section
      id="formats"
      title="Format & quality"
      description="Choose output preferences. Actual downloaded format and source quality are recorded on each history and queue entry."
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium text-fg">
              <Images className="size-3.5 text-muted" aria-hidden="true" />
              Image output
            </p>
            <p className="mt-0.5 max-w-[60ch] text-[11px] leading-relaxed text-muted">
              Conversion happens locally with the browser canvas. It re-encodes the image, so it
              is not lossless. Unsupported image types keep their original format.
            </p>
          </div>
          <Select
            value={settings.imageFormat}
            onChange={(event) => {
              const imageFormat = event.target.value as ImageFormatPreference;
              void updateSettings({ imageFormat });
            }}
            aria-label="Image output format"
            wrapperClassName="w-full sm:w-52"
          >
            <option value="original">Original format</option>
            <option value="jpeg">JPG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
          </Select>
        </div>

        {settings.imageFormat !== 'original' && (
          <div className="rounded-md border border-border bg-bg px-3 py-2.5">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-fg">Media processing access</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                  Required to read images from supported media CDNs for local conversion. Images
                  are never uploaded. If access is denied, downloads fall back to the original
                  format and the note appears in history.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {mediaAccess ? (
                    <span className="text-[10px] font-medium text-success">
                      Access granted
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={requesting}
                      onClick={() => void requestAccess()}
                    >
                      Allow media processing
                    </Button>
                  )}
                  <span className="text-[10px] text-muted">{imageLabel}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium text-fg">
              <Video className="size-3.5 text-muted" aria-hidden="true" />
              Video quality
            </p>
            <p className="mt-0.5 max-w-[60ch] text-[11px] leading-relaxed text-muted">
              Picks the best exposed source. MediaVault does not upscale, merge separate
              audio/video streams, or promise 4K/60fps/lossless output. Audio is preserved only
              when it is included in the selected source file.
            </p>
          </div>
          <Select
            value={settings.videoQuality}
            onChange={(event) => {
              void updateSettings({
                videoQuality: event.target.value as VideoQualityPreference,
              });
            }}
            aria-label="Video quality preference"
            wrapperClassName="w-full sm:w-52"
          >
            <option value="highest">Highest available source</option>
            <option value="source">Exact source URL</option>
          </Select>
        </div>

        <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-fg">Download thumbnails</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                Adds a thumbnail sidecar when the page exposes one that differs from the
              downloaded media.
              </p>
            </div>
            <Toggle
              checked={settings.downloadThumbnails}
              onChange={(checked) => void updateSettings({ downloadThumbnails: checked })}
              label="Download thumbnails"
            />
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-fg">Save captions as text</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                Writes a <code>.caption.txt</code> sidecar when a caption exists.
              </p>
            </div>
            <Toggle
              checked={settings.saveCaption}
              onChange={(checked) => void updateSettings({ saveCaption: checked })}
              label="Save captions as text"
            />
          </div>

          <div className="flex items-start justify-between gap-3 sm:col-span-2">
            <div>
              <p className="text-xs font-medium text-fg">Save source metadata</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                Writes a <code>.metadata.json</code> sidecar with source URL, page URL,
                publication date, caption, location when available, and the selected/actual
                output.
              </p>
            </div>
            <Toggle
              checked={settings.saveMetadata}
              onChange={(checked) => void updateSettings({ saveMetadata: checked })}
              label="Save source metadata"
            />
          </div>
        </div>

        <div className="rounded-md border border-accent/20 bg-accent/5 px-3 py-2.5 text-[11px] leading-relaxed text-muted">
          <span className="font-medium text-fg">Selected:</span> image {imageLabel}; video{' '}
          {videoLabel}. <span className="font-medium text-fg">Actual:</span> the queued output
          format/quality is shown per item in the queue and download history.
        </div>
      </div>
    </Section>
  );
}
