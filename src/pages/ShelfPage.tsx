import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { SimplePool } from 'nostr-tools/pool';
import { BADGES, ISSUER_PUBKEY, RELAYS } from '../constants/badges';
import BadgeCard from '../components/BadgeCard';

export default function ShelfPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [npubInput, setNpubInput] = useState(searchParams.get('npub') || '');
  const [earnedIds, setEarnedIds] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [displayNpub, setDisplayNpub] = useState('');

  const lookup = useCallback(async (npub: string) => {
    setError('');
    setLoading(true);
    setEarnedIds(null);

    try {
      const { type, data } = nip19.decode(npub.trim());
      if (type !== 'npub') {
        setError('Please enter a valid npub (starts with npub1...)');
        setLoading(false);
        return;
      }
      const hex = data as string;

      const pool = new SimplePool();
      const earned = new Set<string>();

      try {
        const events = await pool.querySync(RELAYS, {
          kinds: [8],
          authors: [ISSUER_PUBKEY],
          '#p': [hex],
        });

        for (const ev of events) {
          const aTag = ev.tags.find((t: string[]) => t[0] === 'a');
          if (aTag) {
            // Badge definition reference: 30009:<pubkey>:<badge-id>
            const parts = aTag[1].split(':');
            const badgeId = parts[parts.length - 1];
            earned.add(badgeId);
          }
          // Also check d tag for direct badge id
          const dTag = ev.tags.find((t: string[]) => t[0] === 'd');
          if (dTag) {
            earned.add(dTag[1]);
          }
        }
      } finally {
        pool.close(RELAYS);
      }

      setEarnedIds(earned);
      setDisplayNpub(npub.trim());
      setSearchParams({ npub: npub.trim() });
    } catch {
      setError('Invalid npub format. It should start with npub1...');
    } finally {
      setLoading(false);
    }
  }, [setSearchParams]);

  // Auto-lookup if npub came from URL
  useState(() => {
    const urlNpub = searchParams.get('npub');
    if (urlNpub) {
      setNpubInput(urlNpub);
      lookup(urlNpub);
    }
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Your Sovereignty Shelf</h1>
        <p className="text-text-secondary">
          Enter your npub to see which badges you've earned on your sovereignty journey.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookup(npubInput);
        }}
        className="flex gap-3 max-w-2xl mx-auto mb-10"
      >
        <input
          type="text"
          value={npubInput}
          onChange={(e) => setNpubInput(e.target.value)}
          placeholder="npub1..."
          className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border text-text-primary placeholder-text-secondary focus:outline-none focus:border-track-agent transition-colors font-mono text-sm"
        />
        <button
          type="submit"
          disabled={loading || !npubInput.trim()}
          className="px-6 py-3 rounded-xl bg-track-agent text-white font-medium text-sm hover:bg-track-agent/80 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Looking up...' : 'Look up'}
        </button>
      </form>

      {error && (
        <p className="text-center text-red-400 mb-6">{error}</p>
      )}

      {earnedIds !== null && (
        <>
          <div className="text-center mb-6">
            <p className="text-text-secondary text-sm">
              {earnedIds.size} of {BADGES.length} badges earned
              {displayNpub && (
                <span className="ml-2 font-mono text-xs text-text-secondary/60">
                  ({displayNpub.slice(0, 12)}...{displayNpub.slice(-6)})
                </span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BADGES.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                earned={earnedIds.has(badge.id)}
              />
            ))}
          </div>

          {earnedIds.size > 0 && (
            <div className="text-center mt-8">
              <button
                onClick={() => {
                  const text = `Check out my Sovereignty badges! ${earnedIds.size}/${BADGES.length} earned.\n\nhttps://sovereignty.jorgenclaw.ai/app/?npub=${displayNpub}`;
                  navigator.clipboard.writeText(text);
                }}
                className="px-4 py-2 rounded-lg bg-surface border border-border text-text-secondary text-sm hover:text-text-primary hover:border-surface-light transition-colors"
              >
                Copy share link
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
