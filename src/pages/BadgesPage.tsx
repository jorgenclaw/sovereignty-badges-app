import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBadgeDefinitions } from '../hooks/useBadgeDefinitions';
import type { BadgeDef } from '../hooks/useBadgeDefinitions';
import { TYPE_COLORS, BADGE_IMAGE_BASE } from '../constants/badges';

type TypeFilter = 'all' | 'human' | 'agent';

export default function BadgesPage() {
  const { data: badges = [], isLoading } = useBadgeDefinitions();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const filtered = badges.filter((b) => {
    if (typeFilter !== 'all' && b.type !== typeFilter) return false;
    return true;
  });

  const foundationBadges = filtered.filter((b) => b.tier === 'foundation');
  const sovereignBadges = filtered.filter((b) => b.tier === 'sovereign');

  const filterButtons: { value: TypeFilter; label: string; color?: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'human', label: 'Human', color: TYPE_COLORS.human.text },
    { value: 'agent', label: 'Agent', color: TYPE_COLORS.agent.text },
  ];

  function renderBadgeCard(badge: BadgeDef) {
    const colors = TYPE_COLORS[badge.type];
    return (
      <Link
        key={badge.id}
        to={`/claim?badge=${badge.id}`}
        className="block rounded-xl border p-4 transition-all hover:border-surface-light"
        style={{ borderColor: colors.border + '40', backgroundColor: colors.bg }}
      >
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl"
            style={{ border: `3px solid ${colors.border}` }}
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
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ color: colors.text, backgroundColor: colors.bg }}
          >
            {colors.label}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-text-primary mb-1">{badge.name}</h3>
        <p className="text-xs text-text-secondary mb-3 leading-relaxed">{badge.description}</p>

        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary capitalize">{badge.tier}</span>
          <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-surface-light text-text-primary">
            Claim &rarr;
          </span>
        </div>
      </Link>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Badge Directory</h1>
        <p className="text-text-secondary">
          {isLoading
            ? 'Loading badges from relays...'
            : `${badges.length} sovereignty badges across Human and Agent tracks.`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <div className="flex gap-1 bg-surface rounded-xl p-1">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setTypeFilter(btn.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === btn.value
                  ? 'bg-surface-light text-text-primary'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
              style={
                typeFilter === btn.value && btn.color
                  ? { color: btn.color }
                  : undefined
              }
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-text-secondary">Fetching badge definitions from Nostr relays...</p>
        </div>
      ) : (
        <>
          {/* Foundation section */}
          {foundationBadges.length > 0 && (
            <div className="mb-10">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Foundation</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {foundationBadges.map(renderBadgeCard)}
              </div>
            </div>
          )}

          {/* Sovereign section */}
          {sovereignBadges.length > 0 && (
            <div className="mb-10">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Sovereign</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sovereignBadges.map(renderBadgeCard)}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <p className="text-center text-text-secondary py-12">
              No badges match the selected filter.
            </p>
          )}
        </>
      )}
    </div>
  );
}
