import { Link } from 'react-router-dom';
import type { BadgeDef } from '../constants/badges';
import { BADGE_IMAGE_BASE, TRACK_COLORS, TIER_LABELS } from '../constants/badges';

interface BadgeCardProps {
  badge: BadgeDef;
  earned?: boolean;
}

const verificationPills: Record<string, { label: string; color: string }> = {
  auto: { label: 'Auto', color: 'text-green-400 bg-green-400/10' },
  honor: { label: 'Honor', color: 'text-yellow-400 bg-yellow-400/10' },
  prove: { label: 'Prove', color: 'text-blue-400 bg-blue-400/10' },
  pay: { label: 'Pay', color: 'text-purple-400 bg-purple-400/10' },
};

export default function BadgeCard({ badge, earned }: BadgeCardProps) {
  const trackColor = TRACK_COLORS[badge.track];
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
        <div className="w-12 h-12 rounded-lg bg-surface-light flex items-center justify-center overflow-hidden">
          <img
            src={`${BADGE_IMAGE_BASE}${badge.id}.png`}
            alt={badge.name}
            className="w-10 h-10 object-contain"
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
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pill.color}`}>
            {pill.label}
          </span>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-text-primary mb-1">{badge.name}</h3>
      <p className="text-xs text-text-secondary mb-3 leading-relaxed">{badge.description}</p>

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">
          Tier {badge.tier}: {TIER_LABELS[badge.tier]}
        </span>
        {earned === false ? (
          <Link
            to={`/claim?badge=${badge.id}`}
            className="text-xs font-medium px-2.5 py-1 rounded-lg bg-surface-light text-text-primary hover:bg-border transition-colors"
          >
            Claim &rarr;
          </Link>
        ) : earned === true ? (
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
