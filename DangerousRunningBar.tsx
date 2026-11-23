import { AlertTriangle, MapPin } from 'lucide-react';
import type { CityAqiReading } from '../types/aqi';

interface DangerousRunningBarProps {
  cities: CityAqiReading[];
  activeCityId: string;
  onSelectCity: (city: CityAqiReading) => void;
}

export function DangerousRunningBar({
  cities,
  activeCityId,
  onSelectCity,
}: DangerousRunningBarProps) {
  if (cities.length === 0) return null;

  const dangerous = cities.filter((c) => c.isDangerous);
  const marqueeCities = dangerous.length >= 3 ? dangerous : cities.slice(0, 6);
  const trackItems = [...marqueeCities, ...marqueeCities];

  return (
    <div
      aria-label="Running dangerous Indian cities air quality ticker"
      className="border-b border-[var(--vayu-ticker-border)] bg-[var(--vayu-ticker-bg)] text-white transition-colors duration-300"
    >
      <div className="mx-auto flex max-w-[1320px] items-center">
        {/* Static Left Anchor Label */}
        <div className="z-10 flex shrink-0 items-center gap-2 border-r border-white/15 bg-[var(--vayu-ticker-bg)] px-4 py-2.5 text-xs font-semibold tracking-tight sm:px-6">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
          <span className="whitespace-nowrap">
            {dangerous.length > 0 ? 'Dangerous Cities Alert' : 'Highest AQI Watch'}
          </span>
        </div>

        {/* Smooth Running Tile Marquee */}
        <div className="vayu-marquee-container relative flex-1 overflow-hidden py-1.5">
          <div className="vayu-marquee-track items-center gap-2.5 px-3">
            {trackItems.map((city, idx) => {
              const isActive = city.id === activeCityId;
              return (
                <button
                  key={`${city.id}-${idx}`}
                  type="button"
                  onClick={() => onSelectCity(city)}
                  className={`group inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                    isActive
                      ? 'border-white bg-white text-orange-950'
                      : 'border-white/20 bg-black/20 text-white hover:border-white/60 hover:bg-black/35'
                  }`}
                >
                  <span className="font-display font-bold">{city.name}</span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      isActive ? 'text-red-700' : 'text-amber-300'
                    }`}
                  >
                    AQI {city.aqi}
                  </span>
                  <span
                    className={`text-[11px] ${
                      isActive ? 'text-orange-900' : 'text-white/80'
                    }`}
                  >
                    {city.tier} · PM2.5 {city.pm25}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      isActive
                        ? 'text-orange-950'
                        : 'text-amber-200 group-hover:text-white'
                    }`}
                  >
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    <span>{isActive ? 'Active' : 'Set'}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
