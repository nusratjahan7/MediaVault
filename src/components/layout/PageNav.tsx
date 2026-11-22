import { cn } from '@/utils/cn';

export type PageNavId =
  | 'dashboard'
  | 'history'
  | 'accounts'
  | 'relationships'
  | 'stories'
  | 'settings';

const ITEMS: Array<{ id: PageNavId; label: string; href: string }> = [
  { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html' },
  { id: 'history', label: 'History', href: 'history.html' },
  { id: 'stories', label: 'Stories', href: 'stories.html' },
  { id: 'accounts', label: 'Accounts', href: 'accounts.html' },
  { id: 'relationships', label: 'Export', href: 'relationships.html' },
  { id: 'settings', label: 'Settings', href: 'options.html' },
];

export function PageNav({ active }: { active: PageNavId }) {
  return (
    <nav aria-label="MediaVault pages" className="hidden items-center gap-0.5 md:flex">
      {ITEMS.map((item) => (
        <a
          key={item.id}
          href={item.href}
          aria-current={item.id === active ? 'page' : undefined}
          className={cn(
            'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
            item.id === active
              ? 'bg-accent/10 text-accent'
              : 'text-muted hover:bg-elevated hover:text-fg',
          )}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

export function MobilePageLinks({ active }: { active: PageNavId }) {
  return (
    <nav
      aria-label="MediaVault pages"
      className="mt-8 flex flex-wrap justify-center gap-2 md:hidden"
    >
      {ITEMS.map((item) => (
        <a
          key={item.id}
          href={item.href}
          aria-current={item.id === active ? 'page' : undefined}
          className={cn(
            'rounded-full border px-3 py-1 text-[11px] font-medium transition-colors',
            item.id === active
              ? 'border-accent/30 bg-accent/10 text-accent'
              : 'border-border bg-surface text-muted hover:text-fg',
          )}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
