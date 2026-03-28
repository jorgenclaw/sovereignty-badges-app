import { useNostrQuery } from './useNostr';

/**
 * Fetches kind:30008 (profile badges) for a given hex pubkey.
 * Returns whether the user has published profile badges.
 */
export function useProfileBadges(hexPubkey: string | undefined) {
  return useNostrQuery<boolean>(
    ['profile-badges', hexPubkey ?? ''],
    { kinds: [30008], authors: [hexPubkey!], '#d': ['profile_badges'], limit: 1 },
    {
      enabled: !!hexPubkey,
      select: (events) => events.length > 0,
    },
  );
}
