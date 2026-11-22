import {
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
  UserMinus,
} from 'lucide-react';
import type { SavedList } from '@/types/lists';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { IconButton } from '../ui/IconButton';
import { PlatformBadge } from '../media/PlatformBadge';

export interface SavedListCardProps {
  list: SavedList;
  selectedKeys: Set<string>;
  onToggleProfile: (listId: string, profileId: string) => void;
  onAddProfile: (list: SavedList) => void;
  onRemoveProfile: (listId: string, profileId: string) => void;
  onRename: (list: SavedList) => void;
  onDelete: (list: SavedList) => void;
}

export function SavedListCard({
  list,
  selectedKeys,
  onToggleProfile,
  onAddProfile,
  onRemoveProfile,
  onRename,
  onDelete,
}: SavedListCardProps) {
  const selectedCount = list.accounts.filter((profile) =>
    selectedKeys.has(`${list.id}:${profile.id}`),
  ).length;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-semibold tracking-tight text-fg">
              {list.name}
            </p>
            <PlatformBadge platform={list.platform} />
            {selectedCount > 0 && (
              <Badge tone="accent">{selectedCount} selected</Badge>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-muted">
            {list.accounts.length} {list.accounts.length === 1 ? 'profile' : 'profiles'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton label={`Rename ${list.name}`} size="sm" onClick={() => onRename(list)}>
            <Pencil className="size-3.5" aria-hidden="true" />
          </IconButton>
          <IconButton label={`Delete ${list.name}`} size="sm" onClick={() => onDelete(list)}>
            <Trash2 className="size-3.5" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div className="divide-y divide-border">
        {list.accounts.length === 0 ? (
          <p className="px-3 py-4 text-center text-[11px] text-muted">
            No profiles yet. Add one by username or profile URL.
          </p>
        ) : (
          list.accounts.map((profile) => {
            const key = `${list.id}:${profile.id}`;
            return (
              <div
                key={profile.id}
                className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-bg/60"
              >
                <input
                  type="checkbox"
                  checked={selectedKeys.has(key)}
                  onChange={() => onToggleProfile(list.id, profile.id)}
                  aria-label={`Select ${profile.username}`}
                  className="size-3.5 shrink-0 accent-[var(--color-accent)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-fg">
                    {profile.displayName ?? profile.username}
                  </p>
                  <p className="truncate text-[10px] text-muted">@{profile.username}</p>
                </div>
                <a
                  href={profile.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-6 items-center gap-1 rounded px-1.5 text-[10px] text-muted transition-colors hover:bg-elevated hover:text-fg"
                  title={profile.profileUrl}
                >
                  Open
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
                <IconButton
                  label={`Remove ${profile.username}`}
                  size="sm"
                  onClick={() => onRemoveProfile(list.id, profile.id)}
                >
                  <UserMinus className="size-3.5" aria-hidden="true" />
                </IconButton>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          block
          onClick={() => onAddProfile(list)}
          icon={<Plus className="size-3.5" aria-hidden="true" />}
        >
          Add profile
        </Button>
      </div>
    </Card>
  );
}
