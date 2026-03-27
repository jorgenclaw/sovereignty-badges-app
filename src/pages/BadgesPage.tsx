import { useState } from 'react';
import type { Track } from '../constants/badges';
import { BADGES, TRACK_COLORS, TIER_LABELS } from '../constants/badges';
import BadgeCard from '../components/BadgeCard';

type TrackFilter = 'all' | Track;

export default function BadgesPage() {
  const [trackFilter, setTrackFilter] = useState<TrackFilter>('all');
  const [tierFilter, setTierFilter] = useState<number | null>(null);

  const filtered = BADGES.filter((b) => {
    if (trackFilter !== 'all' && b.track !== trackFilter) return false;
    if (tierFilter !== null && b.tier !== tierFilter) return false;
    return true;
  });

  const trackButtons: { value: TrackFilter; label: string; color?: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'human', label: 'Human', color: TRACK_COLORS.human.text },
    { value: 'agent', label: 'Agent', color: TRACK_COLORS.agent.text },
    { value: 'both', label: 'Shared', color: TRACK_COLORS.both.text },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Badge Directory</h1>
        <p className="text-text-secondary">
          All {BADGES.length} sovereignty badges across Human, Agent, and Shared tracks.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <div className="flex gap-1 bg-surface rounded-xl p-1">
          {trackButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setTrackFilter(btn.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                trackFilter === btn.value
                  ? 'bg-surface-light text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              style={
                trackFilter === btn.value && btn.color
                  ? { color: btn.color }
                  : undefined
              }
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-surface rounded-xl p-1">
          <button
            onClick={() => setTierFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tierFilter === null
                ? 'bg-surface-light text-text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            All Tiers
          </button>
          {[0, 1, 2, 3].map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tierFilter === tier
                  ? 'bg-surface-light text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {TIER_LABELS[tier]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-text-secondary py-12">
          No badges match the selected filters.
        </p>
      )}
    </div>
  );
}
