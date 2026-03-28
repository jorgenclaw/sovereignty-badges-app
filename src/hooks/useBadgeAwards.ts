import { useNostrQuery } from './useNostr';
import { ISSUER_PUBKEY } from '../constants/badges';

/**
 * Fetches kind:8 badge awards for a given hex pubkey from ISSUER_PUBKEY.
 * Returns a Set of badge IDs that have been earned.
 */
export function useBadgeAwards(hexPubkey: string | undefined) {
  return useNostrQuery<Set<string>>(
    ['badge-awards', hexPubkey ?? ''],
    { kinds: [8], authors: [ISSUER_PUBKEY], '#p': [hexPubkey!] },
    {
      enabled: !!hexPubkey,
      select: (events) => {
        const earned = new Set<string>();
        for (const ev of events) {
          const aTag = ev.tags.find((t: string[]) => t[0] === 'a');
          if (aTag) {
            const parts = aTag[1].split(':');
            earned.add(parts[parts.length - 1]);
          }
          const dTag = ev.tags.find((t: string[]) => t[0] === 'd');
          if (dTag) {
            earned.add(dTag[1]);
          }
        }
        return earned;
      },
    },
  );
}
