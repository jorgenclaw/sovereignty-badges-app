import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { BADGES, BADGE_IMAGE_BASE, TRACK_COLORS, TIER_LABELS, ISSUER_PUBKEY } from '../constants/badges';
import { useSigner } from '../context/SignerContext';

const JORGENCLAW_NPUB = 'npub16pg5zadrrhseg2qjt9lwfcl50zcc8alnt7mnaend3j04wjz4gnjqn6efzc';
const PRIMAL_DM_URL = `https://primal.net/messages/${JORGENCLAW_NPUB}`;

export default function ClaimPage() {
  const [searchParams] = useSearchParams();
  const badgeId = searchParams.get('badge');
  const badge = badgeId ? BADGES.find((b) => b.id === badgeId) : null;
  const { pubkey, connected } = useSigner();

  const [npub, setNpub] = useState('');
  const [honorChecked, setHonorChecked] = useState(false);
  const [proofText, setProofText] = useState('');
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);

  // Build the DM claim message
  const claimMessage = useMemo(() => {
    if (!badge) return '';
    const userNpub = npub.trim() || (connected && pubkey ? `(connected: ${pubkey.slice(0, 12)}...)` : '[your npub]');
    const lines = [
      `I'm claiming the ${badge.emoji} ${badge.name} badge.`,
      `Badge ID: ${badge.id}`,
      `My npub: ${userNpub}`,
    ];
    if (badge.verification === 'honor' && honorChecked) {
      lines.push(`Confirmed: I've done this.`);
      if (note.trim()) lines.push(`Note: ${note.trim()}`);
    }
    if (badge.verification === 'prove' && proofText.trim()) {
      lines.push(`Proof: ${proofText.trim()}`);
    }
    if (badge.verification === 'auto') {
      lines.push(`Requesting auto-verification.`);
    }
    return lines.join('\n');
  }, [badge, npub, pubkey, connected, honorChecked, note, proofText]);

  const handleCopy = () => {
    navigator.clipboard.writeText(claimMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  const canClaim = () => {
    if (!npub.trim().startsWith('npub1') && !connected) return false;
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
              src={`${BADGE_IMAGE_BASE}${badge.id}.svg`}
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

      <div className="space-y-6">
        {/* Step 1: npub */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Step 1: Your Nostr public key
          </label>
          {connected && pubkey ? (
            <p className="text-sm text-green-400">
              Connected: {pubkey.slice(0, 16)}...
            </p>
          ) : (
            <input
              type="text"
              value={npub}
              onChange={(e) => setNpub(e.target.value)}
              placeholder="npub1..."
              className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text-primary placeholder-text-secondary focus:outline-none focus:border-track-agent transition-colors font-mono text-sm"
            />
          )}
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

        {/* Step 3: Claim via Nostr DM */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Step 3: Send claim via Nostr DM
          </label>

          <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
            <p className="text-sm text-text-secondary">
              DM <strong className="text-text-primary">Jorgenclaw</strong> on Nostr with your claim details. Copy the message below and send it.
            </p>

            {/* Pre-filled message */}
            <div className="bg-background rounded-lg p-3 border border-border">
              <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono">{claimMessage}</pre>
            </div>

            {/* Jorgenclaw npub */}
            <div className="text-xs text-text-secondary">
              <span>Send to: </span>
              <code className="text-track-agent break-all">{JORGENCLAW_NPUB}</code>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleCopy}
                disabled={!canClaim()}
                className="px-4 py-2.5 rounded-xl bg-track-agent text-white font-medium text-sm hover:bg-track-agent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {copied ? 'Copied!' : 'Copy Message'}
              </button>
              <a
                href={PRIMAL_DM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl border border-track-agent text-track-agent font-medium text-sm hover:bg-track-agent/10 transition-colors"
              >
                Open in Primal &rarr;
              </a>
            </div>

            <p className="text-xs text-text-secondary/60">
              Badge claims are verified via Nostr DM. Jorgenclaw checks DMs 4× daily.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
