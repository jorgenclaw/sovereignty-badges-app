import { useState, useEffect, useMemo } from 'react';
import { nip19 } from 'nostr-tools';
import { SimplePool } from 'nostr-tools/pool';
import { BADGES, ISSUER_PUBKEY, RELAYS } from '../constants/badges';
import { useSigner } from '../context/SignerContext';
import { useAuthor } from '../hooks/useAuthor';
import { useBadgeAwards } from '../hooks/useBadgeAwards';
import { useNostrQuery } from '../hooks/useNostr';

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

export default function ManageBadgesPage() {
  const { pubkey, connected, openModal, signEvent } = useSigner();

  const [inputValue, setInputValue] = useState('');
  const [resolvedHex, setResolvedHex] = useState('');
  const [resolveError, setResolveError] = useState('');
  const [resolving, setResolving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [checkedBadges, setCheckedBadges] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);

  // Auto-fill from signer if connected
  useEffect(() => {
    if (connected && pubkey && !resolvedHex) {
      setResolvedHex(pubkey);
      setInputValue(nip19.npubEncode(pubkey).slice(0, 20) + '...');
    }
  }, [connected, pubkey, resolvedHex]);

  const handleLookup = async () => {
    if (!inputValue.trim()) return;
    setResolving(true);
    setResolveError('');
    try {
      const hex = await resolveToHex(inputValue);
      setResolvedHex(hex);
      setInitialized(false); // Reset so checkboxes reload from relay data
    } catch (err) {
      setResolveError(
        err instanceof Error ? err.message : 'Could not resolve identifier'
      );
    } finally {
      setResolving(false);
    }
  };

  // Fetch profile, awards, and current profile_badges
  const { data: profile } = useAuthor(resolvedHex || undefined);
  const { data: earnedIds, isLoading: awardsLoading } = useBadgeAwards(resolvedHex || undefined);

  // Fetch the raw kind:30008 event to get currently published badge IDs
  const { data: publishedBadgeIds, isLoading: profileBadgesLoading } = useNostrQuery<Set<string>>(
    ['profile-badges-detail', resolvedHex || ''],
    { kinds: [30008], authors: [resolvedHex!], '#d': ['profile_badges'], limit: 1 },
    {
      enabled: !!resolvedHex,
      select: (events) => {
        const ids = new Set<string>();
        if (events.length > 0) {
          for (const tag of events[0].tags) {
            if (tag[0] === 'a') {
              const parts = tag[1].split(':');
              ids.add(parts[parts.length - 1]);
            }
          }
        }
        return ids;
      },
    },
  );

  // Initialize checkboxes from published profile badges
  useEffect(() => {
    if (!initialized && publishedBadgeIds && !profileBadgesLoading) {
      setCheckedBadges(new Set(publishedBadgeIds));
      setInitialized(true);
    }
  }, [publishedBadgeIds, profileBadgesLoading, initialized]);

  const loading = awardsLoading || profileBadgesLoading;

  // Sort badges same as ShelfPage
  const trackOrder = { human: 0, agent: 1, both: 2 };
  const sortedBadges = useMemo(
    () =>
      [...BADGES].sort((a, b) => {
        const trackDiff = trackOrder[a.track] - trackOrder[b.track];
        if (trackDiff !== 0) return trackDiff;
        return a.tier - b.tier;
      }),
    [],
  );

  const toggleBadge = (id: string) => {
    setCheckedBadges((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isOwnProfile = connected && pubkey === resolvedHex;

  const handleUpdate = async () => {
    if (!connected) {
      openModal();
      return;
    }
    if (!isOwnProfile) {
      alert('You can only update your own profile badges. Connect the matching signer.');
      return;
    }

    setPublishing(true);
    try {
      const event = {
        kind: 30008,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['d', 'profile_badges'],
          ...Array.from(checkedBadges).map((badgeId) => [
            'a',
            `30009:${ISSUER_PUBKEY}:${badgeId}`,
            'wss://nos.lol',
          ]),
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
      console.error('Failed to update profile badges:', err);
      alert('Failed to publish. Make sure your signer is connected and try again.');
    } finally {
      setPublishing(false);
    }
  };

  // Compute diff for UI feedback
  const hasChanges = useMemo(() => {
    if (!publishedBadgeIds) return checkedBadges.size > 0;
    if (checkedBadges.size !== publishedBadgeIds.size) return true;
    for (const id of checkedBadges) {
      if (!publishedBadgeIds.has(id)) return true;
    }
    return false;
  }, [checkedBadges, publishedBadgeIds]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Manage Badges</h1>
      <p className="text-text-secondary text-sm mb-6">
        Choose which earned badges appear on your Nostr profile (kind:30008).
      </p>

      {/* Lookup input */}
      {!resolvedHex && (
        <div className="mb-8">
          {!connected && (
            <div className="mb-4 p-4 rounded-lg border border-track-agent/30 bg-track-agent/10">
              <p className="text-text-primary text-sm mb-2">
                Connect your signer to auto-fill your pubkey, or enter one manually below.
              </p>
              <button
                onClick={openModal}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-track-agent text-white hover:bg-track-agent/80 transition-colors"
              >
                Connect Signer
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              placeholder="npub1... or NIP-05 handle"
              className="flex-1 px-3 py-2 rounded-lg bg-surface border border-border text-text-primary text-sm focus:outline-none focus:border-track-agent"
            />
            <button
              onClick={handleLookup}
              disabled={resolving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-track-agent text-white hover:bg-track-agent/80 transition-colors disabled:opacity-50"
            >
              {resolving ? 'Looking up...' : 'Look up'}
            </button>
          </div>
          {resolveError && (
            <p className="text-red-400 text-sm mt-2">{resolveError}</p>
          )}
        </div>
      )}

      {/* Profile + badge management */}
      {resolvedHex && (
        <>
          {/* Profile header */}
          <div className="flex items-center gap-3 mb-6 p-4 rounded-lg bg-surface border border-border">
            {profile?.picture && (
              <img
                src={profile.picture}
                alt=""
                className="w-12 h-12 rounded-full object-cover border border-border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <div>
              <p className="text-text-primary font-medium">
                {profile?.name || nip19.npubEncode(resolvedHex).slice(0, 20) + '...'}
              </p>
              {profile?.nip05 && (
                <p className="text-text-secondary text-xs">{profile.nip05}</p>
              )}
              <p className="text-text-secondary/50 text-xs font-mono">
                {nip19.npubEncode(resolvedHex).slice(0, 16)}...
              </p>
            </div>
            <button
              onClick={() => {
                setResolvedHex('');
                setInputValue('');
                setInitialized(false);
                setCheckedBadges(new Set());
              }}
              className="ml-auto text-text-secondary hover:text-text-primary text-xs transition-colors"
            >
              Change
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-text-secondary">Loading badges from relays...</p>
            </div>
          ) : (
            <>
              {/* Badge list */}
              <div className="space-y-2 mb-6">
                {sortedBadges.map((badge) => {
                  const earned = earnedIds?.has(badge.id) ?? false;
                  const checked = checkedBadges.has(badge.id);
                  const wasPublished = publishedBadgeIds?.has(badge.id) ?? false;

                  return (
                    <label
                      key={badge.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        earned
                          ? checked
                            ? 'border-track-agent/40 bg-track-agent/10'
                            : 'border-border bg-surface hover:bg-surface-light/50'
                          : 'border-border/50 bg-surface/50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!earned || !isOwnProfile}
                        onChange={() => toggleBadge(badge.id)}
                        className="w-4 h-4 rounded accent-track-agent"
                      />
                      <span className="text-lg">{badge.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium">{badge.name}</p>
                        <p className="text-text-secondary text-xs truncate">{badge.description}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {earned && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                            Earned
                          </span>
                        )}
                        {wasPublished && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-track-agent/20 text-track-agent border border-track-agent/30">
                            Published
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Actions */}
              {publishSuccess && (
                <div className="mb-4 p-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 text-sm text-center">
                  Profile badges updated!
                </div>
              )}

              {isOwnProfile ? (
                <button
                  onClick={handleUpdate}
                  disabled={publishing || !hasChanges}
                  className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-track-agent text-white hover:bg-track-agent/80 transition-colors disabled:opacity-50"
                >
                  {publishing
                    ? 'Publishing...'
                    : hasChanges
                    ? `Update Profile Badges (${checkedBadges.size} selected)`
                    : 'No changes to publish'}
                </button>
              ) : !connected ? (
                <button
                  onClick={openModal}
                  className="w-full px-4 py-3 rounded-lg text-sm font-medium bg-track-agent text-white hover:bg-track-agent/80 transition-colors"
                >
                  Connect Signer to Manage
                </button>
              ) : (
                <p className="text-text-secondary text-sm text-center">
                  Connect the signer that matches this pubkey to manage badges.
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
