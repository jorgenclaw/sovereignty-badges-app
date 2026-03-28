import { useQuery } from '@tanstack/react-query';
import { SimplePool } from 'nostr-tools/pool';
import type { Filter } from 'nostr-tools';
import { RELAYS } from '../constants/badges';

const pool = new SimplePool();

/**
 * Generic hook to query Nostr relays via TanStack Query.
 * Returns cached results and handles loading/error states.
 */
export function useNostrQuery<T = any>(
  key: string[],
  filter: Filter,
  opts?: {
    enabled?: boolean;
    select?: (events: any[]) => T;
    refetchInterval?: number;
  },
) {
  return useQuery({
    queryKey: ['nostr', ...key],
    queryFn: async () => {
      const events = await pool.querySync(RELAYS, filter);
      return events;
    },
    enabled: opts?.enabled ?? true,
    select: opts?.select,
    refetchInterval: opts?.refetchInterval,
  });
}
