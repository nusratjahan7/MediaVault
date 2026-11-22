export type ThemePreference = 'system' | 'light' | 'dark';

export type ImageFormatPreference = 'original' | 'jpeg' | 'png' | 'webp';

export type VideoQualityPreference = 'highest' | 'source';

export interface FilenameTemplate {
  id: string;
  name: string;
  template: string;
}

export interface Settings {
  theme: ThemePreference;
  downloadSubfolder: string;
  filenameTemplate: string;
  filenameTemplates: FilenameTemplate[];
  selectedFilenameTemplateId?: string;
  organizeByAccount: boolean;
  organizeByCategory: boolean;
  splitByMediaType: boolean;
  autoScan: boolean;
  historyEnabled: boolean;
  maxHistoryEntries: number;
  demoMode: boolean;
  askWhereToSave: boolean;
  skipDownloaded: boolean;
  downloadConcurrency: number;
  imageFormat: ImageFormatPreference;
  videoQuality: VideoQualityPreference;
  downloadThumbnails: boolean;
  saveCaption: boolean;
  saveMetadata: boolean;
}
