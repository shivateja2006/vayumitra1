/// <reference types="google.maps" />
import { useCallback, useEffect, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  useMap,
} from '@vis.gl/react-google-maps';
import { Layers, MapPin, Navigation, Loader2 } from 'lucide-react';
import type { AreaAqiStation, CityAqiReading, LocationDetail } from '../types/aqi';

interface AreaAirQualityMapProps {
  activeLocation: LocationDetail | null;
  cities: CityAqiReading[];
  onSelectLocationCoords: (loc: {
    id: string;
    name: string;
    country: string;
    region?: string;
    lat: number;
    lon: number;
    isMainCity?: boolean;
  }) => void;
}

type MapScope = 'neighborhood' | 'india';
type HeatmapLayerType = 'IND_CPCB' | 'US_AQI' | 'PM25_INDIGO_PERSIAN';

function getPinPalette(theme: 'good' | 'moderate' | 'high'): {
  bg: string;
  border: string;
  text: string;
} {
  if (theme === 'high') {
    return { bg: '#dc2626', border: '#7f1d1d', text: '#ffffff' };
  }
  if (theme === 'moderate') {
    return { bg: '#d97706', border: '#78350f', text: '#ffffff' };
  }
  return { bg: '#0d9488', border: '#064e3b', text: '#ffffff' };
}

function AqHeatmapOverlay({
  enabled,
  layerType,
}: {
  enabled: boolean;
  layerType: HeatmapLayerType;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;

    map.overlayMapTypes.clear();
    if (!enabled) return;

    const aqLayer = new google.maps.ImageMapType({
      getTileUrl: (coord, zoom) => {
        if (zoom < 0 || zoom > 16) return null;
        const numTiles = 1 << zoom;
        if (coord.y < 0 || coord.y >= numTiles) return null;
        const x = ((coord.x % numTiles) + numTiles) % numTiles;
        return `/api/maps/aq-tile/${layerType}/${zoom}/${x}/${coord.y}`;
      },
      tileSize: new google.maps.Size(256, 256),
      maxZoom: 16,
      minZoom: 0,
      name: 'India Air Quality Heatmap',
      opacity: 0.56,
    });

    map.overlayMapTypes.insertAt(0, aqLayer);
    return () => {
      map.overlayMapTypes.clear();
    };
  }, [map, enabled, layerType]);

  return null;
}

function MapCameraSync({
  center,
  zoom,
}: {
  center: { lat: number; lng: number };
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(center);
    map.setZoom(zoom);
  }, [map, center.lat, center.lng, zoom]);

  return null;
}

function StationMarker({
  id,
  lat,
  lng,
  label,
  aqi,
  theme,
  isSelected,
  onSelect,
}: {
  id: string;
  lat: number;
  lng: number;
  label: string;
  aqi: number;
  theme: 'good' | 'moderate' | 'high';
  isSelected: boolean;
  onSelect: (marker: google.maps.marker.AdvancedMarkerElement | null) => void;
}) {
  const [markerInstance, setMarkerInstance] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  const palette = getPinPalette(theme);

  const markerRef = useCallback((el: google.maps.marker.AdvancedMarkerElement | null) => {
    setMarkerInstance(el);
  }, []);

  return (
    <AdvancedMarker
      key={id}
      ref={markerRef}
      position={{ lat, lng }}
      title={`${label} — NAQI ${aqi}`}
      onClick={() => onSelect(markerInstance)}
    >
      <div
        className={`flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-xs font-bold shadow-md transition-transform ${
          isSelected ? 'scale-110 ring-2 ring-white' : 'hover:scale-105'
        }`}
        style={{
          backgroundColor: palette.bg,
          borderColor: palette.border,
          color: palette.text,
        }}
      >
        <span className="tabular-nums">{aqi}</span>
      </div>
    </AdvancedMarker>
  );
}

export function AreaAirQualityMap({
  activeLocation,
  cities,
  onSelectLocationCoords,
}: AreaAirQualityMapProps) {
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    () => import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  );
  const [loadingKey, setLoadingKey] = useState(!import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

  const [scope, setScope] = useState<MapScope>('neighborhood');
  const [heatmapEnabled, setHeatmapEnabled] = useState(true);
  const [heatmapType, setHeatmapType] = useState<HeatmapLayerType>('IND_CPCB');

  const [areas, setAreas] = useState<AreaAqiStation[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [areasError, setAreasError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<{
    id: string;
    title: string;
    subtitle: string;
    lat: number;
    lng: number;
    aqi: number;
    pm25: number;
    pm10: number;
    no2: number;
    tier: string;
    dominantPollutant: string;
    isCity: boolean;
    cityPayload?: CityAqiReading;
  } | null>(null);
  const [anchorMarker, setAnchorMarker] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);

  useEffect(() => {
    if (mapsApiKey) {
      setLoadingKey(false);
      return;
    }
    let mounted = true;
    fetch('/api/maps/config')
      .then((res) => res.json())
      .then((data: { apiKey?: string }) => {
        if (mounted && data.apiKey) {
          setMapsApiKey(data.apiKey);
        }
      })
      .catch(() => {
        // Handled cleanly by fallback notice
      })
      .finally(() => {
        if (mounted) setLoadingKey(false);
      });
    return () => {
      mounted = false;
    };
  }, [mapsApiKey]);

  useEffect(() => {
    if (!activeLocation) return;
    let mounted = true;
    setLoadingAreas(true);
    setAreasError(null);
    setSelectedItem(null);
    setAnchorMarker(null);

    const params = new URLSearchParams({
      lat: String(activeLocation.lat),
      lon: String(activeLocation.lon),
      cityId: activeLocation.id,
      name: activeLocation.name,
    });

    fetch(`/api/aqi/areas?${params.toString()}`)
      .then(async (res) => {
        const data = (await res.json()) as { areas?: AreaAqiStation[]; error?: string };
        if (!res.ok || !data.areas) {
          throw new Error(data.error || 'Unable to load area-wise air quality');
        }
        if (mounted) setAreas(data.areas);
      })
      .catch((err) => {
        if (mounted) {
          setAreasError(err instanceof Error ? err.message : 'Area feed unavailable');
        }
      })
      .finally(() => {
        if (mounted) setLoadingAreas(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeLocation?.id, activeLocation?.lat, activeLocation?.lon, activeLocation?.name]);

  const mapCenter =
    scope === 'india'
      ? { lat: 21.7679, lng: 78.8718 }
      : activeLocation
        ? { lat: activeLocation.lat, lng: activeLocation.lon }
        : { lat: 28.6139, lng: 77.209 };

  const mapZoom = scope === 'india' ? 5 : 11;

  return (
    <section id="area-map" className="mx-auto max-w-[1320px] px-4 pt-8 sm:px-6">
      <div className="rounded-2xl border border-[var(--vayu-border)] bg-[var(--vayu-surface)] p-6 transition-colors duration-300">
        {/* Map Header & Controls */}
        <div className="flex flex-col gap-4 border-b border-[var(--vayu-border)] pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold text-[var(--vayu-accent)]">
              Spatial Airshed Monitor
            </div>
            <h2 className="mt-0.5 font-display text-xl font-bold text-[var(--vayu-ink)] sm:text-2xl">
              Area-Wise Air Quality Map — {activeLocation ? activeLocation.name : 'India'}
            </h2>
            <p className="mt-1 text-sm text-[var(--vayu-ink-muted)]">
              Compare live neighborhood NAQI hotspots across zones, overlay CPCB air quality
              heatmap tiles, or switch to All-India Metros.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Scope Toggle */}
            <div
              role="group"
              aria-label="Map scope"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--vayu-border)] bg-[var(--vayu-bg)] p-1"
            >
              <button
                type="button"
                onClick={() => {
                  setScope('neighborhood');
                  setSelectedItem(null);
                }}
                className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  scope === 'neighborhood'
                    ? 'bg-[var(--vayu-accent)] text-[var(--vayu-accent-ink)]'
                    : 'text-[var(--vayu-ink-muted)] hover:text-[var(--vayu-ink)]'
                }`}
              >
                Neighborhood Areas ({areas.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setScope('india');
                  setSelectedItem(null);
                }}
                className={`whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  scope === 'india'
                    ? 'bg-[var(--vayu-accent)] text-[var(--vayu-accent-ink)]'
                    : 'text-[var(--vayu-ink-muted)] hover:text-[var(--vayu-ink)]'
                }`}
              >
                All-India Metros ({cities.length})
              </button>
            </div>

            {/* Heatmap Controls */}
            <button
              type="button"
              onClick={() => setHeatmapEnabled((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                heatmapEnabled
                  ? 'border-[var(--vayu-accent)] bg-[var(--vayu-surface-muted)] text-[var(--vayu-ink)]'
                  : 'border-[var(--vayu-border)] bg-[var(--vayu-bg)] text-[var(--vayu-ink-muted)]'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-[var(--vayu-accent)]" aria-hidden="true" />
              <span>{heatmapEnabled ? 'Heatmap On' : 'Heatmap Off'}</span>
            </button>

            {heatmapEnabled && (
              <select
                aria-label="Heatmap layer type"
                value={heatmapType}
                onChange={(e) => setHeatmapType(e.target.value as HeatmapLayerType)}
                className="rounded-lg border border-[var(--vayu-border)] bg-[var(--vayu-bg)] px-2.5 py-2 text-xs font-medium text-[var(--vayu-ink)] focus:border-[var(--vayu-accent)] focus:outline-none"
              >
                <option value="IND_CPCB">India CPCB Heatmap</option>
                <option value="US_AQI">Global AQI Heatmap</option>
                <option value="PM25_INDIGO_PERSIAN">PM2.5 Density Layer</option>
              </select>
            )}
          </div>
        </div>

        {/* Map + Area List Split */}
        <div className="mt-5 grid gap-5 lg:grid-cols-12">
          {/* Interactive Google Map Viewport */}
          <div className="lg:col-span-8">
            <div className="relative h-[460px] w-full overflow-hidden rounded-xl border border-[var(--vayu-border)] bg-[var(--vayu-surface-muted)]">
              {loadingKey ? (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-[var(--vayu-ink-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Loading interactive air quality map...</span>
                </div>
              ) : !mapsApiKey ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-[var(--vayu-ink-muted)]">
                  <Navigation className="h-6 w-6 text-[var(--vayu-accent)]" aria-hidden="true" />
                  <p className="font-semibold text-[var(--vayu-ink)]">
                    Google Maps API key is initializing
                  </p>
                  <p className="max-w-md text-xs">
                    Area-wise station readings remain live on the right panel. Restart or reload if
                    the interactive map tiles have not yet appeared.
                  </p>
                </div>
              ) : (
                <APIProvider apiKey={mapsApiKey} language="en" region="IN" libraries={['marker']}>
                  <GoogleMap
                    mapId="DEMO_MAP_ID"
                    defaultCenter={mapCenter}
                    defaultZoom={mapZoom}
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                  >
                    <MapCameraSync center={mapCenter} zoom={mapZoom} />
                    <AqHeatmapOverlay enabled={heatmapEnabled} layerType={heatmapType} />

                    {scope === 'neighborhood'
                      ? areas.map((area) => (
                          <StationMarker
                            key={area.id}
                            id={area.id}
                            lat={area.lat}
                            lng={area.lon}
                            label={area.areaName}
                            aqi={area.aqi}
                            theme={area.theme}
                            isSelected={selectedItem?.id === area.id}
                            onSelect={(marker) => {
                              setAnchorMarker(marker);
                              setSelectedItem({
                                id: area.id,
                                title: area.areaName,
                                subtitle: `${area.zoneLabel} · ${activeLocation?.name ?? ''}`,
                                lat: area.lat,
                                lng: area.lon,
                                aqi: area.aqi,
                                pm25: area.pm25,
                                pm10: area.pm10,
                                no2: area.no2,
                                tier: area.tier,
                                dominantPollutant: area.dominantPollutant,
                                isCity: false,
                              });
                            }}
                          />
                        ))
                      : cities.map((city) => (
                          <StationMarker
                            key={city.id}
                            id={city.id}
                            lat={city.lat}
                            lng={city.lon}
                            label={city.name}
                            aqi={city.aqi}
                            theme={city.theme}
                            isSelected={selectedItem?.id === city.id}
                            onSelect={(marker) => {
                              setAnchorMarker(marker);
                              setSelectedItem({
                                id: city.id,
                                title: city.name,
                                subtitle: city.region,
                                lat: city.lat,
                                lng: city.lon,
                                aqi: city.aqi,
                                pm25: city.pm25,
                                pm10: city.pm10,
                                no2: city.no2,
                                tier: city.tier,
                                dominantPollutant: city.dominantPollutant,
                                isCity: true,
                                cityPayload: city,
                              });
                            }}
                          />
                        ))}

                    {selectedItem && anchorMarker && (
                      <InfoWindow
                        anchor={anchorMarker}
                        maxWidth={260}
                        onCloseClick={() => {
                          setSelectedItem(null);
                          setAnchorMarker(null);
                        }}
                      >
                        <div className="space-y-2 p-1 text-slate-900">
                          <div>
                            <div className="font-bold text-sm">{selectedItem.title}</div>
                            <div className="text-xs text-slate-600">{selectedItem.subtitle}</div>
                          </div>
                          <div className="flex items-baseline justify-between border-t border-slate-200 pt-1.5 text-xs">
                            <span>
                              NAQI <strong className="font-mono text-sm">{selectedItem.aqi}</strong>{' '}
                              ({selectedItem.tier})
                            </span>
                            <span className="font-mono text-slate-600">
                              PM2.5 {selectedItem.pm25}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600">
                            PM10 {selectedItem.pm10} µg/m³ · NO₂ {selectedItem.no2} µg/m³ · Main:{' '}
                            {selectedItem.dominantPollutant}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedItem.isCity && selectedItem.cityPayload) {
                                onSelectLocationCoords({
                                  id: selectedItem.cityPayload.id,
                                  name: selectedItem.cityPayload.name,
                                  country: selectedItem.cityPayload.country,
                                  region: selectedItem.cityPayload.region,
                                  lat: selectedItem.cityPayload.lat,
                                  lon: selectedItem.cityPayload.lon,
                                  isMainCity: selectedItem.cityPayload.isMainCity,
                                });
                              } else {
                                onSelectLocationCoords({
                                  id: selectedItem.id,
                                  name: selectedItem.title,
                                  country: 'India',
                                  region: activeLocation?.name ?? 'Neighborhood Zone',
                                  lat: selectedItem.lat,
                                  lon: selectedItem.lng,
                                  isMainCity: false,
                                });
                              }
                            }}
                            className="w-full rounded bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                          >
                            Make Active Location
                          </button>
                        </div>
                      </InfoWindow>
                    )}
                  </GoogleMap>
                </APIProvider>
              )}
            </div>

            {/* Map Legend */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--vayu-ink-muted)]">
              <div className="flex flex-wrap items-center gap-4">
                <span>NAQI Scale:</span>
                <span className="font-medium text-emerald-700 dark:text-emerald-300">
                  0–100 Good / Satisfactory
                </span>
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  101–200 Moderate
                </span>
                <span className="font-medium text-red-700 dark:text-red-300">
                  201+ Poor / Very Poor / Severe
                </span>
              </div>
              <span>Click any zone marker to inspect pollutants or switch location</span>
            </div>
          </div>

          {/* Right: Area-Wise Station Breakdown */}
          <div className="flex flex-col rounded-xl border border-[var(--vayu-border)] bg-[var(--vayu-bg)] lg:col-span-4">
            <div className="border-b border-[var(--vayu-border)] px-4 py-3">
              <div className="font-display text-sm font-bold text-[var(--vayu-ink)]">
                {scope === 'neighborhood'
                  ? `${activeLocation?.name ?? 'City'} Neighborhood Zones`
                  : 'All Monitored Indian Metros'}
              </div>
              <div className="text-xs text-[var(--vayu-ink-muted)]">
                Sorted highest to lowest NAQI
              </div>
            </div>

            <div className="max-h-[410px] flex-1 divide-y divide-[var(--vayu-border)] overflow-y-auto">
              {areasError && scope === 'neighborhood' ? (
                <div className="p-4 text-xs text-red-700 dark:text-red-300">{areasError}</div>
              ) : loadingAreas && scope === 'neighborhood' ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-12 animate-pulse rounded bg-[var(--vayu-surface-muted)]"
                    />
                  ))}
                </div>
              ) : scope === 'neighborhood' ? (
                areas.map((area) => (
                  <div
                    key={area.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--vayu-surface)]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[var(--vayu-ink)]">
                        {area.areaName}
                      </div>
                      <div className="truncate text-xs text-[var(--vayu-ink-muted)]">
                        {area.zoneLabel} · PM2.5 {area.pm25} µg/m³
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <div className="font-mono text-base font-bold tabular-nums text-[var(--vayu-ink)]">
                          {area.aqi}
                        </div>
                        <div
                          className={`text-[11px] font-semibold ${
                            area.theme === 'high'
                              ? 'text-red-700 dark:text-red-300'
                              : area.theme === 'moderate'
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {area.tier}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onSelectLocationCoords({
                            id: area.id,
                            name: area.areaName,
                            country: 'India',
                            region: activeLocation?.name ?? area.zoneLabel,
                            lat: area.lat,
                            lon: area.lon,
                            isMainCity: false,
                          })
                        }
                        title={`Make ${area.areaName} active location`}
                        className="rounded-md border border-[var(--vayu-border)] bg-[var(--vayu-surface)] p-1.5 text-[var(--vayu-ink)] transition-colors hover:border-[var(--vayu-accent)] hover:text-[var(--vayu-accent)]"
                      >
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                cities.map((city) => (
                  <div
                    key={city.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--vayu-surface)]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[var(--vayu-ink)]">
                        {city.name}
                      </div>
                      <div className="truncate text-xs text-[var(--vayu-ink-muted)]">
                        {city.region} · PM2.5 {city.pm25} µg/m³
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <div className="font-mono text-base font-bold tabular-nums text-[var(--vayu-ink)]">
                          {city.aqi}
                        </div>
                        <div
                          className={`text-[11px] font-semibold ${
                            city.theme === 'high'
                              ? 'text-red-700 dark:text-red-300'
                              : city.theme === 'moderate'
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {city.tier}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onSelectLocationCoords({
                            id: city.id,
                            name: city.name,
                            country: city.country,
                            region: city.region,
                            lat: city.lat,
                            lon: city.lon,
                            isMainCity: city.isMainCity,
                          })
                        }
                        title={`Make ${city.name} active location`}
                        className="rounded-md border border-[var(--vayu-border)] bg-[var(--vayu-surface)] p-1.5 text-[var(--vayu-ink)] transition-colors hover:border-[var(--vayu-accent)] hover:text-[var(--vayu-accent)]"
                      >
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
