import { useState } from 'react';
import { ShieldAlert, ShieldCheck, Clock, MapPin, SunMedium } from 'lucide-react';
import type { LocationDetail } from '../types/aqi';

interface LocationHeroProps {
  location: LocationDetail | null;
  loading: boolean;
  error: string | null;
}

function getThemeDescription(theme: LocationDetail['theme']): {
  label: string;
  headline: string;
  subline: string;
} {
  if (theme === 'high') {
    return {
      label: 'Bad Air Alert Theme · NAQI > 200',
      headline: 'High smog exposure risk. Prioritize indoor filtration and low-emission routines.',
      subline:
        'Fine particulates (PM2.5) and winter boundary-layer inversion elevate respiratory strain today.',
    };
  }
  if (theme === 'moderate') {
    return {
      label: 'Caution Haze Theme · NAQI 101–200',
      headline: 'Sensitive groups should time outdoor activity away from peak morning & evening traffic.',
      subline:
        'Ventilate indoors during the cleanest midday window and shift short trips to transit or walking.',
    };
  }
  return {
    label: 'Good Air Theme · NAQI 0–100',
    headline: 'Fresh air conditions active. Great window for cross-ventilation and outdoor movement.',
    subline:
      'Keep low-emission daily habits active to preserve clean neighborhood air quality.',
  };
}

function AqiDialGauge({ aqi }: { aqi: number }) {
  const clamped = Math.min(400, Math.max(0, aqi));
  const ratio = clamped / 400;
  const radius = 44;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ratio);

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width="116" height="68" viewBox="0 0 116 68" aria-hidden="true">
        <path
          d="M 14 58 A 44 44 0 0 1 102 58"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M 14 58 A 44 44 0 0 1 102 58"
          fill="none"
          stroke="#ffffff"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 450ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="-mt-8 text-center">
        <span className="font-mono text-3xl font-bold tracking-tight tabular-nums text-white sm:text-4xl">
          {aqi}
        </span>
        <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--vayu-hero-muted)]">
          Indian NAQI
        </div>
      </div>
    </div>
  );
}

function WhoBenchmarkBar({
  label,
  value,
  limit,
  unit,
}: {
  label: string;
  value: number;
  limit: number;
  unit: string;
}) {
  const ratio = value / limit;
  const pct = Math.min(100, Math.round((value / (limit * 4)) * 100));

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-[var(--vayu-hero-muted)]">{label}</span>
        <span className="font-mono font-semibold tabular-nums text-white">
          {value} {unit}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-white transition-all duration-300"
          style={{ width: `${Math.max(8, pct)}%` }}
        />
      </div>
      <div className="font-mono text-[11px] tabular-nums text-[var(--vayu-hero-muted)]">
        {ratio >= 1 ? `${ratio.toFixed(1)}× WHO 24h guideline` : 'Within WHO 24h guideline'}
      </div>
    </div>
  );
}

function HourlyTrajectoryChart({ location }: { location: LocationDetail }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const points = location.hourly.slice(0, 24);

  if (points.length < 2) {
    return (
      <div className="flex h-44 items-center justify-center rounded-xl border border-white/15 bg-black/15 text-xs text-white/75">
        Hourly trajectory unavailable for this coordinate.
      </div>
    );
  }

  const width = 620;
  const height = 175;
  const padX = 28;
  const padTop = 18;
  const padBottom = 26;

  const maxAqi = Math.max(100, ...points.map((p) => p.aqi)) * 1.1;
  const minAqi = 0;

  const coords = points.map((pt, idx) => {
    const x = padX + (idx / (points.length - 1)) * (width - padX * 2);
    const y =
      padTop +
      ((maxAqi - pt.aqi) / Math.max(1, maxAqi - minAqi)) * (height - padTop - padBottom);
    return { x, y, pt };
  });

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(
    height - padBottom
  ).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(height - padBottom).toFixed(1)} Z`;

  const activePoint = hoveredIdx !== null ? coords[hoveredIdx] : coords[Math.floor(coords.length / 2)];

  return (
    <div className="rounded-xl border border-[var(--vayu-hero-border)] bg-black/20 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-white">24-Hour NAQI & PM2.5 Curve (IST)</span>
        <span className="font-mono tabular-nums text-[var(--vayu-hero-muted)]">
          {activePoint.pt.hourLabel} · NAQI {activePoint.pt.aqi} · PM2.5 {activePoint.pt.pm25} µg/m³
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full overflow-visible"
        role="img"
        aria-label="24 hour AQI trajectory chart"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {[0, 0.5, 1].map((ratio) => {
          const gy = padTop + ratio * (height - padTop - padBottom);
          const val = Math.round(maxAqi * (1 - ratio));
          return (
            <g key={ratio}>
              <line
                x1={padX}
                y1={gy}
                x2={width - padX}
                y2={gy}
                stroke="rgba(255,255,255,0.14)"
                strokeDasharray="3 3"
              />
              <text
                x={4}
                y={gy + 3}
                fill="rgba(255,255,255,0.68)"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
              >
                {val}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="rgba(255,255,255,0.14)" />
        <path
          d={linePath}
          fill="none"
          stroke="rgba(255,255,255,0.95)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        <line
          x1={activePoint.x}
          y1={padTop}
          x2={activePoint.x}
          y2={height - padBottom}
          stroke="rgba(255,255,255,0.4)"
          strokeDasharray="2 2"
        />
        <circle
          cx={activePoint.x}
          cy={activePoint.y}
          r="5"
          fill="#ffffff"
          stroke="rgba(0,0,0,0.45)"
          strokeWidth="1.5"
        />

        {coords
          .filter((_, idx) => idx % 4 === 0 || idx === coords.length - 1)
          .map((c) => (
            <text
              key={c.pt.time}
              x={c.x}
              y={height - 6}
              textAnchor="middle"
              fill="rgba(255,255,255,0.75)"
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
            >
              {c.pt.hourLabel}
            </text>
          ))}

        {coords.map((c, idx) => (
          <rect
            key={c.pt.time}
            x={c.x - (width - padX * 2) / (coords.length * 2)}
            y={0}
            width={(width - padX * 2) / coords.length}
            height={height}
            fill="transparent"
            className="cursor-crosshair"
            onMouseEnter={() => setHoveredIdx(idx)}
          />
        ))}
      </svg>
    </div>
  );
}

export function LocationHero({ location, loading, error }: LocationHeroProps) {
  if (error) {
    return (
      <section className="mx-auto max-w-[1320px] px-4 pt-6 sm:px-6">
        <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
          {error}
        </div>
      </section>
    );
  }

  if (loading || !location) {
    return (
      <section className="mx-auto max-w-[1320px] px-4 pt-6 sm:px-6">
        <div className="h-80 animate-pulse rounded-2xl bg-[var(--vayu-surface-muted)]" />
      </section>
    );
  }

  const themeInfo = getThemeDescription(location.theme);

  return (
    <section id="overview" className="mx-auto max-w-[1320px] px-4 pt-6 sm:px-6">
      <div
        className="rounded-2xl p-6 text-[var(--vayu-hero-ink)] shadow-sm transition-colors duration-300 sm:p-8"
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--vayu-hero-from) 0%, var(--vayu-hero-to) 100%)',
        }}
      >
        <div className="grid gap-8 lg:grid-cols-12 lg:items-stretch">
          {/* Left: City Readout, Gauge & WHO Benchmarks */}
          <div className="flex flex-col justify-between gap-6 lg:col-span-7">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[var(--vayu-hero-muted)]">
                {location.theme === 'high' ? (
                  <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                ) : location.theme === 'moderate' ? (
                  <SunMedium className="h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span>{themeInfo.label}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-white">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {location.name}, {location.region}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <AqiDialGauge aqi={location.aqi} />

                <div className="border-l border-[var(--vayu-hero-border)] pl-6">
                  <div className="font-display text-3xl font-bold tracking-tight text-white">
                    {location.tier}
                  </div>
                  <div className="mt-1 text-xs text-[var(--vayu-hero-muted)]">
                    Dominant pollutant: <strong className="text-white">{location.dominantPollutant}</strong>
                    <span aria-hidden="true"> · </span>
                    <span>India Urban Grid</span>
                  </div>
                </div>
              </div>

              <p
                className="max-w-2xl font-display text-lg font-medium leading-snug text-white sm:text-xl"
                style={{ textWrap: 'balance' }}
              >
                {themeInfo.headline}
              </p>
              <p className="max-w-2xl text-sm text-[var(--vayu-hero-muted)]">
                {themeInfo.subline}
              </p>
            </div>

            {/* WHO Guideline Pollutant Comparison Bars */}
            <div className="grid grid-cols-1 gap-4 border-t border-[var(--vayu-hero-border)] pt-5 sm:grid-cols-3">
              <WhoBenchmarkBar
                label="PM2.5 Fine Particulates"
                value={location.pm25}
                limit={15}
                unit="µg/m³"
              />
              <WhoBenchmarkBar
                label="PM10 Coarse Dust"
                value={location.pm10}
                limit={45}
                unit="µg/m³"
              />
              <WhoBenchmarkBar
                label="NO₂ Traffic Exhaust"
                value={location.no2}
                limit={25}
                unit="µg/m³"
              />
            </div>
          </div>

          {/* Right: 24-Hour Trajectory Chart & Ventilation Timing */}
          <div className="flex flex-col justify-between gap-3 lg:col-span-5">
            <HourlyTrajectoryChart location={location} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--vayu-hero-border)] bg-black/15 px-4 py-3 text-xs">
                <div className="flex items-center gap-1.5 text-[var(--vayu-hero-muted)]">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Cleanest Window Today</span>
                </div>
                <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-white">
                  {location.bestVentilationWindow}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--vayu-hero-border)] bg-black/15 px-4 py-3 text-xs">
                <div className="text-[var(--vayu-hero-muted)]">Peak Smog Risk Window</div>
                <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-white">
                  {location.peakSmogWindow}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
