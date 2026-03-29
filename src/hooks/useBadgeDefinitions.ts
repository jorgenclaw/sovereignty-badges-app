import { useQuery } from '@tanstack/react-query';
import { SimplePool } from 'nostr-tools/pool';
import { BADGES, ISSUER_PUBKEY, RELAYS } from '../constants/badges';

/** Extract leading emoji from a badge name like "📧 Encrypted Email" → "📧" */
function extractLeadingEmoji(name: string): string {
  const parts = name.split(' ');
  return parts[0] && /\P{ASCII}/u.test(parts[0]) ? parts[0] : '';
}

export interface BadgeDef {
  id: string;        // d-tag
  name: string;      // from "name" tag
  description: string; // from "description" tag
  emoji: string;     // from "emoji" tag or first char of name
  type: 'human' | 'agent'; // from "type" tag
  tier: 'foundation' | 'sovereign'; // from "tier" tag
  image?: string;    // from "image" tag
  verification?: 'honor' | 'prove' | 'auto' | 'pay'; // claim verification type
  verificationHint?: string;
  track?: string;    // backward compat with old constants
}

/** Convert the static BADGES constant into BadgeDef[] as fallback data */
function staticBadgesAsFallback(): BadgeDef[] {
  return BADGES.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    emoji: b.emoji,
    type: b.track === 'both' ? 'human' : (b.track as 'human' | 'agent'),
    tier: b.tier <= 1 ? 'foundation' as const : 'sovereign' as const,
  }));
}

export function useBadgeDefinitions() {
  return useQuery({
    queryKey: ['badge-definitions'],
    queryFn: async () => {
      const pool = new SimplePool();
      try {
        const rawEvents = await pool.querySync(RELAYS, {
          kinds: [30009],
          authors: [ISSUER_PUBKEY],
        });

        // Deduplicate by d-tag — keep only the most recent event per d-tag
        const latestByDTag = new Map<string, typeof rawEvents[0]>();
        for (const event of rawEvents) {
          const dtag = event.tags.find(t => t[0] === 'd')?.[1];
          if (!dtag) continue;
          const existing = latestByDTag.get(dtag);
          if (!existing || event.created_at > existing.created_at) {
            latestByDTag.set(dtag, event);
          }
        }
        const events = Array.from(latestByDTag.values());

        const badges: BadgeDef[] = [];
        for (const ev of events) {
          const tags = Object.fromEntries(
            ev.tags.filter(t => t.length >= 2).map(t => [t[0], t[1]])
          );

          // Skip retired badges
          if (ev.tags.some(t => t[0] === 'status' && t[1] === 'retired')) continue;

          // Skip old events without a type tag (pre-rebuild artifacts)
          const typeTag = ev.tags.find(t => t[0] === 'type')?.[1];
          if (typeTag && typeTag !== 'human' && typeTag !== 'agent') continue;

          const dTag = tags['d'];
          if (!dTag) continue;

          badges.push({
            id: dTag,
            name: tags['name'] || dTag.replace(/-/g, ' '),
            description: tags['description'] || '',
            emoji: tags['emoji'] || extractLeadingEmoji(tags['name'] || '') || '',
            type: (tags['type'] as 'human' | 'agent') || (dTag.includes('agent') ? 'agent' : 'human'),
            tier: (tags['tier'] as 'foundation' | 'sovereign') || 'foundation',
            image: ev.tags.find(t => t[0] === 'image')?.[1],
          });
        }

        // Sort: foundation first, then sovereign; within each tier, human then agent
        badges.sort((a, b) => {
          const tierOrder = { foundation: 0, sovereign: 1 };
          const typeOrder = { human: 0, agent: 1 };
          const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
          if (tierDiff !== 0) return tierDiff;
          return typeOrder[a.type] - typeOrder[b.type];
        });

        // If relay returned nothing, fall back to static data
        if (badges.length === 0) {
          return staticBadgesAsFallback();
        }

        return badges;
      } finally {
        pool.close(RELAYS);
      }
    },
    placeholderData: staticBadgesAsFallback(),
    staleTime: 5 * 60_000, // 5 min cache
  });
}
