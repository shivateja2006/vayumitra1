export type AqiThemeMode = 'good' | 'moderate' | 'high';

export type ThemePreference = 'auto' | 'light' | 'dark';

export type AqiSeverityTier =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe';

export interface CityAqiReading {
  id: string;
  name: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  aqi: number;
  usAqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  co: number;
  so2: number;
  tier: AqiSeverityTier;
  theme: AqiThemeMode;
  isDangerous: boolean;
  isMainCity: boolean;
  dominantPollutant: string;
  updatedAt: string;
}

export interface HourlyAqiPoint {
  time: string;
  hourLabel: string;
  aqi: number;
  pm25: number;
}

export interface AreaAqiStation {
  id: string;
  areaName: string;
  zoneLabel: string;
  lat: number;
  lon: number;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  tier: AqiSeverityTier;
  theme: AqiThemeMode;
  dominantPollutant: string;
}

export interface LocationDetail extends CityAqiReading {
  hourly: HourlyAqiPoint[];
  bestVentilationWindow: string;
  peakSmogWindow: string;
}

export interface CitySearchResult {
  id: string;
  name: string;
  country: string;
  admin1?: string;
  lat: number;
  lon: number;
}

export interface HouseholdProfile {
  householdType: string;
  commuteMode: string;
  homeSetup: string;
  primaryGoal: string;
}

export interface DailyRoutineItem {
  id: string;
  timeWindow: string;
  title: string;
  action: string;
  whyItMatters: string;
  exposureReductionPct: number;
  co2SavedKgPerWeek: number;
}

export interface IndoorHackItem {
  id: string;
  title: string;
  costTier: 'Zero-cost' | 'Low-cost' | 'Equipment';
  steps: string;
  indoorPmReductionPct: number;
  directImpact: string;
}

export interface SustainableAlternativeItem {
  id: string;
  category: string;
  replaces: string;
  alternative: string;
  directHealthImpact: string;
  communityEmissionImpact: string;
  co2SavedKgPerWeek: number;
}

export interface AssistantPlanResponse {
  city: string;
  aqi: number;
  locationBrief: string;
  winterSmogDynamics: string;
  maskAndOutdoorRule: string;
  dailyRoutines: DailyRoutineItem[];
  indoorHacks: IndoorHackItem[];
  sustainableAlternatives: SustainableAlternativeItem[];
  impactSummary: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
