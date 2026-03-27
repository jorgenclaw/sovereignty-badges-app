import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { SimplePool } from 'nostr-tools/pool';
import { BADGES, ISSUER_PUBKEY, RELAYS } from '../constants/badges';
import BadgeCard from '../components/BadgeCard';

interface UserProfile {
  name: string;
  picture?: string;
  nip05?: string;
}

async function resolveToHex(id: string): Promise<string> {
  const trimmed = id.trim();

  // If it starts with npub, decode directly
  if (trimmed.startsWith('npub1')) {
    const { type, data } = nip19.decode(trimmed);
    if (type !== 'npub') throw new Error('Invalid npub');
    return data as string;
  }

  // Otherwise treat as NIP-05 name on jorgenclaw.ai
  const name = trimmed.replace(/^@/, '');
  const resp = await fetch(
    `https://jorgenclaw.ai/.well-known/nostr.json?name=${encodeURIComponent(name)}`
  );
  if (!resp.ok) throw new Error(`NIP-05 lookup failed (${resp.status})`);
  const json = await resp.json();
  const hex = json.names?.[name];
  if (!hex) throw new Error(`No Nostr pubkey found for "${name}"`);
  return hex;
}

export default function ShelfPage() {
  const { id } = useParams<{ id: string }>();
  const [earnedIds, setEarnedIds] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [resolvedHex, setResolvedHex] = useState('');
  const [copied, setCopied] = useState(false);

  const lookup = useCallback(async (identifier: string) => {
    setError('');
    setLoading(true);
    setEarnedIds(null);
    setProfile(null);

    try {
      const hex = await resolveToHex(identifier);
      setResolvedHex(hex);

      const pool = new SimplePool();
      const earned = new Set<string>();

      try {
        // Fetch badge awards and profile in parallel
        const [events, profiles] = await Promise.all([
          pool.querySync(RELAYS, {
            kinds: [8],
            authors: [ISSUER_PUBKEY],
            '#p': [hex],
          }),
          pool.querySync(RELAYS, {
            kinds: [0],
            authors: [hex],
            limit: 1,
          }),
        ]);

        for (const ev of events) {
          const aTag = ev.tags.find((t: string[]) => t[0] === 'a');
          if (aTag) {
            const parts = aTag[1].split(':');
            const badgeId = parts[parts.length - 1];
            earned.add(badgeId);
          }
          const dTag = ev.tags.find((t: string[]) => t[0] === 'd');
          if (dTag) {
            earned.add(dTag[1]);
          }
        }

        // Parse profile
        if (profiles.length > 0) {
          try {
            const content = JSON.parse(profiles[0].content);
            setProfile({
              name: content.display_name || content.name || '',
              picture: content.picture,
              nip05: content.nip05,
            });
          } catch {
            // ignore parse errors
          }
        }
      } finally {
        pool.close(RELAYS);
      }

      setEarnedIds(earned);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not resolve this identifier. Try an npub or a NIP-05 handle.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      lookup(decodeURIComponent(id));
    }
  }, [id, lookup]);

  const shareUrl = `https://sovereignty.jorgenclaw.ai/app/p/${id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sort badges: human -> agent -> shared, then by tier
  const trackOrder = { human: 0, agent: 1, both: 2 };
  const sortedBadges = [...BADGES].sort((a, b) => {
    const trackDiff = trackOrder[a.track] - trackOrder[b.track];
    if (trackDiff !== 0) return trackDiff;
    return a.tier - b.tier;
  });

  if (!id) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-text-secondary">No identifier provided.</p>
        <Link to="/" className="text-track-agent text-sm mt-4 inline-block">
          Go to homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {loading ? (
        <div className="text-center py-16">
          <p className="text-text-secondary">Loading badges from relays...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-red-400 mb-4">{error}</p>
          <Link to="/" className="text-track-agent text-sm">
            &larr; Try a different identifier
          </Link>
        </div>
      ) : (
        <>
          {/* Profile header */}
          <div className="text-center mb-10">
            {profile?.picture && (
              <img
                src={profile.picture}
                alt=""
                className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-2 border-border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <h1 className="text-3xl font-bold text-text-primary mb-1">
              {profile?.name || decodeURIComponent(id)}
            </h1>
            {profile?.nip05 && (
              <p className="text-text-secondary text-sm mb-1">{profile.nip05}</p>
            )}
            {resolvedHex && (
              <p className="text-text-secondary/50 text-xs font-mono">
                {nip19.npubEncode(resolvedHex).slice(0, 16)}...
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="text-center mb-6">
            <p className="text-text-secondary text-sm">
              {earnedIds?.size || 0} of {BADGES.length} badges earned
            </p>
          </div>

          {/* Badge grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                earned={earnedIds?.has(badge.id) ?? false}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-lg bg-surface border border-border text-text-secondary text-sm hover:text-text-primary hover:border-surface-light transition-colors"
            >
              {copied ? 'Copied!' : 'Share my shelf'}
            </button>
            <Link
              to="/claim"
              className="px-4 py-2 rounded-lg bg-track-agent/20 border border-track-agent/30 text-track-agent text-sm hover:bg-track-agent/30 transition-colors"
            >
              Claim more badges &rarr;
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
