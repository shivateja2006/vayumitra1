---
name: air-quality-api-web-api
description: Use this skill when the user wants to retrieve air quality data using the Google Maps Platform Air Quality REST API. Apply this skill to fetch current air quality conditions, 4-day forecasts, or 30-day historical data for a specific geographic location, including Air Quality Indexes (AQI), condition descriptions, pollutant concentrations, pollutant sources and effects, and health recommendations, as well as to request air quality heatmap image tiles.
license: Apache-2.0
metadata:
  version: 1.0.55
---

> [!IMPORTANT] **Core Dependency:** This skill requires active context from
> [google-maps-platform/SKILL.md](https://www.gstatic.com/googlemapsplatform-agent-skills/google-maps-platform/SKILL.md).

### Overview

The Google Maps Platform Air Quality API is an HTTP REST service that provides
detailed air quality data for specific geographic coordinates, as well as
color-coded heatmap image tiles for visual overlays. Use this skill to construct
HTTP requests and handle JSON or image responses for air quality monitoring,
historical analysis, and forecasting.

At a high level, the Air Quality API supports four main endpoints:

-   **Current Conditions**: Retrieve real-time Air Quality Indexes (AQI),
    condition descriptions, pollutant concentrations, pollutant sources and
    effects, and health recommendations for a specified location.
-   **Forecasts**: Retrieve up to a 4-day hourly forecast of AQI values, air
    quality descriptions, pollutant details, and health advice for a target
    location.
-   **History**: Query up to 30 days of historical hourly air quality indexes,
    pollutant concentrations, and health recommendations for a given location.
-   **Heatmap Tiles**: Fetch raster image tiles representing air quality
    overlays for specific map tile coordinates and zoom levels.

## Primary Orchestration Integration Workflow

Follow this multi-phase sequential integration checklist to compose features
robustly. For each phase, read the referenced capability sub-workflow file and
satisfy its *Evidence Checkpoint* before advancing.

### Phase 1: Feature Layer & Custom Enrichment (Supplemental)

#### Feature Module: Environment (Optional - Use-Case Dependent)

-   [ ] **Retrieves the current Air Quality Index (AQI) for a specified
    geographic location via the currentConditions:lookup endpoint.** Read
    [references/return-current-air-quality-index-specified-geographic-location.md](https://www.gstatic.com/googlemapsplatform-agent-skills/air-quality-api-web-api/references/return-current-air-quality-index-specified-geographic-location.md).
    *Trigger Condition*: Use when the user wants to fetch the current air
    quality index (universal or local AQI) for a given latitude and longitude.
    *Evidence Checkpoint*: HTTP 200 OK response containing the `indexes` array
    in the JSON payload.
-   [ ] **Retrieves a textual description and category of current air quality
    conditions for a specified geographic location.** Read
    [references/return-description-current-air-quality-conditions-specified-geographic-location.md](https://www.gstatic.com/googlemapsplatform-agent-skills/air-quality-api-web-api/references/return-description-current-air-quality-conditions-specified-geographic-location.md).
    *Dependencies*:
    `["references/return-current-air-quality-index-specified-geographic-location.md"]` \
    *Trigger Condition*: Use when the user needs qualitative descriptions,
    categories, or dominant pollutant summaries for current air quality at a
    location. *Evidence Checkpoint*: HTTP 200 OK response containing air quality
    category descriptions within the `indexes` array in the JSON payload.
-   [ ] **Retrieves a list of current air pollutants and their relative
    concentrations for a specified geographic location using the
    extraComputations parameter.** Read
    [references/return-list-air-pollutants-and-relative-concentrations-currently-affecting-specified-geographic-loca.md](https://www.gstatic.com/googlemapsplatform-agent-skills/air-quality-api-web-api/references/return-list-air-pollutants-and-relative-concentrations-currently-affecting-specified-geographic-loca.md).
    *Dependencies*:
    `["references/return-current-air-quality-index-specified-geographic-location.md"]` \
    *Trigger Condition*: Use when the user wants to see specific pollutant
    concentrations (e.g., PM2.5, PM10, O3, NO2) currently affecting a location.
    *Evidence Checkpoint*: HTTP 200 OK response with `POLLUTANT_CONCENTRATION`
    enabled, returning the `pollutants` array with concentration values in the
    JSON payload.
-   [ ] **Retrieves detailed information about the emission sources and health
    effects of pollutants currently affecting a specified geographic location.**
    Read
    [references/return-details-about-sources-and-effects-air-pollutants-currently-affecting-specified-geographic-loc.md](https://www.gstatic.com/googlemapsplatform-agent-skills/air-quality-api-web-api/references/return-details-about-sources-and-effects-air-pollutants-currently-affecting-specified-geographic-loc.md).
    *Dependencies*:
    `["references/return-current-air-quality-index-specified-geographic-location.md",
    "references/return-list-air-pollutants-and-relative-concentrations-currently-affecting-specified-geographic-loca.md"]` \
    *Trigger Condition*: Use when the user requests information about where
    current pollutants come from and how they affect human health. *Evidence
    Checkpoint*: HTTP 200 OK response with `POLLUTANT_ADDITIONAL_INFO` enabled,
    returning `additionalInfo` (`sources` and `effects`) inside the `pollutants`
    array.
-   [ ] **Retrieves health recommendations for general and sensitive populations
    based on current air quality conditions at a specified location.** Read
    [references/return-health-recommendations-based-air-quality-conditions-and-pollutants-currently-affecting-specif.md](https://www.gstatic.com/googlemapsplatform-agent-skills/air-quality-api-web-api/references/return-health-recommendations-based-air-quality-conditions-and-pollutants-currently-affecting-specif.md).
    *Dependencies*:
    `["references/return-current-air-quality-index-specified-geographic-location.md"]` \
    *Trigger Condition*: Use when the user wants health advice or actionable
    recommendations for different demographic groups based on current air
    quality. *Evidence Checkpoint*: HTTP 200 OK response with
    `HEALTH_RECOMMENDATIONS` enabled, returning the `healthRecommendations`
    object in the JSON payload.
-   [ ] **Retrieves an hourly forecast (up to 96 hours / 4 days) of the Air
    Quality Index for a specified geographic location via the forecast:lookup
    endpoint.** Read
    [references/return-four-day-forecast-air-quality-index-specified-geographic-location.md](https://www.gstatic.com/googlemapsplatform-agent-skills/air-quality-api-web-api/references/return-four-day-forecast-air-quality-index-specified-geographic-location.md).
    *Trigger Condition*: Use when the user wants future air quality predictions
    or a multi-day AQI forecast for a specific location. *Evidence Checkpoint*:
    HTTP 200 OK response containing the `hourlyForecasts` array with `indexes`
    for the requested future time period.
-   [ ] **Retrieves a four-day forecast of qualitative air quality descriptions
    and categories for a specified geographic location.** Read
    [references/return-four-day-forecast-air-quality-descriptions-specified-geographic-location.md](https://www.gstatic.com/googlemapsplatform-agent-skills/air-quality-api-web-api/references/return-four-day-forecast-air-quality-descriptions-specified-geographic-location.md).
    *Dependencies*:
    `["references/return-four-day-forecast-air-quality-index-specified-geographic-location.md"]` \
    *Trigger Condition*: Use when the user wants forecasted air quality
    categories and descriptive summaries over the next four days. *Evidence
    Checkpoint*: HTTP 200 OK response containing category descriptions inside
    the `indexes` array of each `hourlyForecasts` entry.
-   [ ] **Retrieves a four-day forecast of specific air pollutants and their
    predicted concentrations for a specified geographic location.** Read
    [references/return-four-day-forecast-air-pollutants-and-relative-concentrations-that-will-affect-specified-geogr.md](https://www.gstatic.com/googlemapsplatform-agent-skills/air-quality-api-web-api/references/return-four-day-forecast-air-pollutants-and-relative-concentrations-that-will-affect-specified-geogr.md).
    *Dependencies*:
    `["references/return-four-day-forecast-air-quality-index-specified-geographic-location.md"]` \
    *Trigger Condition*: Use when the user wants forecasted pollutant levels and
    concentrations (e.g., future PM2.5 or ozone levels) for up to 4 days.
    *Evidence Checkpoint*: HTTP 200 OK response with `POLLUTANT_CONCENTRATION`
    enabled, returning the `pollutants` array within `hourlyForecasts`.
-   [ ] **Retrieves a four-day forecast including details on the sources and
    health effects of predicted air pollutants for a specified location.** Read
    [references/return-four-day-air-quality-forecast-sources-and-effects-air-pollutants-that-will-affect-specified-g.md](https://www.gstatic.com/googlemapsplatform-agent-skills/air-quality-api-web-api/references/return-four-day-air-quality-forecast-sources-and-effects-air-pollutants-that-will-affect-specified-g.md).
    *Dependencies*:
    `["references/return-four-day-forecast-air-quality-index-specified-geographic-location.md",
    "references/return-four-day-forecast-air-pollutants-and-relative-concentrations-that-will-affect-specified-geogr.md"]` \
    *Trigger Condition*: Use when the user requests the sources and effects of
    forecasted air pollutants over a four-day period. *Evidence Checkpoint*:
    HTTP 200 OK response with `POLLUTANT_ADDITIONAL_INFO` enabled, returning
    `additionalInfo` within the forecasted `pollutants` array.
-   [ ] **Retrieves a four-day forecast of health recommendations tailored to
    general and at-risk populations based on predicted air quality.** Read
    [references/return-four-day-forecast-health-recommendations-based-air-quality-conditions-and-pollutants-that-wil.md](https://www.gstatic.com/googlemapsplatform-agent-skills/air-quality-api-web-api/references/return-four-day-forecast-health-recommendations-based-air-quality-conditions-and-pollutants-that-wil.md).
    *Dependencies*:
    `["references/return-four-day-forecast-air-quality-index-specified-geographic-location.md"]` \
    *Trigger Condition*: Use when the user wants future health recommendations
    or activity guidance based on the 4-day air quality forecast. *Evidence
    Checkpoint*: HTTP 200 OK response with `HEALTH_RECOMMENDATIONS` enabled,
    returning `healthRecommendations` in each `hourlyForecasts` item.
-   [ ] **Retrieves historical hourly Air Quality Index data (up to 30 days /
    720 hours) for a specified geographic location via the history:lookup
    endpoint.** Read
    [references/return-30-day-history-air-quality-index-specified-geographic-location.md](https://www.gstatic.com/googlemapsplatform-agent-skills/air-quality-api-web-api/references/return-30-day-history-air-quality-index-specified-geographic-location.md).
    *Trigger Condition*: Use when the user wants past air quality index data or
    historical AQI trends up to 30 days ago for a location. *Evidence
    Checkpoint*: HTTP 200 OK response containing the `hoursInfo` array with
    historical `indexes` data in the JSON payload.
-   [ ] **Retrieves up to 30 days of historical air quality qualitative
    descriptions and categories for a specified geographic location.** Read
    [references/return-30-day-history-air-quality-descriptions-specified-geographic-location.md](https://www.gstatic.com/googlemapsplatform-agent-skills/air-quality-api-web-api/references/return-30-day-history-air-quality-descriptions-specified-geographic-location.md).
    *Dependencies*:
    `["references/return-30-day-history-air-quality-index-specified-geographic-location.md"]` \
    *Trigger Condition*: Use when the user needs descriptive summaries or
    category classifications of past air quality over the last 30 days.
    *Evidence Checkpoint*: HTTP 200 OK response containing category descriptions
    inside the `indexes` array of each `hoursInfo` historical entry.
-   [ ] **Retrieves up to 30 days of historical air pollutant types and relative
    concentrations for a specified geographic location.** Read
    [references/return-30-day-history-air-pollutants-and-relative-concentrations-that-affected-specified-geographic.md](https://www.gstatic.com/googlemapsplatform-agent-skills/air-quality-api-web-api/references/return-30-day-history-air-pollutants-and-relative-concentrations-that-affected-specified-geographic.md).
    *Dependencies*:
    `["references/return-30-day-history-air-quality-index-specified-geographic-location.md"]` \
    *Trigger Condition*: Use when the user wants to analyze historical pollutant
    concentrations (such as past PM2.5 or NO2 levels) over the past 30 days.
    *Evidence Checkpoint*: HTTP 200 OK response with `POLLUTANT_CONCENTRATION`
    enabled, returning the `pollutants` array within the `hoursInfo` list.
-   [ ] **Retrieves up to 30 days of historical air pollutant data including
    details on pollutant emission sources and health effects.** Read
    [references/return-30-day-history-sources-and-effects-air-pollutants-that-affected-specified-geographic-location.md](https://www.gstatic.com/googlemapsplatform-agent-skills/air-quality-api-web-api/references/return-30-day-history-sources-and-effects-air-pollutants-that-affected-specified-geographic-location.md).
    *Dependencies*:
    `["references/return-30-day-history-air-quality-index-specified-geographic-location.md",
    "references/return-30-day-history-air-pollutants-and-relative-concentrations-that-affected-specified-geographic.md"]` \
    *Trigger Condition*: Use when the user wants historical air quality data
    along with explanations of the sources and health effects of those past
    pollutants. *Evidence Checkpoint*: HTTP 200 OK response with
    `POLLUTANT_ADDITIONAL_INFO` enabled, returning `additionalInfo` within the
    historical `pollutants` array.
-   [ ] **Retrieves up to 30 days of historical health recommendations based on
    the air quality conditions that affected a specified location.** Read
    [references/return-30-day-history-health-recommendations-based-air-quality-conditions-and-pollutants-that-affect.md](https://www.gstatic.com/googlemapsplatform-agent-skills/air-quality-api-web-api/references/return-30-day-history-health-recommendations-based-air-quality-conditions-and-pollutants-that-affect.md).
    *Dependencies*:
    `["references/return-30-day-history-air-quality-index-specified-geographic-location.md"]` \
    *Trigger Condition*: Use when the user wants to retrieve the health
    recommendations that were applicable during past air quality events (up to
    30 days ago). *Evidence Checkpoint*: HTTP 200 OK response with
    `HEALTH_RECOMMENDATIONS` enabled, returning `healthRecommendations` within
    the `hoursInfo` array.
-   [ ] **Retrieves a 256x256 PNG image file representing a color-coded air
    quality heatmap tile for given map tile coordinates (x, y) and zoom level.**
    Read
    [references/return-image-file-air-quality-heatmap-tile-set-map-tile-coordinates-and-zoom-level.md](https://www.gstatic.com/googlemapsplatform-agent-skills/air-quality-api-web-api/references/return-image-file-air-quality-heatmap-tile-set-map-tile-coordinates-and-zoom-level.md).
    *Trigger Condition*: Use when the user wants to display an air quality
    heatmap overlay on a map or fetch raster map tiles for specific
    pollutant/AQI heatmaps. *Evidence Checkpoint*: HTTP 200 OK response with
    `Content-Type: image/png` containing the binary PNG image payload for the
    requested `(zoom, x, y)` tile.
