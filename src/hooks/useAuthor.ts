import { useNostrQuery } from './useNostr';

interface UserProfile {
  name: string;
  picture?: string;
  nip05?: string;
}

/**
 * Fetches a kind:0 profile for a given hex pubkey.
 */
export function useAuthor(hexPubkey: string | undefined) {
  return useNostrQuery<UserProfile | null>(
    ['author', hexPubkey ?? ''],
    { kinds: [0], authors: [hexPubkey!], limit: 1 },
    {
      enabled: !!hexPubkey,
      select: (events) => {
        if (events.length === 0) return null;
        try {
          const content = JSON.parse(events[0].content);
          return {
            name: content.display_name || content.name || '',
            picture: content.picture,
            nip05: content.nip05,
          };
        } catch {
          return null;
        }
      },
    },
  );
}
