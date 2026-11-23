import 'dotenv/config';
import express from 'express';
import {
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type GenerateContentParameters,
  type GenerateContentResponse,
} from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  AqiSeverityTier,
  AqiThemeMode,
  AreaAqiStation,
  AssistantPlanResponse,
  CityAqiReading,
  HourlyAqiPoint,
  LocationDetail,
} from './src/types/aqi.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

interface CitySeed {
  id: string;
  name: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  isMainCity: boolean;
}

const INDIAN_CITIES: CitySeed[] = [
  { id: 'delhi', name: 'Delhi', country: 'India', region: 'NCR · North', lat: 28.6139, lon: 77.209, isMainCity: true },
  { id: 'mumbai', name: 'Mumbai', country: 'India', region: 'Maharashtra · West', lat: 19.076, lon: 72.8777, isMainCity: true },
  { id: 'bengaluru', name: 'Bengaluru', country: 'India', region: 'Karnataka · South', lat: 12.9716, lon: 77.5946, isMainCity: true },
  { id: 'hyderabad', name: 'Hyderabad', country: 'India', region: 'Telangana · South', lat: 17.385, lon: 78.4867, isMainCity: true },
  { id: 'chennai', name: 'Chennai', country: 'India', region: 'Tamil Nadu · South', lat: 13.0827, lon: 80.2707, isMainCity: true },
  { id: 'kolkata', name: 'Kolkata', country: 'India', region: 'West Bengal · East', lat: 22.5726, lon: 88.3639, isMainCity: true },
  { id: 'pune', name: 'Pune', country: 'India', region: 'Maharashtra · West', lat: 18.5204, lon: 73.8567, isMainCity: true },
  { id: 'ahmedabad', name: 'Ahmedabad', country: 'India', region: 'Gujarat · West', lat: 23.0225, lon: 72.5714, isMainCity: true },
  { id: 'kochi', name: 'Kochi', country: 'India', region: 'Kerala · South', lat: 9.9312, lon: 76.2673, isMainCity: true },
  { id: 'gurugram', name: 'Gurugram', country: 'India', region: 'Haryana · NCR', lat: 28.4595, lon: 77.0266, isMainCity: false },
  { id: 'noida', name: 'Noida', country: 'India', region: 'Uttar Pradesh · NCR', lat: 28.5355, lon: 77.391, isMainCity: false },
  { id: 'lucknow', name: 'Lucknow', country: 'India', region: 'Uttar Pradesh · North', lat: 26.8467, lon: 80.9462, isMainCity: false },
  { id: 'patna', name: 'Patna', country: 'India', region: 'Bihar · East', lat: 25.5941, lon: 85.1376, isMainCity: false },
  { id: 'jaipur', name: 'Jaipur', country: 'India', region: 'Rajasthan · North', lat: 26.9124, lon: 75.7873, isMainCity: false },
  { id: 'chandigarh', name: 'Chandigarh', country: 'India', region: 'North India', lat: 30.7333, lon: 76.7794, isMainCity: false },
];

interface AreaPreset {
  areaName: string;
  zoneLabel: string;
  dLat: number;
  dLon: number;
}

const CITY_AREA_PRESETS: Record<string, AreaPreset[]> = {
  delhi: [
    { areaName: 'Connaught Place', zoneLabel: 'Central Delhi', dLat: 0.015, dLon: 0.01 },
    { areaName: 'Anand Vihar', zoneLabel: 'East Transit Hub', dLat: 0.032, dLon: 0.106 },
    { areaName: 'Rohini Sector 16', zoneLabel: 'North-West', dLat: 0.124, dLon: -0.095 },
    { areaName: 'Dwarka Sector 8', zoneLabel: 'South-West', dLat: -0.048, dLon: -0.145 },
    { areaName: 'Okhla Phase II', zoneLabel: 'South-East Industrial', dLat: -0.075, dLon: 0.062 },
    { areaName: 'Punjabi Bagh', zoneLabel: 'West Delhi', dLat: 0.056, dLon: -0.078 },
    { areaName: 'RK Puram', zoneLabel: 'South Delhi', dLat: -0.048, dLon: -0.032 },
    { areaName: 'Civil Lines', zoneLabel: 'North Delhi', dLat: 0.066, dLon: 0.016 },
    { areaName: 'IGI Terminal 3', zoneLabel: 'Airport Corridor', dLat: -0.057, dLon: -0.111 },
  ],
  mumbai: [
    { areaName: 'Colaba', zoneLabel: 'South Peninsula', dLat: -0.16, dLon: -0.05 },
    { areaName: 'Bandra Kurla Complex', zoneLabel: 'Central Business', dLat: -0.01, dLon: -0.01 },
    { areaName: 'Andheri West', zoneLabel: 'Western Suburbs', dLat: 0.058, dLon: -0.044 },
    { areaName: 'Powai', zoneLabel: 'Lake & East Hills', dLat: 0.042, dLon: 0.028 },
    { areaName: 'Chembur', zoneLabel: 'Eastern Refinery Belt', dLat: -0.018, dLon: 0.022 },
    { areaName: 'Borivali East', zoneLabel: 'North National Park', dLat: 0.154, dLon: -0.016 },
    { areaName: 'Worli Sea Face', zoneLabel: 'Coastal West', dLat: -0.074, dLon: -0.062 },
    { areaName: 'Mulund West', zoneLabel: 'North-East Suburb', dLat: 0.096, dLon: 0.078 },
    { areaName: 'Navi Mumbai Vashi', zoneLabel: 'Trans-Harbour', dLat: 0.002, dLon: 0.118 },
  ],
  bengaluru: [
    { areaName: 'MG Road', zoneLabel: 'Central Core', dLat: 0.004, dLon: 0.012 },
    { areaName: 'Whitefield', zoneLabel: 'East IT Corridor', dLat: -0.002, dLon: 0.155 },
    { areaName: 'Electronic City', zoneLabel: 'South Highway', dLat: -0.128, dLon: 0.072 },
    { areaName: 'Hebbal', zoneLabel: 'North Flyover', dLat: 0.064, dLon: -0.002 },
    { areaName: 'Peenya Industrial', zoneLabel: 'North-West', dLat: 0.058, dLon: -0.078 },
    { areaName: 'Jayanagar', zoneLabel: 'South Residential', dLat: -0.044, dLon: -0.012 },
    { areaName: 'Koramangala', zoneLabel: 'South-East', dLat: -0.036, dLon: 0.032 },
    { areaName: 'Yelahanka', zoneLabel: 'Outer North', dLat: 0.128, dLon: 0.002 },
    { areaName: 'Kengeri', zoneLabel: 'South-West', dLat: -0.064, dLon: -0.11 },
  ],
  kochi: [
    { areaName: 'Fort Kochi', zoneLabel: 'Coastal Heritage', dLat: 0.034, dLon: -0.026 },
    { areaName: 'Marine Drive', zoneLabel: 'Ernakulam Core', dLat: 0.044, dLon: 0.006 },
    { areaName: 'Kakkanad Infopark', zoneLabel: 'East Tech Hub', dLat: 0.078, dLon: 0.088 },
    { areaName: 'Edappally', zoneLabel: 'North Junction', dLat: 0.094, dLon: 0.041 },
    { areaName: 'Vyttila Mobility Hub', zoneLabel: 'Central Transit', dLat: 0.036, dLon: 0.052 },
    { areaName: 'Eloor Industrial', zoneLabel: 'North River Belt', dLat: 0.144, dLon: 0.025 },
    { areaName: 'Aluva', zoneLabel: 'Periyar Basin', dLat: 0.175, dLon: 0.084 },
    { areaName: 'Tripunithura', zoneLabel: 'South-East', dLat: 0.014, dLon: 0.081 },
    { areaName: 'Willingdon Island', zoneLabel: 'Port Harbour', dLat: 0.024, dLon: 0.004 },
  ],
};

function getGenericAreaPresets(cityName: string): AreaPreset[] {
  return [
    { areaName: `${cityName} Central`, zoneLabel: 'City Core', dLat: 0, dLon: 0 },
    { areaName: `${cityName} North`, zoneLabel: 'Northern Sector', dLat: 0.065, dLon: 0 },
    { areaName: `${cityName} North-East`, zoneLabel: 'NE Corridor', dLat: 0.05, dLon: 0.055 },
    { areaName: `${cityName} East`, zoneLabel: 'Eastern Zone', dLat: 0, dLon: 0.07 },
    { areaName: `${cityName} South-East`, zoneLabel: 'SE Industrial', dLat: -0.05, dLon: 0.055 },
    { areaName: `${cityName} South`, zoneLabel: 'Southern Sector', dLat: -0.065, dLon: 0 },
    { areaName: `${cityName} South-West`, zoneLabel: 'SW Residential', dLat: -0.05, dLon: -0.055 },
    { areaName: `${cityName} West`, zoneLabel: 'Western Zone', dLat: 0, dLon: -0.07 },
    { areaName: `${cityName} North-West`, zoneLabel: 'NW Transit', dLat: 0.05, dLon: -0.055 },
  ];
}

// Official Indian CPCB NAQI linear sub-index calculation
function calcSubIndex(
  conc: number,
  breakpoints: Array<[number, number, number, number]>,
): number {
  if (!Number.isFinite(conc) || conc <= 0) return 0;
  for (const [bLow, bHigh, iLow, iHigh] of breakpoints) {
    if (conc <= bHigh) {
      return Math.round(((iHigh - iLow) / (bHigh - bLow)) * (conc - bLow) + iLow);
    }
  }
  return 500;
}

const PM25_BP: Array<[number, number, number, number]> = [
  [0, 30, 0, 50],
  [30, 60, 51, 100],
  [60, 90, 101, 200],
  [90, 120, 201, 300],
  [120, 250, 301, 400],
  [250, 500, 401, 500],
];

const PM10_BP: Array<[number, number, number, number]> = [
  [0, 50, 0, 50],
  [50, 100, 51, 100],
  [100, 250, 101, 200],
  [250, 350, 201, 300],
  [350, 430, 301, 400],
  [430, 600, 401, 500],
];

const NO2_BP: Array<[number, number, number, number]> = [
  [0, 40, 0, 50],
  [40, 80, 51, 100],
  [80, 180, 101, 200],
  [180, 280, 201, 300],
  [280, 400, 301, 400],
  [400, 800, 401, 500],
];

const O3_BP: Array<[number, number, number, number]> = [
  [0, 50, 0, 50],
  [50, 100, 51, 100],
  [100, 168, 101, 200],
  [168, 208, 201, 300],
  [208, 748, 301, 400],
  [748, 1000, 401, 500],
];

function computeIndiaNaqi(pm25: number, pm10: number, no2: number, o3: number): number {
  const s1 = calcSubIndex(pm25, PM25_BP);
  const s2 = calcSubIndex(pm10, PM10_BP);
  const s3 = calcSubIndex(no2, NO2_BP);
  const s4 = calcSubIndex(o3, O3_BP);
  return Math.max(s1, s2, s3, s4);
}

function classifyNaqi(naqi: number): {
  tier: AqiSeverityTier;
  theme: AqiThemeMode;
  isDangerous: boolean;
} {
  if (naqi <= 50) {
    return { tier: 'Good', theme: 'good', isDangerous: false };
  }
  if (naqi <= 100) {
    return { tier: 'Satisfactory', theme: 'good', isDangerous: false };
  }
  if (naqi <= 200) {
    return { tier: 'Moderate', theme: 'moderate', isDangerous: false };
  }
  if (naqi <= 300) {
    return { tier: 'Poor', theme: 'high', isDangerous: true };
  }
  if (naqi <= 400) {
    return { tier: 'Very Poor', theme: 'high', isDangerous: true };
  }
  return { tier: 'Severe', theme: 'high', isDangerous: true };
}

function getDominantPollutant(pm25: number, pm10: number, no2: number, o3: number): string {
  const ratios = [
    { name: 'PM2.5', ratio: pm25 / 30 },
    { name: 'PM10', ratio: pm10 / 50 },
    { name: 'NO₂', ratio: no2 / 40 },
    { name: 'O₃', ratio: o3 / 50 },
  ];
  ratios.sort((a, b) => b.ratio - a.ratio);
  return ratios[0].name;
}

function buildCityReading(seed: CitySeed, current: Record<string, unknown>): CityAqiReading {
  const usAqi = Math.max(0, Math.round(Number(current.us_aqi ?? 0)));
  const pm25 = Number(Number(current.pm2_5 ?? 0).toFixed(1));
  const pm10 = Number(Number(current.pm10 ?? 0).toFixed(1));
  const no2 = Number(Number(current.nitrogen_dioxide ?? 0).toFixed(1));
  const o3 = Number(Number(current.ozone ?? 0).toFixed(1));
  const co = Number(Number(current.carbon_monoxide ?? 0).toFixed(1));
  const so2 = Number(Number(current.sulphur_dioxide ?? 0).toFixed(1));
  const naqi = computeIndiaNaqi(pm25, pm10, no2, o3);
  const { tier, theme, isDangerous } = classifyNaqi(naqi);

  return {
    ...seed,
    aqi: naqi,
    usAqi,
    pm25,
    pm10,
    no2,
    o3,
    co,
    so2,
    tier,
    theme,
    isDangerous,
    dominantPollutant: getDominantPollutant(pm25, pm10, no2, o3),
    updatedAt: String(current.time ?? new Date().toISOString()),
  };
}

interface CitiesCache {
  expiresAt: number;
  cities: CityAqiReading[];
}

let citiesCache: CitiesCache | null = null;

async function fetchIndianCities(): Promise<CityAqiReading[]> {
  if (citiesCache && Date.now() < citiesCache.expiresAt) {
    return citiesCache.cities;
  }

  const lats = INDIAN_CITIES.map((c) => c.lat).join(',');
  const lons = INDIAN_CITIES.map((c) => c.lon).join(',');
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide&timezone=Asia/Kolkata`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo Air Quality API returned status ${response.status}`);
  }
  const payload = (await response.json()) as unknown;
  const items = Array.isArray(payload) ? payload : [payload];

  const readings: CityAqiReading[] = INDIAN_CITIES.map((seed, index) => {
    const entry = (items[index] ?? {}) as { current?: Record<string, unknown> };
    return buildCityReading(seed, entry.current ?? {});
  });

  readings.sort((a, b) => b.aqi - a.aqi);

  citiesCache = {
    expiresAt: Date.now() + 5 * 60 * 1000,
    cities: readings,
  };

  return readings;
}

function formatHourLabel(isoTime: string): string {
  const parts = isoTime.split('T');
  if (parts.length < 2) return isoTime;
  return parts[1].slice(0, 5);
}

function computeWindows(hourly: HourlyAqiPoint[]): {
  bestVentilationWindow: string;
  peakSmogWindow: string;
} {
  if (hourly.length === 0) {
    return {
      bestVentilationWindow: '13:00 – 16:00',
      peakSmogWindow: '06:00 – 09:00',
    };
  }

  let minPoint = hourly[0];
  let maxPoint = hourly[0];
  for (const pt of hourly) {
    if (pt.aqi < minPoint.aqi) minPoint = pt;
    if (pt.aqi > maxPoint.aqi) maxPoint = pt;
  }

  return {
    bestVentilationWindow: `${minPoint.hourLabel} (NAQI ~${minPoint.aqi})`,
    peakSmogWindow: `${maxPoint.hourLabel} (NAQI ~${maxPoint.aqi})`,
  };
}

async function reverseGeocodeName(lat: number, lon: number): Promise<{ name: string; country: string; region: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Vayumitra-AirQualityAssistant/1.0',
      },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        address?: {
          city?: string;
          town?: string;
          village?: string;
          state_district?: string;
          state?: string;
          country?: string;
        };
      };
      const addr = data.address ?? {};
      const city = addr.city || addr.town || addr.village || addr.state_district || addr.state;
      if (city) {
        return {
          name: city,
          country: addr.country ?? 'India',
          region: addr.state ?? 'India',
        };
      }
    }
  } catch {
    // Fall back cleanly to coordinate label
  }
  return {
    name: `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
    country: 'India',
    region: 'Local Sensor Grid',
  };
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ParsedGeminiError {
  statusCode: number;
  userMessage: string;
  isTransient: boolean;
}

function parseGeminiError(error: unknown): ParsedGeminiError {
  const rawMessage = error instanceof Error ? error.message : String(error ?? 'Unknown AI error');
  let code =
    typeof (error as { status?: unknown })?.status === 'number'
      ? (error as { status: number }).status
      : 0;
  let apiStatus = '';
  let innerMessage = rawMessage;

  const trimmed = rawMessage.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        error?: { code?: number; message?: string; status?: string };
      };
      if (parsed.error) {
        if (typeof parsed.error.code === 'number') code = parsed.error.code;
        if (typeof parsed.error.status === 'string') apiStatus = parsed.error.status;
        if (typeof parsed.error.message === 'string') innerMessage = parsed.error.message;
      }
    } catch {
      // Keep rawMessage if not valid JSON
    }
  }

  if (/GEMINI_API_KEY is not configured/i.test(rawMessage)) {
    return {
      statusCode: 503,
      userMessage: 'Gemini API key is not configured yet. Please add GEMINI_API_KEY in Settings > Secrets.',
      isTransient: false,
    };
  }

  if (
    code === 403 ||
    apiStatus === 'PERMISSION_DENIED' ||
    /API_KEY_INVALID|PERMISSION_DENIED|API key not valid/i.test(rawMessage)
  ) {
    return {
      statusCode: 403,
      userMessage:
        'Gemini API access was denied for the configured key. Please verify your API key in Settings > Secrets.',
      isTransient: false,
    };
  }

  if (code === 404 || apiStatus === 'NOT_FOUND') {
    return {
      statusCode: 404,
      userMessage: 'The requested Gemini model endpoint was not found. Please retry shortly.',
      isTransient: false,
    };
  }

  if (code === 429 || apiStatus === 'RESOURCE_EXHAUSTED') {
    return {
      statusCode: 429,
      userMessage:
        'Gemini API rate limit reached for this minute. Please wait a few seconds and click Retry.',
      isTransient: true,
    };
  }

  if (
    code === 503 ||
    code === 502 ||
    code === 504 ||
    apiStatus === 'UNAVAILABLE' ||
    /high demand|unavailable|overloaded|temporarily|timed out|ECONNRESET|ETIMEDOUT|fetch failed/i.test(
      rawMessage,
    )
  ) {
    return {
      statusCode: 503,
      userMessage:
        'Vayumitra AI is experiencing temporary high demand across Gemini servers. Please wait a moment and click Retry.',
      isTransient: true,
    };
  }

  if (code === 400 || apiStatus === 'INVALID_ARGUMENT') {
    return {
      statusCode: 400,
      userMessage: innerMessage || 'Invalid request sent to Gemini API.',
      isTransient: false,
    };
  }

  return {
    statusCode: code >= 400 && code < 600 ? code : 502,
    userMessage: innerMessage || 'Vayumitra AI service could not respond right now. Please retry.',
    isTransient: false,
  };
}

async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: Omit<GenerateContentParameters, 'model'>,
): Promise<GenerateContentResponse> {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent({
        ...params,
        model: 'gemini-4-hydrogen',
        config: {
          ...params.config,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
    } catch (error) {
      lastError = error;
      const parsed = parseGeminiError(error);
      if (!parsed.isTransient) {
        throw error;
      }
      if (attempt < maxAttempts - 1) {
        const delayMs = 800 * Math.pow(2, attempt) + Math.floor(Math.random() * 250);
        await sleep(delayMs);
      }
    }
  }

  // Fallback to active fast flash-lite model on transient primary overload/demand spikes
  try {
    return await ai.models.generateContent({
      ...params,
      model: 'gemini-3.1-flash-lite',
    });
  } catch (fallbackError) {
    throw fallbackError ?? lastError;
  }
}

function getMapsApiKey(): string {
  return process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'vayumitra-india' });
  });

  app.get('/api/maps/config', (_req, res) => {
    res.json({ apiKey: getMapsApiKey() });
  });

  app.get('/api/maps/aq-tile/:mapType/:z/:x/:y', async (req, res) => {
    const apiKey = getMapsApiKey();
    if (!apiKey) {
      res.status(503).json({ error: 'Google Maps API key not configured' });
      return;
    }

    const { mapType, z, x, y } = req.params;
    const allowedTypes = new Set([
      'IND_CPCB',
      'US_AQI',
      'UAQI_RED_GREEN',
      'PM25_INDIGO_PERSIAN',
    ]);
    if (!allowedTypes.has(mapType)) {
      res.status(400).json({ error: 'Unsupported air quality map type' });
      return;
    }

    const zoom = Number(z);
    const tx = Number(x);
    const ty = Number(y);
    if (!Number.isInteger(zoom) || zoom < 0 || zoom > 16 || !Number.isInteger(tx) || !Number.isInteger(ty)) {
      res.status(400).json({ error: 'Invalid tile coordinates' });
      return;
    }

    try {
      const tileUrl = `https://airquality.googleapis.com/v1/mapTypes/${encodeURIComponent(
        mapType,
      )}/heatmapTiles/${zoom}/${tx}/${ty}?key=${encodeURIComponent(apiKey)}`;

      const upstream = await fetch(tileUrl, {
        headers: {
          'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
        },
      });

      if (upstream.status === 429) {
        res.status(429).json({ error: 'RESOURCE_EXHAUSTED' });
        return;
      }

      if (!upstream.ok) {
        res.status(upstream.status).end();
        return;
      }

      const contentType = upstream.headers.get('content-type') || 'image/png';
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=900');
      res.send(buf);
    } catch {
      res.status(502).end();
    }
  });

  app.get('/api/aqi/cities', async (_req, res) => {
    try {
      const cities = await fetchIndianCities();
      res.json({
        cities,
        dangerousCount: cities.filter((c) => c.isDangerous).length,
        fetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load Indian city AQI data';
      res.status(502).json({ error: message });
    }
  });

  app.get('/api/aqi/areas', async (req, res) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    const cityId = String(req.query.cityId ?? '').toLowerCase();
    const cityName = String(req.query.name ?? 'Selected City').trim();

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      res.status(400).json({ error: 'Valid lat and lon parameters are required.' });
      return;
    }

    const presets = CITY_AREA_PRESETS[cityId] ?? getGenericAreaPresets(cityName);
    const coords = presets.map((p) => ({
      ...p,
      lat: Number((lat + p.dLat).toFixed(4)),
      lon: Number((lon + p.dLon).toFixed(4)),
    }));

    try {
      const lats = coords.map((c) => c.lat).join(',');
      const lons = coords.map((c) => c.lon).join(',');
      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=pm2_5,pm10,nitrogen_dioxide,ozone&timezone=Asia/Kolkata`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Open-Meteo Area API returned ${response.status}`);
      }
      const payload = (await response.json()) as unknown;
      const items = Array.isArray(payload) ? payload : [payload];

      const areas: AreaAqiStation[] = coords.map((c, idx) => {
        const current = ((items[idx] ?? {}) as { current?: Record<string, unknown> }).current ?? {};
        const pm25 = Number(Number(current.pm2_5 ?? 0).toFixed(1));
        const pm10 = Number(Number(current.pm10 ?? 0).toFixed(1));
        const no2 = Number(Number(current.nitrogen_dioxide ?? 0).toFixed(1));
        const o3 = Number(Number(current.ozone ?? 0).toFixed(1));
        const naqi = computeIndiaNaqi(pm25, pm10, no2, o3);
        const { tier, theme } = classifyNaqi(naqi);

        return {
          id: `area-${cityId || 'custom'}-${idx}`,
          areaName: c.areaName,
          zoneLabel: c.zoneLabel,
          lat: c.lat,
          lon: c.lon,
          aqi: naqi,
          pm25,
          pm10,
          no2,
          tier,
          theme,
          dominantPollutant: getDominantPollutant(pm25, pm10, no2, o3),
        };
      });

      areas.sort((a, b) => b.aqi - a.aqi);
      res.json({ areas });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load area-wise air quality';
      res.status(502).json({ error: message });
    }
  });

  app.get('/api/cities/search', async (req, res) => {
    const query = String(req.query.q ?? '').trim();
    if (query.length < 2) {
      res.json({ results: [] });
      return;
    }

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json&countryCode=IN`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Geocoding service returned ${response.status}`);
      }
      const data = (await response.json()) as {
        results?: Array<{
          id: number;
          name: string;
          country?: string;
          country_code?: string;
          admin1?: string;
          latitude: number;
          longitude: number;
        }>;
      };
      const results = (data.results ?? [])
        .filter((item) => !item.country_code || item.country_code === 'IN')
        .slice(0, 6)
        .map((item) => ({
          id: `geo-${item.id}`,
          name: item.name,
          country: item.country ?? 'India',
          admin1: item.admin1,
          lat: item.latitude,
          lon: item.longitude,
        }));
      res.json({ results });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Indian city search failed';
      res.status(502).json({ error: message });
    }
  });

  app.get('/api/aqi/location', async (req, res) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      res.status(400).json({ error: 'Valid numeric lat and lon parameters are required.' });
      return;
    }

    let name = String(req.query.name ?? '').trim();
    let country = String(req.query.country ?? '').trim();
    let region = String(req.query.region ?? '').trim();

    if (!name) {
      const resolved = await reverseGeocodeName(lat, lon);
      name = resolved.name;
      country = country || resolved.country;
      region = region || resolved.region;
    }

    try {
      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide&hourly=pm2_5,pm10,nitrogen_dioxide,ozone&forecast_days=1&timezone=Asia/Kolkata`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Air quality service returned ${response.status}`);
      }
      const data = (await response.json()) as {
        current?: Record<string, unknown>;
        hourly?: {
          time?: string[];
          pm2_5?: Array<number | null>;
          pm10?: Array<number | null>;
          nitrogen_dioxide?: Array<number | null>;
          ozone?: Array<number | null>;
        };
      };

      const times = data.hourly?.time ?? [];
      const pm25s = data.hourly?.pm2_5 ?? [];
      const pm10s = data.hourly?.pm10 ?? [];
      const no2s = data.hourly?.nitrogen_dioxide ?? [];
      const o3s = data.hourly?.ozone ?? [];

      const hourly: HourlyAqiPoint[] = times.map((time, idx) => {
        const pm25 = Number(Number(pm25s[idx] ?? 0).toFixed(1));
        const pm10 = Number(Number(pm10s[idx] ?? 0).toFixed(1));
        const no2 = Number(Number(no2s[idx] ?? 0).toFixed(1));
        const o3 = Number(Number(o3s[idx] ?? 0).toFixed(1));
        return {
          time,
          hourLabel: formatHourLabel(time),
          aqi: computeIndiaNaqi(pm25, pm10, no2, o3),
          pm25,
        };
      });

      const seed: CitySeed = {
        id: String(req.query.id ?? `loc-${lat.toFixed(2)}-${lon.toFixed(2)}`),
        name,
        country: country || 'India',
        region: region || 'India',
        lat,
        lon,
        isMainCity: Boolean(req.query.isMainCity === 'true'),
      };

      const base = buildCityReading(seed, data.current ?? {});
      const windows = computeWindows(hourly);

      const detail: LocationDetail = {
        ...base,
        hourly,
        ...windows,
      };

      res.json({ location: detail });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch location telemetry';
      res.status(502).json({ error: message });
    }
  });

  app.post('/api/assistant/plan', async (req, res) => {
    try {
      const { location, profile } = req.body as {
        location?: LocationDetail;
        profile?: {
          householdType?: string;
          commuteMode?: string;
          homeSetup?: string;
          primaryGoal?: string;
        };
      };

      if (!location || typeof location.aqi !== 'number') {
        res.status(400).json({ error: 'Location AQI telemetry is required.' });
        return;
      }

      const ai = getGeminiClient();

      const prompt = `
Generate a hyper-practical, Indian-city-tailored Vayumitra action plan for this household based on real-time Indian NAQI data:

LOCATION TELEMETRY:
- City: ${location.name}, ${location.region}, India
- Live Indian NAQI: ${location.aqi} (${location.tier})
- PM2.5: ${location.pm25} µg/m³ | PM10: ${location.pm10} µg/m³ | NO2: ${location.no2} µg/m³ | O3: ${location.o3} µg/m³
- Dominant Pollutant: ${location.dominantPollutant}
- Best Ventilation Window Today: ${location.bestVentilationWindow}
- Peak Smog Window Today: ${location.peakSmogWindow}

HOUSEHOLD & LIFESTYLE PROFILE:
- Household Composition: ${profile?.householdType ?? 'Family with young children'}
- Primary Commute: ${profile?.commuteMode ?? 'Metro / city bus transit'}
- Home Ventilation & Cooking: ${profile?.homeSetup ?? 'Cross-ventilation windows & LPG gas stove'}
- Priority Goal: ${profile?.primaryGoal ?? 'Protect family health & cut daily emissions'}

INSTRUCTIONS:
1. Tailor advice specifically to Indian urban living (winter boundary-layer inversions, morning school commutes, Metro/bus/auto-rickshaw/EV choices, wet mopping dust suppression, kitchen exhaust/tadka aerosol control, sealing balcony door gaps, N95/FFP2 masking, avoiding waste/leaf burning).
2. If NAQI is Good/Satisfactory (0–100), emphasize preserving clean air, safe morning/evening walks, and low-emission transport habits.
3. If NAQI is Poor/Very Poor/Severe (>200), prioritize immediate exposure protection (fitted N95 mask outdoors, HEPA or DIY box-fan filter indoors, avoiding dawn/late-night inversion outdoor exercise, switching short car trips to Metro/carpool).
4. Include realistic quantitative estimates for exposureReductionPct (5 to 45), indoorPmReductionPct (10 to 70), and co2SavedKgPerWeek (1 to 25).
      `.trim();

      const response = await generateContentWithRetry(ai, {
        contents: prompt,
        config: {
          systemInstruction:
            'You are Vayumitra, an Indian Urban Air Quality Assistant helping families and Resident Welfare Associations (RWAs) navigate winter smog and urban air pollution across Indian cities. Provide practical, culturally grounded advice with clear quantitative impact explanations.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              locationBrief: { type: Type.STRING },
              winterSmogDynamics: { type: Type.STRING },
              maskAndOutdoorRule: { type: Type.STRING },
              dailyRoutines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    timeWindow: { type: Type.STRING },
                    title: { type: Type.STRING },
                    action: { type: Type.STRING },
                    whyItMatters: { type: Type.STRING },
                    exposureReductionPct: { type: Type.NUMBER },
                    co2SavedKgPerWeek: { type: Type.NUMBER },
                  },
                  required: ['id', 'timeWindow', 'title', 'action', 'whyItMatters', 'exposureReductionPct', 'co2SavedKgPerWeek'],
                },
              },
              indoorHacks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    title: { type: Type.STRING },
                    costTier: { type: Type.STRING },
                    steps: { type: Type.STRING },
                    indoorPmReductionPct: { type: Type.NUMBER },
                    directImpact: { type: Type.STRING },
                  },
                  required: ['id', 'title', 'costTier', 'steps', 'indoorPmReductionPct', 'directImpact'],
                },
              },
              sustainableAlternatives: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    category: { type: Type.STRING },
                    replaces: { type: Type.STRING },
                    alternative: { type: Type.STRING },
                    directHealthImpact: { type: Type.STRING },
                    communityEmissionImpact: { type: Type.STRING },
                    co2SavedKgPerWeek: { type: Type.NUMBER },
                  },
                  required: ['id', 'category', 'replaces', 'alternative', 'directHealthImpact', 'communityEmissionImpact', 'co2SavedKgPerWeek'],
                },
              },
              impactSummary: { type: Type.STRING },
            },
            required: [
              'locationBrief',
              'winterSmogDynamics',
              'maskAndOutdoorRule',
              'dailyRoutines',
              'indoorHacks',
              'sustainableAlternatives',
              'impactSummary',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as Omit<AssistantPlanResponse, 'city' | 'aqi'>;
      const plan: AssistantPlanResponse = {
        city: location.name,
        aqi: location.aqi,
        ...parsed,
      };

      res.json({ plan });
    } catch (error) {
      const parsed = parseGeminiError(error);
      console.error('Vayumitra plan error:', error);
      res.status(parsed.statusCode).json({ error: parsed.userMessage });
    }
  });

  app.post('/api/assistant/chat', async (req, res) => {
    try {
      const { question, location, profile, history } = req.body as {
        question?: string;
        location?: LocationDetail;
        profile?: {
          householdType?: string;
          commuteMode?: string;
          homeSetup?: string;
        };
        history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      };

      if (!question || !question.trim()) {
        res.status(400).json({ error: 'A question is required.' });
        return;
      }

      const ai = getGeminiClient();

      const contextBlock = location
        ? `Active Indian City: ${location.name}, ${location.region} | Indian NAQI: ${location.aqi} (${location.tier}) | PM2.5: ${location.pm25} µg/m³ | PM10: ${location.pm10} µg/m³ | NO2: ${location.no2} µg/m³ | Best Ventilation Window: ${location.bestVentilationWindow} | Peak Smog Window: ${location.peakSmogWindow}.`
        : 'No active city selected.';

      const recentHistory = (history ?? [])
        .slice(-4)
        .map((m) => `${m.role === 'user' ? 'Family' : 'Vayumitra'}: ${m.content}`)
        .join('\n');

      const prompt = `
${contextBlock}
Household Profile: ${profile?.householdType ?? 'Indian family'}, Commute: ${profile?.commuteMode ?? 'Mixed'}, Home Setup: ${profile?.homeSetup ?? 'Apartment'}.

${recentHistory ? `Recent Conversation:\n${recentHistory}\n\n` : ''}Family Question: ${question.trim()}
      `.trim();

      const response = await generateContentWithRetry(ai, {
        contents: prompt,
        config: {
          systemInstruction:
            'You are Vayumitra, an Indian Urban Air Quality Assistant helping families navigate winter smog and urban air pollution across India. Answer concisely (under 180 words) with actionable steps tailored to Indian homes/commutes and a clear sentence explaining the direct health or emissions impact of the recommended choice.',
        },
      });

      res.json({ answer: (response.text ?? '').trim() });
    } catch (error) {
      const parsed = parseGeminiError(error);
      console.error('Vayumitra chat error:', error);
      res.status(parsed.statusCode).json({ error: parsed.userMessage });
    }
  });

  if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vayumitra India server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
