import { Link } from 'react-router-dom';
import type { BadgeDef } from '../constants/badges';
import { BADGE_IMAGE_BASE, TRACK_COLORS, TIER_LABELS, TYPE_COLORS } from '../constants/badges';

interface BadgeCardProps {
  badge: BadgeDef;
  earned?: boolean;
  isOwnShelf?: boolean;
}

const verificationPills: Record<string, { label: string; color: string }> = {
  auto: { label: 'Auto', color: 'text-green-400 bg-green-400/10' },
  honor: { label: 'Honor', color: 'text-yellow-400 bg-yellow-400/10' },
  prove: { label: 'Prove', color: 'text-blue-400 bg-blue-400/10' },
  pay: { label: 'Pay', color: 'text-purple-400 bg-purple-400/10' },
};

/**
 * Resolve the color set for a badge.
 * Works with old-style badges (track: 'human' | 'agent' | 'both')
 * and new-style badges that might have a `type` field.
 */
function getTrackColor(badge: BadgeDef) {
  // Use TYPE_COLORS for human/agent (new style orange/blue)
  const key = badge.track;
  if (key === 'human' || key === 'agent') {
    return TYPE_COLORS[key];
  }
  // Fallback for 'both' / shared
  return TRACK_COLORS[key] || TRACK_COLORS.both;
}

export default function BadgeCard({ badge, earned, isOwnShelf }: BadgeCardProps) {
  const trackColor = getTrackColor(badge);
  const pill = verificationPills[badge.verification];

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        earned === false
          ? 'opacity-40 grayscale border-border bg-surface'
          : 'border-border bg-surface hover:border-surface-light'
      }`}
      style={
        earned !== false
          ? { borderColor: trackColor.border + '40', backgroundColor: trackColor.bg }
          : undefined
      }
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0"
          style={{ border: `3px solid ${trackColor.border}` }}
          title={`${badge.name}: ${badge.description}`}
        >
          <img
            src={`${BADGE_IMAGE_BASE}${badge.id}.svg`}
            alt={badge.name}
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).parentElement!.textContent = badge.emoji;
            }}
          />
        </div>
        <div className="flex gap-1.5">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ color: trackColor.text, backgroundColor: trackColor.bg }}
          >
            {trackColor.label}
          </span>
          {pill && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pill.color}`}>
              {pill.label}
            </span>
          )}
        </div>
      </div>

      <h3 className="text-sm font-semibold text-text-primary mb-1">{badge.name}</h3>
      <p className="text-xs text-text-secondary mb-3 leading-relaxed">{badge.description}</p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">
          Tier {badge.tier}: {TIER_LABELS[badge.tier]}
        </span>
        {earned && isOwnShelf ? (
          <span className="text-xs font-medium text-green-400/70 cursor-default">
            On your shelf &#10003;
          </span>
        ) : earned ? (
          <span className="text-xs font-medium text-green-400">Earned</span>
        ) : (
          <Link
            to={`/claim?badge=${badge.id}`}
            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-surface-light text-text-primary hover:bg-border transition-colors"
          >
            Claim &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}
