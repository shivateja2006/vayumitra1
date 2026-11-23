import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Sparkles,
  RefreshCw,
  Home,
  Route,
  Leaf,
  Copy,
  Check,
} from 'lucide-react';
import type { AssistantPlanResponse, HouseholdProfile, LocationDetail } from '../types/aqi';

interface VayumitraPlannerProps {
  location: LocationDetail | null;
  profile: HouseholdProfile;
  onProfileChange: (next: HouseholdProfile) => void;
  plan: AssistantPlanResponse | null;
  loading: boolean;
  error: string | null;
  onGeneratePlan: () => void;
}

const HOUSEHOLD_OPTIONS = [
  'Family with young children',
  'Elderly or asthma-sensitive household',
  'Daily office & school commuters',
  'Outdoor athletes & morning walkers',
];

const COMMUTE_OPTIONS = [
  'Private car / cab rideshare',
  'Metro / city bus transit',
  'Two-wheeler / scooter',
  'Walking / cycling / work from home',
];

const HOME_SETUP_OPTIONS = [
  'Cross-ventilation windows & LPG gas stove',
  'AC + HEPA air purifier',
  'High-rise apartment near main road',
  'Independent house with natural draft',
];

const GOAL_OPTIONS = [
  'Protect family health & cut daily emissions',
  'Zero-cost indoor air quality hacks',
  'Lower household carbon & winter smog footprint',
];

export function VayumitraPlanner({
  location,
  profile,
  onProfileChange,
  plan,
  loading,
  onGeneratePlan,
}: VayumitraPlannerProps) {
  const [checkedRoutines, setCheckedRoutines] = useState<Record<string, boolean>>({});
  const [checkedHacks, setCheckedHacks] = useState<Record<string, boolean>>({});
  const [checkedSwaps, setCheckedSwaps] = useState<Record<string, boolean>>({});
  const [copiedPlan, setCopiedPlan] = useState(false);

  const toggleItem = (
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>,
    id: string,
  ) => {
    setter((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedExposureReduction = Math.min(
    85,
    (plan?.dailyRoutines ?? []).reduce(
      (sum, r) => sum + (checkedRoutines[r.id] ? r.exposureReductionPct : 0),
      0,
    ) +
      (plan?.indoorHacks ?? []).reduce(
        (sum, h) => sum + (checkedHacks[h.id] ? Math.round(h.indoorPmReductionPct * 0.45) : 0),
        0,
      ),
  );

  const selectedCo2Saved =
    (plan?.dailyRoutines ?? []).reduce(
      (sum, r) => sum + (checkedRoutines[r.id] ? r.co2SavedKgPerWeek : 0),
      0,
    ) +
    (plan?.sustainableAlternatives ?? []).reduce(
      (sum, s) => sum + (checkedSwaps[s.id] ? s.co2SavedKgPerWeek : 0),
      0,
    );

  const totalActionsSelected =
    Object.values(checkedRoutines).filter(Boolean).length +
    Object.values(checkedHacks).filter(Boolean).length +
    Object.values(checkedSwaps).filter(Boolean).length;

  const handleCopySummary = async () => {
    if (!plan) return;
    const text = [
      `Vayumitra Air Quality Plan — ${plan.city} (AQI ${plan.aqi})`,
      plan.locationBrief,
      '',
      `Mask & Outdoor Rule: ${plan.maskAndOutdoorRule}`,
      '',
      'Daily Routines:',
      ...plan.dailyRoutines.map((r) => `- [${r.timeWindow}] ${r.title}: ${r.action}`),
      '',
      'Indoor Air Hacks:',
      ...plan.indoorHacks.map((h) => `- [${h.costTier}] ${h.title}: ${h.steps}`),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedPlan(true);
      setTimeout(() => setCopiedPlan(false), 2200);
    } catch {
      // Clipboard blocked in sandboxed iframe; ignore gracefully
    }
  };

  return (
    <section className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6">
      {/* Lifestyle & Household Tailor Bar */}
      <div className="rounded-2xl border border-[var(--vayu-border)] bg-[var(--vayu-surface)] p-6">
        <div className="flex flex-col gap-4 border-b border-[var(--vayu-border)] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--vayu-ink)]">
              Tailor Vayumitra to Your Household & Commute
            </h2>
            <p className="mt-1 text-sm text-[var(--vayu-ink-muted)]">
              Configure your daily routine so Vayumitra adapts low-emission habits, indoor hacks,
              and swaps to {location ? `${location.name} (AQI ${location.aqi})` : 'your Indian city'}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {plan && (
              <button
                type="button"
                onClick={() => void handleCopySummary()}
                className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[var(--vayu-border)] bg-[var(--vayu-bg)] px-4 py-2.5 text-xs font-semibold text-[var(--vayu-ink)] transition-colors hover:border-[var(--vayu-accent)]"
              >
                {copiedPlan ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                    <span>Copied Plan</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copy Family Plan</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onGeneratePlan}
              disabled={loading || !location}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-[var(--vayu-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--vayu-accent-ink)] transition-colors hover:bg-[var(--vayu-accent-hover)] disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              <span>{loading ? 'Updating Plan...' : 'Refresh GenAI Plan'}</span>
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-[var(--vayu-ink-muted)]">
              Household Profile
            </span>
            <select
              value={profile.householdType}
              onChange={(e) => onProfileChange({ ...profile, householdType: e.target.value })}
              className="w-full rounded-lg border border-[var(--vayu-border)] bg-[var(--vayu-bg)] px-3 py-2 text-sm text-[var(--vayu-ink)] focus:border-[var(--vayu-accent)] focus:outline-none"
            >
              {HOUSEHOLD_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-[var(--vayu-ink-muted)]">
              Daily Commute Mode
            </span>
            <select
              value={profile.commuteMode}
              onChange={(e) => onProfileChange({ ...profile, commuteMode: e.target.value })}
              className="w-full rounded-lg border border-[var(--vayu-border)] bg-[var(--vayu-bg)] px-3 py-2 text-sm text-[var(--vayu-ink)] focus:border-[var(--vayu-accent)] focus:outline-none"
            >
              {COMMUTE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-[var(--vayu-ink-muted)]">
              Indoor & Cooking Setup
            </span>
            <select
              value={profile.homeSetup}
              onChange={(e) => onProfileChange({ ...profile, homeSetup: e.target.value })}
              className="w-full rounded-lg border border-[var(--vayu-border)] bg-[var(--vayu-bg)] px-3 py-2 text-sm text-[var(--vayu-ink)] focus:border-[var(--vayu-accent)] focus:outline-none"
            >
              {HOME_SETUP_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-[var(--vayu-ink-muted)]">
              Priority Focus
            </span>
            <select
              value={profile.primaryGoal}
              onChange={(e) => onProfileChange({ ...profile, primaryGoal: e.target.value })}
              className="w-full rounded-lg border border-[var(--vayu-border)] bg-[var(--vayu-bg)] px-3 py-2 text-sm text-[var(--vayu-ink)] focus:border-[var(--vayu-accent)] focus:outline-none"
            >
              {GOAL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && !plan && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-[var(--vayu-surface-muted)]" />
          <div className="h-64 animate-pulse rounded-2xl bg-[var(--vayu-surface-muted)]" />
        </div>
      )}

      {/* Populated Plan */}
      {plan && (
        <div className="mt-8 space-y-9">
          {/* Briefing & Live Direct Impact Calculator */}
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="rounded-2xl border border-[var(--vayu-border)] bg-[var(--vayu-surface)] p-6 lg:col-span-8">
              <div className="text-xs font-semibold text-[var(--vayu-accent)]">
                Location Briefing · {plan.city} (AQI {plan.aqi})
              </div>
              <p className="mt-2 font-display text-lg font-semibold leading-snug text-[var(--vayu-ink)]">
                {plan.locationBrief}
              </p>
              <div className="mt-4 grid gap-4 border-t border-[var(--vayu-border)] pt-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold text-[var(--vayu-ink-muted)]">
                    Local Airshed & Smog Dynamics
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--vayu-ink)]">
                    {plan.winterSmogDynamics}
                  </p>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--vayu-ink-muted)]">
                    Mask & Outdoor Exposure Rule
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--vayu-ink)]">
                    {plan.maskAndOutdoorRule}
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Choice Impact Summary */}
            <div className="flex flex-col justify-between rounded-2xl border border-[var(--vayu-border)] bg-[var(--vayu-surface-muted)] p-6 lg:col-span-4">
              <div>
                <div className="text-xs font-semibold text-[var(--vayu-accent)]">
                  Your Direct Choice Impact
                </div>
                <p className="mt-1 text-xs text-[var(--vayu-ink-muted)]">
                  Check off routines, indoor hacks, and swaps below to quantify your family impact.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="font-mono text-3xl font-bold tabular-nums text-[var(--vayu-ink)]">
                      -{selectedExposureReduction}%
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--vayu-ink-muted)]">
                      PM2.5 exposure drop
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-3xl font-bold tabular-nums text-[var(--vayu-ink)]">
                      {selectedCo2Saved.toFixed(1)}{' '}
                      <span className="text-sm font-normal">kg</span>
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--vayu-ink-muted)]">
                      CO₂e avoided / week
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-[var(--vayu-border)] pt-3 text-xs leading-relaxed text-[var(--vayu-ink)]">
                <span className="font-mono font-semibold tabular-nums">
                  {totalActionsSelected}
                </span>{' '}
                actions committed · {plan.impactSummary}
              </div>
            </div>
          </div>

          {/* Section 1: Low-Emission Daily Routines */}
          <div id="routines" className="space-y-4">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-[var(--vayu-accent)]" aria-hidden="true" />
              <h3 className="font-display text-xl font-bold text-[var(--vayu-ink)]">
                Low-Emission Daily Routines
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {plan.dailyRoutines.map((routine) => {
                const checked = Boolean(checkedRoutines[routine.id]);
                return (
                  <button
                    key={routine.id}
                    type="button"
                    onClick={() => toggleItem(setCheckedRoutines, routine.id)}
                    className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition-colors ${
                      checked
                        ? 'border-[var(--vayu-accent)] bg-[var(--vayu-surface-muted)]'
                        : 'border-[var(--vayu-border)] bg-[var(--vayu-surface)] hover:border-[var(--vayu-accent)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-xs font-medium text-[var(--vayu-ink-muted)]">
                          {routine.timeWindow}
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono font-semibold tabular-nums text-[var(--vayu-accent)]">
                            -{routine.exposureReductionPct}% exposure
                          </span>
                        </div>
                        {checked ? (
                          <CheckCircle2
                            className="h-5 w-5 shrink-0 text-[var(--vayu-accent)]"
                            aria-hidden="true"
                          />
                        ) : (
                          <Circle
                            className="h-5 w-5 shrink-0 text-[var(--vayu-ink-muted)]"
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      <h4 className="mt-2 font-display text-base font-bold text-[var(--vayu-ink)]">
                        {routine.title}
                      </h4>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--vayu-ink)]">
                        {routine.action}
                      </p>
                    </div>

                    <div className="mt-4 border-t border-[var(--vayu-border)] pt-3 text-xs text-[var(--vayu-ink-muted)]">
                      <strong className="text-[var(--vayu-ink)]">Direct impact:</strong>{' '}
                      {routine.whyItMatters} (saves ~{routine.co2SavedKgPerWeek} kg CO₂e/wk)
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Indoor Air Quality Hacks */}
          <div id="indoor-hacks" className="space-y-4">
            <div className="flex items-center gap-2">
              <Home className="h-5 w-5 text-[var(--vayu-accent)]" aria-hidden="true" />
              <h3 className="font-display text-xl font-bold text-[var(--vayu-ink)]">
                Indoor Air Quality Hacks
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {plan.indoorHacks.map((hack) => {
                const checked = Boolean(checkedHacks[hack.id]);
                return (
                  <button
                    key={hack.id}
                    type="button"
                    onClick={() => toggleItem(setCheckedHacks, hack.id)}
                    className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition-colors ${
                      checked
                        ? 'border-[var(--vayu-accent)] bg-[var(--vayu-surface-muted)]'
                        : 'border-[var(--vayu-border)] bg-[var(--vayu-surface)] hover:border-[var(--vayu-accent)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-xs font-medium text-[var(--vayu-ink-muted)]">
                          {hack.costTier}
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono font-semibold tabular-nums text-[var(--vayu-accent)]">
                            -{hack.indoorPmReductionPct}% indoor PM2.5
                          </span>
                        </div>
                        {checked ? (
                          <CheckCircle2
                            className="h-5 w-5 shrink-0 text-[var(--vayu-accent)]"
                            aria-hidden="true"
                          />
                        ) : (
                          <Circle
                            className="h-5 w-5 shrink-0 text-[var(--vayu-ink-muted)]"
                            aria-hidden="true"
                          />
                        )}
                      </div>

                      <h4 className="mt-2 font-display text-base font-bold text-[var(--vayu-ink)]">
                        {hack.title}
                      </h4>
                      <p className="mt-1.5 text-sm leading-relaxed text-[var(--vayu-ink)]">
                        {hack.steps}
                      </p>
                    </div>

                    <div className="mt-4 border-t border-[var(--vayu-border)] pt-3 text-xs text-[var(--vayu-ink-muted)]">
                      <strong className="text-[var(--vayu-ink)]">Why it works:</strong>{' '}
                      {hack.directImpact}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Sustainable Alternatives & Direct Impact */}
          <div id="alternatives" className="space-y-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-[var(--vayu-accent)]" aria-hidden="true" />
              <h3 className="font-display text-xl font-bold text-[var(--vayu-ink)]">
                Sustainable Alternatives & Direct Impact
              </h3>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--vayu-border)] bg-[var(--vayu-surface)]">
              <div className="divide-y divide-[var(--vayu-border)]">
                {plan.sustainableAlternatives.map((swap) => {
                  const checked = Boolean(checkedSwaps[swap.id]);
                  return (
                    <div
                      key={swap.id}
                      className={`grid gap-4 p-5 transition-colors lg:grid-cols-12 lg:items-center ${
                        checked ? 'bg-[var(--vayu-surface-muted)]' : ''
                      }`}
                    >
                      <div className="lg:col-span-4">
                        <div className="text-xs font-medium text-[var(--vayu-ink-muted)]">
                          {swap.category} · Replaces: {swap.replaces}
                        </div>
                        <div className="mt-1 font-display text-base font-bold text-[var(--vayu-ink)]">
                          {swap.alternative}
                        </div>
                      </div>

                      <div className="text-sm text-[var(--vayu-ink)] lg:col-span-3">
                        <div className="text-xs font-semibold text-[var(--vayu-ink-muted)]">
                          Direct Family Health Impact
                        </div>
                        <p className="mt-0.5">{swap.directHealthImpact}</p>
                      </div>

                      <div className="text-sm text-[var(--vayu-ink)] lg:col-span-3">
                        <div className="text-xs font-semibold text-[var(--vayu-ink-muted)]">
                          Community Airshed Impact
                        </div>
                        <p className="mt-0.5">{swap.communityEmissionImpact}</p>
                      </div>

                      <div className="flex items-center justify-between gap-3 lg:col-span-2 lg:justify-end">
                        <span className="font-mono text-xs font-semibold tabular-nums text-[var(--vayu-accent)]">
                          -{swap.co2SavedKgPerWeek} kg/wk
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleItem(setCheckedSwaps, swap.id)}
                          className={`whitespace-nowrap shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            checked
                              ? 'border-[var(--vayu-accent)] bg-[var(--vayu-accent)] text-[var(--vayu-accent-ink)]'
                              : 'border-[var(--vayu-border)] bg-[var(--vayu-bg)] text-[var(--vayu-ink)] hover:border-[var(--vayu-accent)]'
                          }`}
                        >
                          {checked ? 'Adopted' : 'Adopt Swap'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
