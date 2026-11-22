export type ThemePreference = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemePreference;
  downloadSubfolder: string;
  filenameTemplate: string;
  autoScan: boolean;
  historyEnabled: boolean;
  maxHistoryEntries: number;
  demoMode: boolean;
  askWhereToSave: boolean;
  skipDownloaded: boolean;
}
