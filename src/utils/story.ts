export function formatStoryExpiration(
  expiresAt: number | undefined,
  now = Date.now(),
): string {
  if (expiresAt === undefined) {
    return 'Expiration unknown';
  }

  const remaining = expiresAt - now;
  if (remaining <= 0) {
    return 'Expired';
  }

  const hours = Math.ceil(remaining / (60 * 60 * 1000));
  return hours < 24
    ? `Expires in ${hours}h`
    : `Expires in ${Math.ceil(hours / 24)}d`;
}

export function storyGroupKey(account: {
  username?: string;
  displayName?: string;
} | null): string {
  return account?.username ?? account?.displayName ?? 'Unknown account';
}
