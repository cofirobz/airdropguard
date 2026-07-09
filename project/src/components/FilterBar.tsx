import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import type { Blockchain, Category, RewardPotential, RiskLevel, Difficulty, OpportunityTypeKey } from '../lib/types';
import { BLOCKCHAIN_OPTIONS, CATEGORY_OPTIONS } from '../lib/types';
import { getOpportunityTypeTone } from '../lib/utils';

export interface Filters {
  search: string;
  blockchain: Blockchain | '';
  category: Category | '';
  reward: RewardPotential | '';
  risk: RiskLevel | '';
  difficulty: Difficulty | '';
  opportunityType: OpportunityTypeKey | '';
  listingState: 'verified' | 'under_review' | 'scam_alert' | '';
  sortBy: 'highest_score' | 'newest' | 'lowest_risk' | 'most_active' | 'ending_soon';
}

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export default function FilterBar({ filters, onChange }: Props) {
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [
    filters.blockchain,
    filters.category,
    filters.reward,
    filters.risk,
    filters.difficulty,
    filters.opportunityType,
    filters.listingState,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  const selectClass =
    'min-h-[46px] w-full rounded-xl border border-white/10 bg-dark-700/70 px-3 py-2 text-sm text-gray-300 outline-none transition-colors focus:border-neon-purple/50';

  const typeOptions: Array<{ value: OpportunityTypeKey | ''; label: string }> = [
    { value: '', label: 'All' },
    { value: 'confirmed_airdrop', label: 'Confirmed' },
    { value: 'potential_airdrop', label: 'Potential' },
    { value: 'points_program', label: 'Points' },
    { value: 'rewards_program', label: 'Rewards' },
    { value: 'testnet', label: 'Testnet' },
    { value: 'scam_alert', label: 'Scam Alerts' },
  ];

  const sortOptions: Array<{ value: Filters['sortBy']; label: string }> = [
    { value: 'highest_score', label: 'Highest score' },
    { value: 'newest', label: 'Newest' },
    { value: 'lowest_risk', label: 'Lowest risk' },
    { value: 'most_active', label: 'Most active' },
    { value: 'ending_soon', label: 'Ending soon' },
  ];

  const listingStateOptions: Array<{ value: Filters['listingState']; label: string; tone: string }> = [
    { value: '', label: 'All listings', tone: 'border-white/10 bg-white/[0.03] text-gray-300' },
    { value: 'verified', label: 'Verified', tone: 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100' },
    { value: 'under_review', label: 'Under Review', tone: 'border-amber-300/30 bg-amber-500/10 text-amber-100' },
    { value: 'scam_alert', label: 'Scam Alerts', tone: 'border-rose-300/35 bg-rose-500/10 text-rose-100' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-500" />
          <input
            type="search"
            placeholder="Search airdrops..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="min-h-[46px] w-full rounded-xl border border-white/10 bg-dark-700/70 py-3 pl-10 pr-10 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-neon-purple/50"
          />

          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 hover:bg-white/5 hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowFilters((open) => !open)}
          aria-label={showFilters ? 'Hide filters' : 'Show filters'}
          className={`relative flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors ${
            showFilters || hasActiveFilters
              ? 'border-neon-purple/30 bg-neon-purple/15 text-neon-purple'
              : 'border-white/10 bg-dark-700/70 text-gray-400 hover:text-white'
          }`}
          aria-expanded={showFilters}
          aria-controls="airdrop-filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>

          {hasActiveFilters && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neon-purple text-xs font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div id="airdrop-filters" className="glass-card rounded-2xl p-4">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {typeOptions.map((option) => {
                const selected = filters.opportunityType === option.value;
                const tone = option.value ? getOpportunityTypeTone(option.value === 'confirmed_airdrop' ? 'Confirmed Airdrop' : option.value === 'potential_airdrop' ? 'Potential Airdrop' : option.value === 'points_program' ? 'Points Program' : option.value === 'rewards_program' ? 'Rewards Program' : option.value === 'testnet' ? 'Testnet' : 'Scam Alert') : 'border-white/10 bg-white/[0.03] text-gray-300';

                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => onChange({ ...filters, opportunityType: option.value })}
                    className={`inline-flex min-h-[40px] items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${selected ? tone : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-white'}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              {listingStateOptions.map((option) => {
                const selected = filters.listingState === option.value;

                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => onChange({ ...filters, listingState: option.value })}
                    className={`inline-flex min-h-[40px] items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${selected
                      ? option.tone
                      : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <label className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                Chain
              </span>
              <select
                value={filters.blockchain}
                onChange={(e) => onChange({ ...filters, blockchain: e.target.value as Blockchain | '' })}
                className={selectClass}
              >
                <option value="">All Chains</option>
                {BLOCKCHAIN_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                Category
              </span>
              <select
                value={filters.category}
                onChange={(e) => onChange({ ...filters, category: e.target.value as Category | '' })}
                className={selectClass}
              >
                <option value="">All Categories</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                Reward
              </span>
              <select
                value={filters.reward}
                onChange={(e) => onChange({ ...filters, reward: e.target.value as RewardPotential | '' })}
                className={selectClass}
              >
                <option value="">All Rewards</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                Risk
              </span>
              <select
                value={filters.risk}
                onChange={(e) => onChange({ ...filters, risk: e.target.value as RiskLevel | '' })}
                className={selectClass}
              >
                <option value="">All Risk</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                Difficulty
              </span>
              <select
                value={filters.difficulty}
                onChange={(e) => onChange({ ...filters, difficulty: e.target.value as Difficulty | '' })}
                className={selectClass}
              >
                <option value="">All Difficulty</option>
                <option value="Easy">Easy</option>
                <option value="Moderate">Moderate</option>
                <option value="Hard">Hard</option>
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                Sort by
              </span>
              <select
                value={filters.sortBy}
                onChange={(e) => onChange({ ...filters, sortBy: e.target.value as Filters['sortBy'] })}
                className={selectClass}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  search: filters.search,
                  blockchain: '',
                  category: '',
                  reward: '',
                  risk: '',
                  difficulty: '',
                  opportunityType: '',
                    listingState: '',
                  sortBy: 'highest_score',
                })
              }
              className="mt-4 min-h-[42px] rounded-xl px-3 text-sm font-semibold text-neon-purple hover:bg-neon-purple/5 hover:text-neon-purple/80"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}