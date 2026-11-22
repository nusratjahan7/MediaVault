import type { ReactNode } from 'react';
import { BrandMark } from './BrandMark';
import { Container } from './Container';
import { MobilePageLinks, PageNav, type PageNavId } from './PageNav';

export interface PageShellProps {
  active: PageNavId;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function PageShell({ active, title, description, actions, children }: PageShellProps) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/85 backdrop-blur">
        <Container className="flex h-14 max-w-5xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark />
            <div className="min-w-0">
              <p className="truncate text-sm leading-tight font-semibold tracking-tight text-fg">
                MediaVault
              </p>
              <p className="truncate text-[10px] leading-tight text-muted">
                Private, local media
              </p>
            </div>
          </div>

          <PageNav active={active} />
        </Container>
      </header>

      <Container className="max-w-5xl py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
            {description && (
              <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-muted">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>

        <div className="mt-6 space-y-5">{children}</div>

        <MobilePageLinks active={active} />
      </Container>
    </div>
  );
}
