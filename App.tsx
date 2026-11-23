import { useCallback, useEffect, useRef, useState } from 'react';
import { LocateFixed, Loader2 } from 'lucide-react';
import { DangerousRunningBar } from './components/DangerousRunningBar';
import { WorkspaceToolbar, type ActiveAlertBanner } from './components/WorkspaceToolbar';
import { TopCitiesBar } from './components/TopCitiesBar';
import { LocationHero } from './components/LocationHero';
import { AreaAirQualityMap } from './components/AreaAirQualityMap';
import { VayumitraPlanner } from './components/VayumitraPlanner';
import { VayumitraChat } from './components/VayumitraChat';
import {
  didAqiCategoryWorsen,
  getNextWorseTier,
  getNotificationPermissionState,
  requestAqiNotificationPermission,
  sendAqiWorseningNotification,
  type BrowserNotificationPermission,
} from './utils/aqiNotifications';
import type {
  AqiSeverityTier,
  AqiThemeMode,
  AssistantPlanResponse,
  CityAqiReading,
  HouseholdProfile,
  LocationDetail,
  ThemePreference,
} from './types/aqi';

interface SelectedCoords {
  id: string;
  name: string;
  country: string;
  region?: string;
  lat: number;
  lon: number;
  isMainCity?: boolean;
}

const DEFAULT_PROFILE: HouseholdProfile = {
  householdType: 'Family with young children',
  commuteMode: 'Metro / city bus transit',
  homeSetup: 'Cross-ventilation windows & LPG gas stove',
  primaryGoal: 'Protect family health & cut daily emissions',
};

function getInitialThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'auto';
  const saved = window.localStorage.getItem('vayumitra-theme-preference');
  if (saved === 'auto' || saved === 'light' || saved === 'dark') return saved;
  return 'auto';
}

export default function App() {
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    getInitialThemePreference,
  );
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  const [cities, setCities] = useState<CityAqiReading[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  const [activeLocation, setActiveLocation] = useState<LocationDetail | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_PROFILE);
  const [plan, setPlan] = useState<AssistantPlanResponse | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const [locatingGps, setLocatingGps] = useState(false);
  const [gpsFeedback, setGpsFeedback] = useState<string | null>(null);

  const [permissionState, setPermissionState] = useState<BrowserNotificationPermission>(
    getNotificationPermissionState,
  );
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(
    () => getNotificationPermissionState() === 'granted',
  );
  const [checkingLive, setCheckingLive] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [alertBanner, setAlertBanner] = useState<ActiveAlertBanner | null>(null);

  const lastTierByLocationRef = useRef<Record<string, AqiSeverityTier>>({});
  const planAbortRef = useRef<AbortController | null>(null);

  const activeTheme: AqiThemeMode = activeLocation?.theme ?? 'good';

  // Listen for Google Maps Demo Key Quota Exhaustion events
  useEffect(() => {
    const onQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  // AQI-Adaptive Theme Engine (Auto (AQI) Default + Light / Dark Overrides)
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-aqi-theme', activeTheme);
    window.localStorage.setItem('vayumitra-theme-preference', themePreference);

    const isDarkActive =
      themePreference === 'dark' || (themePreference === 'auto' && activeTheme === 'high');
    const isForceLight = themePreference === 'light' && activeTheme === 'high';

    root.classList.toggle('dark', isDarkActive);
    root.classList.toggle('force-light', isForceLight);
  }, [activeTheme, themePreference]);

  const generatePlanForLocation = useCallback(
    async (loc: LocationDetail, currentProfile: HouseholdProfile) => {
      planAbortRef.current?.abort();
      const controller = new AbortController();
      planAbortRef.current = controller;

      setLoadingPlan(true);
      setPlanError(null);
      try {
        const res = await fetch('/api/assistant/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location: loc, profile: currentProfile }),
          signal: controller.signal,
        });

        let data: { plan?: AssistantPlanResponse; error?: string } = {};
        try {
          data = (await res.json()) as { plan?: AssistantPlanResponse; error?: string };
        } catch {
          // Non-JSON upstream error response
        }

        if (!res.ok || !data.plan) {
          throw new Error(
            data.error ||
              'Vayumitra AI is temporarily busy. Please wait a few seconds and click Retry Plan.',
          );
        }
        setPlan(data.plan);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        setPlanError(
          err instanceof Error
            ? err.message
            : 'Unable to generate tailored guidance. Please retry.',
        );
      } finally {
        if (planAbortRef.current === controller) {
          setLoadingPlan(false);
        }
      }
    },
    [],
  );

  const fetchLocationDetail = useCallback(async (coords: SelectedCoords): Promise<LocationDetail> => {
    const params = new URLSearchParams({
      id: coords.id,
      lat: String(coords.lat),
      lon: String(coords.lon),
      isMainCity: String(Boolean(coords.isMainCity)),
    });
    if (coords.name) params.set('name', coords.name);
    if (coords.country) params.set('country', coords.country);
    if (coords.region) params.set('region', coords.region);

    const res = await fetch(`/api/aqi/location?${params.toString()}`);
    const data = (await res.json()) as { location?: LocationDetail; error?: string };
    if (!res.ok || !data.location) {
      throw new Error(data.error || 'Could not load location air quality');
    }
    return data.location;
  }, []);

  const selectLocation = useCallback(
    async (coords: SelectedCoords) => {
      setLoadingLocation(true);
      setLocationError(null);
      setGpsFeedback(null);
      try {
        const nextLocation = await fetchLocationDetail(coords);
        lastTierByLocationRef.current[nextLocation.id] = nextLocation.tier;
        setActiveLocation(nextLocation);
        setLastCheckedAt(
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        );
        void generatePlanForLocation(nextLocation, profile);
      } catch (err) {
        setLocationError(err instanceof Error ? err.message : 'Failed to load location telemetry');
      } finally {
        setLoadingLocation(false);
      }
    },
    [fetchLocationDetail, generatePlanForLocation, profile],
  );

  const checkActiveLocationLive = useCallback(async () => {
    if (!activeLocation || checkingLive) return;
    setCheckingLive(true);
    try {
      const latest = await fetchLocationDetail({
        id: activeLocation.id,
        name: activeLocation.name,
        country: activeLocation.country,
        region: activeLocation.region,
        lat: activeLocation.lat,
        lon: activeLocation.lon,
        isMainCity: activeLocation.isMainCity,
      });

      const previousTier = lastTierByLocationRef.current[latest.id] ?? activeLocation.tier;
      if (alertsEnabled && didAqiCategoryWorsen(previousTier, latest.tier)) {
        const result = sendAqiWorseningNotification({
          cityName: latest.name,
          previousTier,
          nextTier: latest.tier,
          aqi: latest.aqi,
          pm25: latest.pm25,
        });
        setAlertBanner({
          id: `alert-${Date.now()}`,
          title: result.title,
          body: result.body,
          nativeDispatched: result.dispatched,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }

      lastTierByLocationRef.current[latest.id] = latest.tier;
      setActiveLocation(latest);
      setLastCheckedAt(
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      );
    } catch {
      // Keep current telemetry visible if background poll fails transiently
    } finally {
      setCheckingLive(false);
    }
  }, [activeLocation, alertsEnabled, checkingLive, fetchLocationDetail]);

  useEffect(() => {
    if (!alertsEnabled || !activeLocation) return;
    const intervalId = window.setInterval(() => {
      void checkActiveLocationLive();
    }, 60000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [alertsEnabled, activeLocation, checkActiveLocationLive]);

  const handleToggleAlerts = async () => {
    if (alertsEnabled) {
      setAlertsEnabled(false);
      return;
    }

    const perm = await requestAqiNotificationPermission();
    setPermissionState(perm);
    setAlertsEnabled(true);
    if (activeLocation) {
      lastTierByLocationRef.current[activeLocation.id] = activeLocation.tier;
    }
  };

  const handleSendTestAlert = async () => {
    if (!activeLocation) return;
    let currentPerm = getNotificationPermissionState();
    if (currentPerm === 'default') {
      currentPerm = await requestAqiNotificationPermission();
      setPermissionState(currentPerm);
    }
    setAlertsEnabled(true);

    const simulatedWorseTier = getNextWorseTier(activeLocation.tier);
    const result = sendAqiWorseningNotification({
      cityName: activeLocation.name,
      previousTier: activeLocation.tier,
      nextTier: simulatedWorseTier,
      aqi: Math.max(activeLocation.aqi + 45, 225),
      pm25: Number((activeLocation.pm25 + 24).toFixed(1)),
      isTest: true,
    });

    setAlertBanner({
      id: `test-${Date.now()}`,
      title: result.title,
      body: result.body,
      nativeDispatched: result.dispatched,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  };

  useEffect(() => {
    let mounted = true;
    const loadInitialCities = async () => {
      setLoadingCities(true);
      setCitiesError(null);
      try {
        const res = await fetch('/api/aqi/cities');
        const data = (await res.json()) as { cities?: CityAqiReading[]; error?: string };
        if (!res.ok || !data.cities) {
          throw new Error(data.error || 'Unable to load Indian city air quality feed');
        }
        if (!mounted) return;
        setCities(data.cities);

        if (data.cities.length > 0) {
          const initial = data.cities[0];
          await selectLocation({
            id: initial.id,
            name: initial.name,
            country: initial.country,
            region: initial.region,
            lat: initial.lat,
            lon: initial.lon,
            isMainCity: initial.isMainCity,
          });
        }
      } catch (err) {
        if (!mounted) return;
        setCitiesError(err instanceof Error ? err.message : 'Failed to load monitored Indian cities');
        setLoadingLocation(false);
      } finally {
        if (mounted) setLoadingCities(false);
      }
    };

    void loadInitialCities();
    return () => {
      mounted = false;
    };
    // Initial mount load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGpsFeedback('Geolocation is not supported in this browser. Search your Indian city below.');
      return;
    }

    setLocatingGps(true);
    setGpsFeedback(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocatingGps(false);
        void selectLocation({
          id: `gps-${position.coords.latitude.toFixed(2)}-${position.coords.longitude.toFixed(2)}`,
          name: '',
          country: 'India',
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          isMainCity: false,
        });
      },
      () => {
        setLocatingGps(false);
        setGpsFeedback('Location permission denied. Pick a major Indian city or search below.');
      },
      { timeout: 10000 },
    );
  };

  return (
    <div
      data-aqi-theme={activeTheme}
      className="min-h-screen text-[var(--vayu-ink)] transition-colors duration-300"
    >
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Bar Contract: 1-line wordmark — 4 single-line nav links — 1 primary action */}
      <header className="sticky top-0 z-40 border-b border-[var(--vayu-border)] bg-[var(--vayu-surface)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
          <a
            href="#overview"
            className="font-display text-xl font-bold tracking-tight text-[var(--vayu-accent)] whitespace-nowrap shrink-0"
          >
            Vayumitra
          </a>

          <nav
            aria-label="Primary sections"
            className="hidden items-center gap-6 text-sm font-medium text-[var(--vayu-ink-muted)] md:flex"
          >
            <a
              href="#overview"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[var(--vayu-accent)] hover:underline"
            >
              Overview
            </a>
            <a
              href="#area-map"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[var(--vayu-accent)] hover:underline"
            >
              Area Map
            </a>
            <a
              href="#routines"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[var(--vayu-accent)] hover:underline"
            >
              Routines
            </a>
            <a
              href="#ask-vayumitra"
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[var(--vayu-accent)] hover:underline"
            >
              Ask Vayumitra
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={locatingGps}
              className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-[var(--vayu-accent)] px-4 py-2 text-xs font-semibold text-[var(--vayu-accent-ink)] transition-colors hover:bg-[var(--vayu-accent-hover)] disabled:opacity-60"
            >
              {locatingGps ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{locatingGps ? 'Locating...' : 'Use My Location'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Running Dangerous Indian Cities Bar */}
      <DangerousRunningBar
        cities={cities}
        activeCityId={activeLocation?.id ?? ''}
        onSelectCity={(city) =>
          void selectLocation({
            id: city.id,
            name: city.name,
            country: city.country,
            region: city.region,
            lat: city.lat,
            lon: city.lon,
            isMainCity: city.isMainCity,
          })
        }
      />

      {/* Workspace Controls: Browser Notification Alerts + Auto (AQI) / Light / Dark Theme Engine */}
      <WorkspaceToolbar
        themePreference={themePreference}
        activeAqiTheme={activeTheme}
        onChangeThemePreference={setThemePreference}
        alertsEnabled={alertsEnabled}
        permissionState={permissionState}
        onToggleAlerts={() => void handleToggleAlerts()}
        onCheckLiveNow={() => void checkActiveLocationLive()}
        onSendTestAlert={() => void handleSendTestAlert()}
        checkingLive={checkingLive}
        lastCheckedAt={lastCheckedAt}
        activeLocation={activeLocation}
        alertBanner={alertBanner}
        onDismissAlertBanner={() => setAlertBanner(null)}
      />

      {gpsFeedback && (
        <div className="border-b border-[var(--vayu-border)] bg-[var(--vayu-surface-muted)] px-4 py-2 text-center text-xs text-[var(--vayu-ink)]">
          {gpsFeedback}
        </div>
      )}

      <main>
        {/* Top Row: Major Indian Cities (including Kochi) & Dangerous AQI Watch */}
        <TopCitiesBar
          cities={cities}
          loadingCities={loadingCities}
          citiesError={citiesError}
          activeCityId={activeLocation?.id ?? ''}
          onSelectCity={(city) => void selectLocation(city)}
        />

        {/* Hero Adaptive AQI Dashboard */}
        <LocationHero
          location={activeLocation}
          loading={loadingLocation}
          error={locationError}
        />

        {/* Area-Wise Air Quality Map (Google Maps + Neighborhood Zones + CPCB Heatmap) */}
        <AreaAirQualityMap
          activeLocation={activeLocation}
          cities={cities}
          onSelectLocationCoords={(loc) => void selectLocation(loc)}
        />

        {/* Tailored GenAI Low-Emission Routines, Indoor Hacks, Sustainable Swaps & Impact */}
        <VayumitraPlanner
          location={activeLocation}
          profile={profile}
          onProfileChange={setProfile}
          plan={plan}
          loading={loadingPlan}
          error={planError}
          onGeneratePlan={() => {
            if (activeLocation) {
              void generatePlanForLocation(activeLocation, profile);
            }
          }}
        />

        {/* Interactive GenAI Follow-Up Assistant */}
        <VayumitraChat location={activeLocation} profile={profile} />
      </main>

      <footer className="border-t border-[var(--vayu-border)] bg-[var(--vayu-surface)] py-6 text-xs text-[var(--vayu-ink-muted)]">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            Vayumitra India · AQI-Adaptive Theme Engine: Good Air (0–100) · Caution Haze
            (101–200) · Bad Air Alert (&gt;200)
          </div>
          <div>
            Air quality telemetry by Open-Meteo · Maps &amp; heatmap tiles powered by Google Maps
            Platform
          </div>
        </div>
      </footer>
    </div>
  );
}
