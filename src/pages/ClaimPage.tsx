import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { BADGES, BADGE_IMAGE_BASE, TRACK_COLORS, TIER_LABELS } from '../constants/badges';

export default function ClaimPage() {
  const [searchParams] = useSearchParams();
  const badgeId = searchParams.get('badge');
  const badge = badgeId ? BADGES.find((b) => b.id === badgeId) : null;

  const [npub, setNpub] = useState('');
  const [honorChecked, setHonorChecked] = useState(false);
  const [proofText, setProofText] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!badge) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-text-primary mb-4">Claim a Badge</h1>
          <p className="text-text-secondary mb-6">Select a badge from the directory to begin claiming.</p>
          <Link
            to="/badges"
            className="inline-block px-5 py-2.5 rounded-xl bg-track-agent text-white font-medium text-sm hover:bg-track-agent/80 transition-colors"
          >
            Browse Badges
          </Link>
        </div>
      </div>
    );
  }

  const trackColor = TRACK_COLORS[badge.track];

  const handleSubmit = () => {
    const subject = `Badge Claim: ${badge.name} (${badge.id})`;
    const body = [
      `Badge: ${badge.name} (${badge.id})`,
      `npub: ${npub}`,
      `Verification type: ${badge.verification}`,
      badge.verification === 'honor' ? `Confirmed: Yes${note ? `\nNote: ${note}` : ''}` : '',
      badge.verification === 'prove' ? `Proof:\n${proofText}` : '',
      badge.verification === 'auto' ? 'Auto-verification requested' : '',
    ]
      .filter(Boolean)
      .join('\n');

    window.location.href = `mailto:hello@jorgenclaw.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
  };

  const canSubmit = () => {
    if (!npub.trim().startsWith('npub1')) return false;
    if (badge.verification === 'honor' && !honorChecked) return false;
    if (badge.verification === 'prove' && !proofText.trim()) return false;
    if (badge.verification === 'pay') return false;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/badges" className="text-text-secondary text-sm hover:text-text-primary transition-colors mb-6 inline-block">
        &larr; Back to badges
      </Link>

      {/* Badge info */}
      <div
        className="rounded-xl border p-6 mb-8"
        style={{ borderColor: trackColor.border + '40', backgroundColor: trackColor.bg }}
      >
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-surface-light flex items-center justify-center overflow-hidden shrink-0">
            <img
              src={`${BADGE_IMAGE_BASE}${badge.id}.png`}
              alt={badge.name}
              className="w-14 h-14 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.textContent = badge.emoji;
              }}
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary mb-1">{badge.name}</h1>
            <p className="text-text-secondary text-sm mb-2">{badge.description}</p>
            <div className="flex gap-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ color: trackColor.text, backgroundColor: trackColor.bg }}
              >
                {trackColor.label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium text-text-secondary bg-surface">
                Tier {badge.tier}: {TIER_LABELS[badge.tier]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {submitted ? (
        <div className="text-center py-8">
          <p className="text-2xl mb-2">Your email app should have opened with the claim details.</p>
          <p className="text-text-secondary">
            If it didn't, email <a href="mailto:hello@jorgenclaw.ai" className="text-track-agent underline">hello@jorgenclaw.ai</a> with your npub and badge ID.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Step 1: npub */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Step 1: Your Nostr public key
            </label>
            <input
              type="text"
              value={npub}
              onChange={(e) => setNpub(e.target.value)}
              placeholder="npub1..."
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text-primary placeholder-text-secondary focus:outline-none focus:border-track-agent transition-colors font-mono text-sm"
            />
          </div>

          {/* Step 2: Verification */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Step 2: Verification
            </label>

            {badge.verification === 'honor' && (
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={honorChecked}
                    onChange={(e) => setHonorChecked(e.target.checked)}
                    className="mt-1 accent-track-agent"
                  />
                  <span className="text-sm text-text-secondary">
                    I confirm I've completed this: {badge.description.toLowerCase()}
                  </span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note or context..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text-primary placeholder-text-secondary focus:outline-none focus:border-track-agent transition-colors text-sm"
                />
              </div>
            )}

            {badge.verification === 'prove' && (
              <div>
                {badge.verificationHint && (
                  <p className="text-xs text-text-secondary mb-2">
                    Hint: {badge.verificationHint}
                  </p>
                )}
                <textarea
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  placeholder="Paste your proof here..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text-primary placeholder-text-secondary focus:outline-none focus:border-track-agent transition-colors text-sm"
                />
              </div>
            )}

            {badge.verification === 'auto' && (
              <div className="px-4 py-3 rounded-xl bg-surface border border-border">
                <p className="text-sm text-text-secondary">
                  This badge is verified automatically. Submit your npub and we'll check on our end.
                </p>
              </div>
            )}

            {badge.verification === 'pay' && (
              <div className="px-4 py-3 rounded-xl bg-surface border border-border">
                <p className="text-sm text-text-secondary">
                  Payment verification coming soon. This badge requires a Lightning payment to verify.
                </p>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit()}
            className="w-full py-3 rounded-xl bg-track-agent text-white font-medium text-sm hover:bg-track-agent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Submit Claim via Email
          </button>
        </div>
      )}
    </div>
  );
}
