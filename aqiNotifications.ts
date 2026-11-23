import type { AqiSeverityTier } from '../types/aqi';

const TIER_ORDER: Record<AqiSeverityTier, number> = {
  Good: 0,
  Satisfactory: 1,
  Moderate: 2,
  Poor: 3,
  'Very Poor': 4,
  Severe: 5,
};

export function getAqiSeverityRank(tier: AqiSeverityTier): number {
  return TIER_ORDER[tier] ?? 0;
}

export function didAqiCategoryWorsen(
  previousTier: AqiSeverityTier,
  nextTier: AqiSeverityTier,
): boolean {
  return getAqiSeverityRank(nextTier) > getAqiSeverityRank(previousTier);
}

export function getNextWorseTier(tier: AqiSeverityTier): AqiSeverityTier {
  const ordered: AqiSeverityTier[] = [
    'Good',
    'Satisfactory',
    'Moderate',
    'Poor',
    'Very Poor',
    'Severe',
  ];
  const idx = ordered.indexOf(tier);
  return ordered[Math.min(ordered.length - 1, idx + 1)];
}

export type BrowserNotificationPermission = NotificationPermission | 'unsupported';

export function getNotificationPermissionState(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestAqiNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function sendAqiWorseningNotification(params: {
  cityName: string;
  previousTier: AqiSeverityTier;
  nextTier: AqiSeverityTier;
  aqi: number;
  pm25: number;
  isTest?: boolean;
}): { dispatched: boolean; title: string; body: string } {
  const { cityName, previousTier, nextTier, aqi, pm25, isTest } = params;
  const prefix = isTest ? '[Test] ' : '';
  const title = `${prefix}Vayumitra Alert: ${cityName} NAQI worsened to ${nextTier}`;
  const body = `Air quality shifted from ${previousTier} to ${nextTier} (NAQI ${aqi}, PM2.5 ${pm25} µg/m³). Close windows, enable indoor filtration, and wear an N95 mask outdoors.`;

  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(title, {
        body,
        tag: `vayumitra-aqi-${cityName.toLowerCase().replace(/\s+/g, '-')}`,
      });
      return { dispatched: true, title, body };
    } catch {
      return { dispatched: false, title, body };
    }
  }

  return { dispatched: false, title, body };
}
