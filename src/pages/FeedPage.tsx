import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { SimplePool } from 'nostr-tools/pool';
import { BADGES, ISSUER_PUBKEY, RELAYS } from '../constants/badges';

interface FeedItem {
  id: string;
  recipientHex: string;
  recipientNpub: string;
  badgeId: string;
  badgeName: string;
  badgeEmoji: string;
  timestamp: number;
  profile?: {
    name: string;
    picture?: string;
  };
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const pool = new SimplePool();

    async function fetchFeed() {
      try {
        const events = await pool.querySync(RELAYS, {
          kinds: [8],
          authors: [ISSUER_PUBKEY],
          limit: 50,
        });

        if (cancelled) return;

        const feedItems: FeedItem[] = [];

        for (const ev of events) {
          const pTag = ev.tags.find((t: string[]) => t[0] === 'p');
          if (!pTag) continue;

          const recipientHex = pTag[1];
          const recipientNpub = nip19.npubEncode(recipientHex);

          let badgeId = '';
          const aTag = ev.tags.find((t: string[]) => t[0] === 'a');
          if (aTag) {
            const parts = aTag[1].split(':');
            badgeId = parts[parts.length - 1];
          }
          const dTag = ev.tags.find((t: string[]) => t[0] === 'd');
          if (dTag && !badgeId) {
            badgeId = dTag[1];
          }

          const badge = BADGES.find((b) => b.id === badgeId);

          feedItems.push({
            id: ev.id,
            recipientHex,
            recipientNpub,
            badgeId,
            badgeName: badge?.name || badgeId,
            badgeEmoji: badge?.emoji || '',
            timestamp: ev.created_at,
          });
        }

        feedItems.sort((a, b) => b.timestamp - a.timestamp);

        if (cancelled) return;
        setItems(feedItems);

        // Fetch profiles
        const hexKeys = [...new Set(feedItems.map((i) => i.recipientHex))];
        if (hexKeys.length > 0) {
          const profiles = await pool.querySync(RELAYS, {
            kinds: [0],
            authors: hexKeys,
          });

          if (cancelled) return;

          const profileMap = new Map<string, { name: string; picture?: string }>();
          for (const p of profiles) {
            try {
              const content = JSON.parse(p.content);
              const existing = profileMap.get(p.pubkey);
              if (!existing) {
                profileMap.set(p.pubkey, {
                  name: content.display_name || content.name || '',
                  picture: content.picture,
                });
              }
            } catch {
              // ignore parse errors
            }
          }

          setItems((prev) =>
            prev.map((item) => ({
              ...item,
              profile: profileMap.get(item.recipientHex) || item.profile,
            }))
          );
        }
      } catch (err) {
        console.error('Feed fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchFeed();

    return () => {
      cancelled = true;
      pool.close(RELAYS);
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Badge Feed</h1>
        <p className="text-text-secondary">
          Recent badge awards from the Sovereignty by Design program.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-text-secondary">Loading feed from relays...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-secondary mb-2">No badge awards found yet.</p>
          <p className="text-text-secondary text-sm">
            Be the first! <Link to="/badges" className="text-track-agent underline">Browse badges</Link> and claim one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              to={`/p/${item.recipientNpub}`}
              className="block rounded-xl border border-border bg-surface p-4 hover:border-surface-light transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-light overflow-hidden shrink-0 flex items-center justify-center">
                  {item.profile?.picture ? (
                    <img
                      src={item.profile.picture}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-text-secondary text-sm">?</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">
                    <span className="font-medium">
                      {item.profile?.name || `${item.recipientNpub.slice(0, 12)}...`}
                    </span>
                    {' '}earned{' '}
                    <span className="font-medium">
                      {item.badgeEmoji} {item.badgeName}
                    </span>
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {timeAgo(item.timestamp)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
