import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { SettingsProvider } from '@/components/providers/SettingsProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { FormatSection } from '@/options/sections/FormatSection';
import { getSettings } from '@/storage/settings';

function renderFormat() {
  return render(
    <SettingsProvider>
      <ToastProvider>
        <FormatSection />
      </ToastProvider>
    </SettingsProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe('format and quality settings', () => {
  it('saves image, video, thumbnail, caption, and metadata preferences', async () => {
    const user = userEvent.setup();
    renderFormat();

    expect(await screen.findByText('Format & quality')).toBeTruthy();
    expect(
      screen.getByText(/does not upscale, merge separate/i),
    ).toBeTruthy();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Image output format' }),
      'webp',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Video quality preference' }),
      'source',
    );

    await user.click(
      screen.getByRole('switch', { name: 'Download thumbnails' }),
    );
    await user.click(screen.getByRole('switch', { name: 'Save captions as text' }));
    await user.click(screen.getByRole('switch', { name: 'Save source metadata' }));

    expect(
      await screen.findByRole('button', { name: 'Allow media processing' }),
    ).toBeTruthy();

    const settings = await getSettings();
    expect(settings.imageFormat).toBe('webp');
    expect(settings.videoQuality).toBe('source');
    expect(settings.downloadThumbnails).toBe(true);
    expect(settings.saveCaption).toBe(true);
    expect(settings.saveMetadata).toBe(true);
  });

  it('grants media processing access for local conversion', async () => {
    const user = userEvent.setup();
    renderFormat();

    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Image output format' }),
      'png',
    );

    const grant = await screen.findByRole('button', {
      name: 'Allow media processing',
    });
    await user.click(grant);

    expect(await screen.findByText('Access granted')).toBeTruthy();
  });
});
