import {
  Bell,
  BellOff,
  BellRing,
  Moon,
  RefreshCw,
  Sun,
  Sparkles,
  X,
  AlertTriangle,
} from 'lucide-react';
import type { AqiThemeMode, LocationDetail, ThemePreference } from '../types/aqi';
import type { BrowserNotificationPermission } from '../utils/aqiNotifications';

export interface ActiveAlertBanner {
  id: string;
  title: string;
  body: string;
  nativeDispatched: boolean;
  timestamp: string;
}

interface WorkspaceToolbarProps {
  themePreference: ThemePreference;
  activeAqiTheme: AqiThemeMode;
  onChangeThemePreference: (pref: ThemePreference) => void;
  alertsEnabled: boolean;
  permissionState: BrowserNotificationPermission;
  onToggleAlerts: () => void;
  onCheckLiveNow: () => void;
  onSendTestAlert: () => void;
  checkingLive: boolean;
  lastCheckedAt: string | null;
  activeLocation: LocationDetail | null;
  alertBanner: ActiveAlertBanner | null;
  onDismissAlertBanner: () => void;
}

function getAqiThemeLabel(theme: AqiThemeMode): string {
  if (theme === 'good') return 'Good Air Theme';
  if (theme === 'moderate') return 'Caution Haze Theme';
  return 'Bad Air Alert Theme';
}

export function WorkspaceToolbar({
  themePreference,
  activeAqiTheme,
  onChangeThemePreference,
  alertsEnabled,
  permissionState,
  onToggleAlerts,
  onCheckLiveNow,
  onSendTestAlert,
  checkingLive,
  lastCheckedAt,
  activeLocation,
  alertBanner,
  onDismissAlertBanner,
}: WorkspaceToolbarProps) {
  const statusText = (() => {
    if (permissionState === 'unsupported') {
      return 'Browser Notification API unavailable; in-app alerts active';
    }
    if (permissionState === 'denied') {
      return 'Browser notifications blocked; using in-app alerts';
    }
    if (!alertsEnabled) {
      return 'Worsening NAQI alerts paused';
    }
    return activeLocation
      ? `Monitoring ${activeLocation.name} (${activeLocation.tier})`
      : 'Monitoring active location';
  })();

  return (
    <div className="border-b border-[var(--vayu-border)] bg-[var(--vayu-bg)] transition-colors duration-300">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-4 py-2.5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Browser Notification API Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleAlerts}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              alertsEnabled
                ? 'border-[var(--vayu-accent)] bg-[var(--vayu-accent)] text-[var(--vayu-accent-ink)]'
                : 'border-[var(--vayu-border)] bg-[var(--vayu-surface)] text-[var(--vayu-ink)] hover:border-[var(--vayu-accent)]'
            }`}
          >
            {alertsEnabled ? (
              <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
            ) : permissionState === 'denied' ? (
              <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Bell className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{alertsEnabled ? 'AQI Alerts On' : 'Enable AQI Alerts'}</span>
          </button>

          <button
            type="button"
            onClick={onCheckLiveNow}
            disabled={checkingLive || !activeLocation}
            className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-[var(--vayu-border)] bg-[var(--vayu-surface)] px-3 py-1.5 text-xs font-medium text-[var(--vayu-ink)] transition-colors hover:border-[var(--vayu-accent)] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${checkingLive ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{checkingLive ? 'Checking...' : 'Check Live'}</span>
          </button>

          <button
            type="button"
            onClick={onSendTestAlert}
            disabled={!activeLocation}
            className="whitespace-nowrap shrink-0 rounded-lg border border-[var(--vayu-border)] bg-[var(--vayu-surface)] px-3 py-1.5 text-xs font-medium text-[var(--vayu-ink)] transition-colors hover:border-[var(--vayu-accent)] disabled:opacity-50"
          >
            Test Alert
          </button>

          <span className="text-xs text-[var(--vayu-ink-muted)]">
            {statusText}
            {lastCheckedAt ? (
              <>
                <span aria-hidden="true"> · </span>
                <span className="font-mono tabular-nums">Checked {lastCheckedAt}</span>
              </>
            ) : null}
          </span>
        </div>

        {/* Right: AQI-Adaptive Theme Engine (Auto (AQI) | Light | Dark) */}
        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          <span className="text-xs font-medium text-[var(--vayu-ink-muted)]">
            {getAqiThemeLabel(activeAqiTheme)}
          </span>
          <div
            role="group"
            aria-label="Theme mode selector"
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--vayu-border)] bg-[var(--vayu-surface)] p-1"
          >
            <button
              type="button"
              onClick={() => onChangeThemePreference('auto')}
              aria-pressed={themePreference === 'auto'}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                themePreference === 'auto'
                  ? 'bg-[var(--vayu-accent)] text-[var(--vayu-accent-ink)]'
                  : 'text-[var(--vayu-ink-muted)] hover:text-[var(--vayu-ink)]'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Auto (AQI)</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeThemePreference('light')}
              aria-pressed={themePreference === 'light'}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                themePreference === 'light'
                  ? 'bg-[var(--vayu-accent)] text-[var(--vayu-accent-ink)]'
                  : 'text-[var(--vayu-ink-muted)] hover:text-[var(--vayu-ink)]'
              }`}
            >
              <Sun className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeThemePreference('dark')}
              aria-pressed={themePreference === 'dark'}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                themePreference === 'dark'
                  ? 'bg-[var(--vayu-accent)] text-[var(--vayu-accent-ink)]'
                  : 'text-[var(--vayu-ink-muted)] hover:text-[var(--vayu-ink)]'
              }`}
            >
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Worsening AQI Alert Banner */}
      {alertBanner && (
        <div
          role="alert"
          className="border-t border-red-300 bg-red-50 px-4 py-3 text-red-950 dark:border-red-800 dark:bg-red-950/80 dark:text-red-100 sm:px-6"
        >
          <div className="mx-auto flex max-w-[1320px] items-start justify-between gap-4">
            <div className="flex items-start gap-2.5 text-xs sm:text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-300" />
              <div>
                <div className="font-display font-bold">
                  {alertBanner.title}
                  <span className="ml-2 font-mono text-xs font-normal opacity-80">
                    {alertBanner.timestamp}
                    {alertBanner.nativeDispatched ? ' · Sent via Browser Notification' : ''}
                  </span>
                </div>
                <p className="mt-0.5 text-xs opacity-90">{alertBanner.body}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onDismissAlertBanner}
              aria-label="Dismiss AQI alert"
              className="shrink-0 rounded p-1 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
