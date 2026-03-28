import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { SimplePool } from 'nostr-tools/pool';
import { BADGES, ISSUER_PUBKEY, RELAYS } from '../constants/badges';
import BadgeCard from '../components/BadgeCard';
import { useSigner } from '../context/SignerContext';
import { useAuthor } from '../hooks/useAuthor';
import { useBadgeAwards } from '../hooks/useBadgeAwards';
import { useProfileBadges } from '../hooks/useProfileBadges';

async function resolveToHex(id: string): Promise<string> {
  const trimmed = id.trim();

  if (trimmed.startsWith('npub1')) {
    const { type, data } = nip19.decode(trimmed);
    if (type !== 'npub') throw new Error('Invalid npub');
    return data as string;
  }

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
  const { pubkey, connected, openModal, signEvent } = useSigner();
  const [resolvedHex, setResolvedHex] = useState('');
  const [resolveError, setResolveError] = useState('');
  const [resolving, setResolving] = useState(true);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Resolve npub/NIP-05 to hex
  useEffect(() => {
    if (!id) return;
    setResolving(true);
    setResolveError('');
    resolveToHex(decodeURIComponent(id))
      .then(setResolvedHex)
      .catch((err) =>
        setResolveError(
          err instanceof Error
            ? err.message
            : 'Could not resolve this identifier. Try an npub or a NIP-05 handle.'
        )
      )
      .finally(() => setResolving(false));
  }, [id]);

  // TanStack Query hooks — enabled only after hex is resolved
  const { data: profile } = useAuthor(resolvedHex || undefined);
  const { data: earnedIds, isLoading: awardsLoading } = useBadgeAwards(resolvedHex || undefined);
  const { data: hasProfileBadges = false } = useProfileBadges(resolvedHex || undefined);

  const loading = resolving || awardsLoading;
  const isOwnShelf = connected && pubkey === resolvedHex;

  const publishProfileBadges = async () => {
    if (!earnedIds || earnedIds.size === 0) return;

    if (!connected) {
      openModal();
      return;
    }

    setPublishing(true);
    try {
      const earnedBadgeIds = Array.from(earnedIds);
      const event = {
        kind: 30008,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['d', 'profile_badges'],
          ...earnedBadgeIds.map(badgeId => ['a', `30009:${ISSUER_PUBKEY}:${badgeId}`, 'wss://nos.lol']),
        ],
        content: '',
      };
      const signed = await signEvent(event);
      const pool = new SimplePool();
      try {
        await Promise.any(pool.publish(RELAYS, signed));
      } finally {
        pool.close(RELAYS);
      }
      setPublishSuccess(true);
      setTimeout(() => setPublishSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to publish profile badges:', err);
      alert('Failed to publish badges. Make sure your signer is connected and try again.');
    } finally {
      setPublishing(false);
    }
  };

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
      ) : resolveError ? (
        <div className="text-center py-16">
          <p className="text-red-400 mb-4">{resolveError}</p>
          <Link to="/" className="text-track-agent text-sm">
            &larr; Try a different identifier
          </Link>
        </div>
      ) : (
        <>
          {/* "Make it mine" banner */}
          {earnedIds && earnedIds.size > 0 && !hasProfileBadges && (isOwnShelf || !connected) && (
            <div className="mb-6 p-4 rounded-lg border border-track-agent/30 bg-track-agent/10">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-text-primary font-medium">
                    You have badges! Publish them to your Nostr profile so they appear everywhere.
                  </p>
                  <p className="text-text-secondary text-sm mt-1">
                    This creates a kind:30008 event that other Nostr clients can read.
                  </p>
                </div>
                <button
                  onClick={publishProfileBadges}
                  disabled={publishing}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-track-agent text-white hover:bg-track-agent/80 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {publishing ? 'Publishing...' : connected ? 'Publish Now' : 'Connect & Publish'}
                </button>
              </div>
            </div>
          )}

          {/* Publish success */}
          {publishSuccess && (
            <div className="mb-6 p-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 text-sm text-center">
              Badges published to your Nostr profile!
            </div>
          )}

          {/* Published status for own shelf */}
          {isOwnShelf && hasProfileBadges && (
            <div className="mb-6 p-3 rounded-lg border border-green-500/20 bg-green-500/5 text-green-400/80 text-xs text-center">
              Published to Nostr
            </div>
          )}

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
          <div className="text-center mb-4">
            <p className="text-text-secondary text-sm">
              {earnedIds?.size || 0} of {BADGES.length} badges earned
            </p>
            <p className="text-text-secondary/60 text-xs mt-1">
              Anyone's badge shelf is publicly viewable.
            </p>
          </div>

          {/* Emoji strip */}
          {earnedIds && earnedIds.size > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center text-xl mb-6">
              {sortedBadges
                .filter((b) => earnedIds.has(b.id))
                .map((b) => (
                  <span key={b.id} title={b.name}>{b.emoji}</span>
                ))}
            </div>
          )}

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

          {/* Manage badges link */}
          <div className="text-center mt-4">
            <Link
              to="/manage-badges"
              className="text-text-secondary hover:text-text-primary text-xs transition-colors"
            >
              &#9881;&#65039; Manage Badges
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
