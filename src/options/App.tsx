import { Moon, Sun } from 'lucide-react';
import { BrandMark } from '@/components/layout/BrandMark';
import { Container } from '@/components/layout/Container';
import { IconButton } from '@/components/ui/IconButton';
import { useTheme } from '@/hooks/useTheme';
import { APP_VERSION } from '@/constants';
import { AboutSection } from './sections/AboutSection';
import { AppearanceSection } from './sections/AppearanceSection';
import { DownloadSection } from './sections/DownloadSection';
import { PrivacySection } from './sections/PrivacySection';
import { SitesSection } from './sections/SitesSection';

const NAV_ITEMS = [
  { href: '#appearance', label: 'Appearance' },
  { href: '#downloads', label: 'Downloads' },
  { href: '#sites', label: 'Site access' },
  { href: '#privacy', label: 'Privacy & data' },
  { href: '#about', label: 'About' },
];

export function App() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/85 backdrop-blur">
        <Container className="flex h-14 max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <div>
              <p className="text-sm leading-tight font-semibold tracking-tight text-fg">
                MediaVault
              </p>
              <p className="text-[10px] leading-tight text-muted">Settings · v{APP_VERSION}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span className="mr-1 hidden text-[11px] text-muted sm:inline">
              All preferences stay on this device
            </span>
            <IconButton
              label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={() => {
                void setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
              }}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="size-4" aria-hidden="true" />
              ) : (
                <Moon className="size-4" aria-hidden="true" />
              )}
            </IconButton>
          </div>
        </Container>
      </header>

      <Container className="max-w-5xl py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Settings</h1>
          <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-muted">
            Control how MediaVault looks, where files are saved, which sites it can read, and
            what stays in local storage.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[170px_minmax(0,1fr)]">
          <nav aria-label="Settings sections" className="hidden lg:block">
            <div className="sticky top-20 space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-elevated hover:text-fg"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </nav>

          <div className="min-w-0 space-y-5">
            <AppearanceSection />
            <DownloadSection />
            <SitesSection />
            <PrivacySection />
            <AboutSection />

            <p className="px-1 pb-2 text-center text-[10px] leading-relaxed text-muted">
              MediaVault never uploads media, cookies, or browsing data. Only save content you
              have permission to access.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
