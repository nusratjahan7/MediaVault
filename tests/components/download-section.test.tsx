import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { SettingsProvider } from '@/components/providers/SettingsProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { DownloadSection } from '@/options/sections/DownloadSection';
import { DEFAULT_SETTINGS, getSettings } from '@/storage/settings';

function renderDownloads() {
  return render(
    <SettingsProvider>
      <ToastProvider>
        <DownloadSection />
      </ToastProvider>
    </SettingsProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe('download folder and filename settings', () => {
  it('selects and saves a reusable template, toggles folders, and resets', async () => {
    const user = userEvent.setup();
    renderDownloads();

    expect(await screen.findByText('Downloads')).toBeTruthy();
    expect(screen.getByText(/Path preview/)).toBeTruthy();
    expect(screen.getByText('Download new media only')).toBeTruthy();
    expect(screen.getByText('Automatic retries')).toBeTruthy();
    expect(screen.getByText('Confirm before bulk download')).toBeTruthy();
    expect(screen.getByText('Show download notifications')).toBeTruthy();

    const templateSelect = screen.getByRole('combobox', {
      name: 'Select a filename template',
    });
    await user.selectOptions(templateSelect, 'dated');

    const templateInput = screen.getByLabelText('Filename template');
    expect((templateInput as HTMLInputElement).value).toBe(
      '{date}-{username}-{id}',
    );

    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    let settings = await getSettings();
    expect(settings.selectedFilenameTemplateId).toBe('dated');
    expect(settings.filenameTemplate).toBe('{date}-{username}-{id}');

    await user.click(
      screen.getByRole('switch', { name: 'Create a folder per account' }),
    );
    await user.click(
      screen.getByRole('switch', { name: 'Split folders by media type' }),
    );

    settings = await getSettings();
    expect(settings.organizeByAccount).toBe(true);
    expect(settings.splitByMediaType).toBe(true);

    await user.type(
      screen.getByRole('textbox', { name: 'New template name' }),
      'Captioned',
    );
    await user.click(screen.getByRole('button', { name: 'Save as template' }));

    settings = await getSettings();
    expect(
      settings.filenameTemplates.some((template) => template.name === 'Captioned'),
    ).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Reset to default' }));
    settings = await getSettings();
    expect(settings.filenameTemplate).toBe(DEFAULT_SETTINGS.filenameTemplate);
    expect(settings.selectedFilenameTemplateId).toBe('default');
  });
});
