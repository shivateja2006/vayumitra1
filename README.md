# Urban Air Quality Assistant

An AI-powered assistant that helps families and communities navigate severe winter smog with live AQI telemetry, low-emission daily routines, indoor air quality hacks, and structured GenAI guidance.

## Key Features

- **Live AQI Telemetry**: Fetches real-time US AQI, PM2.5, and PM10 data with source and timestamp provenance, plus manual AQI entry and winter smog preset fallbacks.
- **Household Vulnerability & Context Profiler**: Tailors guidance based on location/AQI, sensitive groups (children, seniors, respiratory/asthma conditions), commute modes, cooking fuel, and indoor air setup.
- **Low-Emission Daily Routines**: Suggests practical schedule shifts, cleaner travel choices, and sustainable swaps along with the reasoning behind each recommendation.
- **Indoor Air Quality Hacks & Ventilation Windows**: Highlights safer indoor air habits and identifies lower-PM2.5 windows to avoid peak inversion smog.
- **Community Advisory Cards**: Generates shareable, printable, or exportable guidance for households, RWAs, and local groups.

## High-Level Architecture

1. **Telemetry Layer**: Pulls current air quality readings and timestamps (e.g., via Open-Meteo Geocoding & Air Quality APIs) with graceful fallback presets when offline or rate-limited.
2. **Input & Household Context Layer**: Collects household parameters and sanitizes user text against prompt injection and control characters.
3. **GenAI Guidance & Schema Layer**: Uses structured JSON output (`responseMimeType: "application/json"`) and runtime schema validation to return categorized routines, indoor air hacks, sustainable swaps, and community advisories.

## Project Structure

```text
urban-air-quality-assistant/
├── src/
│   ├── telemetry/        # AQI API clients, caching, and smog presets
│   ├── profiler/         # Household & vulnerability input handling
│   ├── ai/               # Prompt templates, sanitization, and JSON schema validation
│   ├── components/       # UI views, routine cards, and community advisory export
│   └── App.tsx
├── .env.example
├── package.json
└── README.md
```

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd urban-air-quality-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Add your GenAI API key (and any optional geocoding/telemetry keys) to `.env`.

4. **Run the development server**
   ```bash
   npm run dev
   ```

## Sample JSON Output Schema

```json
{
  "aqiSummary": {
    "usAqi": 340,
    "pm25": 245.0,
    "pm10": 310.0,
    "category": "Hazardous",
    "timestamp": "2026-11-24T00:00:00Z"
  },
  "lowEmissionRoutines": [],
  "indoorAirHacks": [],
  "sustainableSwaps": [],
  "communityAdvisory": ""
}
```

## Disclaimer

Air quality guidance is for informational purposes only and is not a substitute for medical advice. Consult a qualified healthcare provider for respiratory symptoms or emergency care.
