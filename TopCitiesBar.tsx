import { MapPin, Search, Check, AlertTriangle, Wind, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { CityAqiReading, CitySearchResult } from '../types/aqi';

interface TopCitiesBarProps {
  cities: CityAqiReading[];
  loadingCities: boolean;
  citiesError: string | null;
  activeCityId: string;
  onSelectCity: (city: {
    id: string;
    name: string;
    country: string;
    region?: string;
    lat: number;
    lon: number;
    isMainCity?: boolean;
  }) => void;
}

type CityFilterTab = 'main' | 'dangerous' | 'all';

function getTierTextColor(theme: CityAqiReading['theme']): string {
  if (theme === 'high') return 'text-red-700 dark:text-red-300';
  if (theme === 'moderate') return 'text-orange-700 dark:text-orange-300';
  return 'text-emerald-700 dark:text-emerald-300';
}

function getCardToneClasses(theme: CityAqiReading['theme'], isActive: boolean): string {
  if (isActive) {
    if (theme === 'high') {
      return 'bg-gradient-to-br from-red-700 to-red-800 text-white border-red-900 shadow-sm';
    }
    if (theme === 'moderate') {
      return 'bg-gradient-to-br from-orange-600 to-orange-700 text-white border-orange-800 shadow-sm';
    }
    return 'bg-gradient-to-br from-emerald-700 to-emerald-800 text-white border-emerald-900 shadow-sm';
  }
  if (theme === 'high') {
    return 'bg-[var(--vayu-surface)] border-red-200 dark:border-red-800/80 hover:border-red-500 dark:hover:border-red-400 text-[var(--vayu-ink)]';
  }
  if (theme === 'moderate') {
    return 'bg-[var(--vayu-surface)] border-orange-200 dark:border-orange-800/80 hover:border-orange-500 dark:hover:border-orange-400 text-[var(--vayu-ink)]';
  }
  return 'bg-[var(--vayu-surface)] border-emerald-200 dark:border-emerald-800/80 hover:border-emerald-600 dark:hover:border-emerald-400 text-[var(--vayu-ink)]';
}

export function TopCitiesBar({
  cities,
  loadingCities,
  citiesError,
  activeCityId,
  onSelectCity,
}: TopCitiesBarProps) {
  const [filterTab, setFilterTab] = useState<CityFilterTab>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CitySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(`/api/cities/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error('Could not search Indian cities');
        }
        const data = (await res.json()) as { results: CitySearchResult[] };
        setSearchResults(data.results ?? []);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setSearchError('Search unavailable right now.');
        }
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const dangerousCities = cities.filter((c) => c.isDangerous);
  const mainCities = cities.filter((c) => c.isMainCity);

  const filteredCities =
    filterTab === 'dangerous'
      ? dangerousCities.length > 0
        ? dangerousCities
        : cities.slice(0, 5)
      : filterTab === 'main'
        ? mainCities
        : cities;

  return (
    <section
      aria-labelledby="top-cities-heading"
      className="border-b border-[var(--vayu-border)] bg-[var(--vayu-surface)] transition-colors duration-300"
    >
      <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6">
        {/* Heading Row & Controls */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--vayu-ink-muted)]">
              <span>India National Airshed Watch</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {mainCities.length} major metros monitored
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums text-red-700 dark:text-red-300 font-semibold">
                {dangerousCities.length} cities in Poor+ (NAQI &gt; 200)
              </span>
            </div>
            <h1
              id="top-cities-heading"
              className="font-display text-2xl font-bold tracking-tight text-[var(--vayu-ink)] sm:text-[28px]"
              style={{ textWrap: 'balance' }}
            >
              Major Indian Cities & Dangerous AQI Watch
            </h1>
          </div>

          {/* Filter Tabs + Indian City Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div
              role="tablist"
              aria-label="Filter Indian cities"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--vayu-border)] bg-[var(--vayu-bg)] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={filterTab === 'main'}
                onClick={() => setFilterTab('main')}
                className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filterTab === 'main'
                    ? 'bg-[var(--vayu-accent)] text-[var(--vayu-accent-ink)]'
                    : 'text-[var(--vayu-ink-muted)] hover:text-[var(--vayu-ink)]'
                }`}
              >
                Major Cities ({mainCities.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filterTab === 'dangerous'}
                onClick={() => setFilterTab('dangerous')}
                className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filterTab === 'dangerous'
                    ? 'bg-red-700 text-white'
                    : 'text-[var(--vayu-ink-muted)] hover:text-[var(--vayu-ink)]'
                }`}
              >
                Dangerous AQI ({dangerousCities.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filterTab === 'all'}
                onClick={() => setFilterTab('all')}
                className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filterTab === 'all'
                    ? 'bg-[var(--vayu-accent)] text-[var(--vayu-accent-ink)]'
                    : 'text-[var(--vayu-ink-muted)] hover:text-[var(--vayu-ink)]'
                }`}
              >
                All India ({cities.length})
              </button>
            </div>

            {/* Search Any Indian City */}
            <div className="relative w-full sm:w-72">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--vayu-ink-muted)]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Indian city (Varanasi, Surat...)"
                aria-label="Search any Indian city to set as your location"
                className="w-full rounded-lg border border-[var(--vayu-border)] bg-[var(--vayu-bg)] py-2 pl-9 pr-3 text-sm text-[var(--vayu-ink)] placeholder:text-[var(--vayu-ink-muted)] focus:border-[var(--vayu-accent)] focus:outline-none"
              />
              {(searchResults.length > 0 || searching || searchError) && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-lg border border-[var(--vayu-border)] bg-[var(--vayu-surface)] shadow-lg">
                  {searching && (
                    <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-[var(--vayu-ink-muted)]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Searching Indian cities...</span>
                    </div>
                  )}
                  {searchError && (
                    <div className="px-3 py-2.5 text-xs text-red-700 dark:text-red-300">
                      {searchError}
                    </div>
                  )}
                  {!searching && !searchError && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                    <div className="px-3 py-2.5 text-xs text-[var(--vayu-ink-muted)]">
                      No matching Indian city found.
                    </div>
                  )}
                  {!searching &&
                    searchResults.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectCity({
                            id: item.id,
                            name: item.name,
                            country: item.country,
                            region: item.admin1,
                            lat: item.lat,
                            lon: item.lon,
                            isMainCity: false,
                          });
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="flex w-full items-center justify-between gap-3 border-b border-[var(--vayu-border)] px-3 py-2.5 text-left text-xs last:border-b-0 hover:bg-[var(--vayu-surface-muted)]"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-[var(--vayu-ink)]">
                            {item.name}
                          </div>
                          <div className="truncate text-[var(--vayu-ink-muted)]">
                            {item.admin1 ? `${item.admin1}, ` : ''}
                            {item.country}
                          </div>
                        </div>
                        <span className="whitespace-nowrap shrink-0 font-semibold text-[var(--vayu-accent)]">
                          Make Location
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row-Wise Horizontal Strip of Indian Cities */}
        <div className="mt-5">
          {citiesError ? (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
              {citiesError}
            </div>
          ) : loadingCities ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-28 animate-pulse rounded-xl border border-[var(--vayu-border)] bg-[var(--vayu-surface-muted)]"
                />
              ))}
            </div>
          ) : (
            <div className="city-strip-scroll flex gap-3 overflow-x-auto pb-2">
              {filteredCities.map((city) => {
                const isActive = city.id === activeCityId;
                return (
                  <div
                    key={city.id}
                    className={`flex min-w-[222px] shrink-0 flex-col justify-between rounded-xl border p-4 transition-all duration-200 ${getCardToneClasses(
                      city.theme,
                      isActive,
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {city.isDangerous ? (
                            <AlertTriangle
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isActive ? 'text-amber-200' : 'text-red-600 dark:text-red-400'
                              }`}
                              aria-hidden="true"
                            />
                          ) : (
                            <Wind
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isActive ? 'text-white/85' : 'text-[var(--vayu-accent)]'
                              }`}
                              aria-hidden="true"
                            />
                          )}
                          <h2 className="truncate font-display text-base font-bold">
                            {city.name}
                          </h2>
                        </div>
                        <p
                          className={`mt-0.5 truncate text-xs ${
                            isActive ? 'text-white/80' : 'text-[var(--vayu-ink-muted)]'
                          }`}
                        >
                          {city.region}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="font-mono text-2xl font-bold leading-none tabular-nums">
                          {city.aqi}
                        </div>
                        <div
                          className={`mt-1 text-[11px] font-semibold ${
                            isActive ? 'text-white/90' : getTierTextColor(city.theme)
                          }`}
                        >
                          {city.tier}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-current/15 pt-3">
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          isActive ? 'text-white/85' : 'text-[var(--vayu-ink-muted)]'
                        }`}
                      >
                        PM2.5 {city.pm25} µg/m³
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          onSelectCity({
                            id: city.id,
                            name: city.name,
                            country: city.country,
                            region: city.region,
                            lat: city.lat,
                            lon: city.lon,
                            isMainCity: city.isMainCity,
                          })
                        }
                        className={`inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                          isActive
                            ? 'bg-white text-orange-950'
                            : 'bg-[var(--vayu-surface-muted)] text-[var(--vayu-ink)] hover:bg-[var(--vayu-accent)] hover:text-[var(--vayu-accent-ink)]'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <Check className="h-3 w-3" aria-hidden="true" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                            <span>Make Location</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
