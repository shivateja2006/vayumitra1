# Return an Image File of an Air Quality Heatmap Tile

## Overview

The `heatmapTiles` endpoint of the Air Quality API provides air quality-related
heatmaps through a tile overlay. A tile overlay is a collection of 256 x 256
pixel PNG image tiles that can be displayed on top of a Google Map.

Each tile is assigned `(X, Y)` coordinates within a grid determined by the `zoom
level` (`Z`).

-   The tile at `(0, 0)` is always at the northwest corner of the map.
-   `X` values increase from west to east.
-   `Y` values increase from north to south.
-   The grid size scales exponentially with the zoom level (`2^Z x 2^Z`). For
    example, at a zoom level of `2`, the world map is represented as a 4 x 4
    matrix (16 total tiles), meaning valid `X` and `Y` coordinates range from
    `0` to `3`.

## Endpoint Details

You request current air quality heatmap tiles by sending an HTTP `GET` request
to the `lookupHeatmapTile` endpoint:

```http
GET https://airquality.googleapis.com/v1/mapTypes/{TYPE}/heatmapTiles/{Z}/{X}/{Y}?key=YOUR_API_KEY
```

### Required Path & Query Parameters

All parameters are required in the request:

Parameter | Type    | Description
:-------- | :------ | :----------
`TYPE`    | String  | The type of heatmap to return (e.g., `US_AQI`, `UAQI_RED_GREEN`, `UAQI_INDIGO_PERSIAN`, `PM25_INDIGO_PERSIAN`, `GBR_DEFRA`, `DEU_UBA`, `CAN_EC`, `FRA_ATMO`, `IND_CPCB`).
`Z`       | Integer | The zoom level that determines how large or small the contents of a map appear in a map view. Allowed values are `0` to `16` (where `0` displays the entire world in a single tile).
`X`       | Integer | The east-west tile coordinate relative to the northwest corner `(0,0)`. Must be valid for the specified zoom level (`0 <= X < 2^Z`).
`Y`       | Integer | The north-south tile coordinate relative to the northwest corner `(0,0)`. Must be valid for the specified zoom level (`0 <= Y < 2^Z`).
`key`     | String  | Your application's Google Maps Platform API key.

### Headers

When making standard REST calls to the Air Quality API, include the usage
attribution header:

Header                    | Value
:------------------------ | :-----------------------
`X-Goog-Maps-Solution-ID` | `gmp_git_agentskills_v1`

## Code Examples

### 1. Direct HTTP GET Request (cURL)

The following example requests a `US_AQI` heatmap tile at zoom level `2` and
coordinates `(0, 1)`, saving the resulting binary PNG data to a file:

```bash
curl -X GET \
  "https://airquality.googleapis.com/v1/mapTypes/US_AQI/heatmapTiles/2/0/1?key=YOUR_API_KEY" \
  -H "X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1" \
  --output heatmaptile_2_0_1.png
```

### 2. Fetching a Tile in Node.js / JavaScript

```javascript
const fs = require('fs');

async function fetchHeatmapTile(mapType, zoom, x, y, apiKey) {
  const url = `https://airquality.googleapis.com/v1/mapTypes/${mapType}/heatmapTiles/${zoom}/${x}/${y}?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Goog-Maps-Solution-ID': 'gmp_git_agentskills_v1'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
  }

  // The response is a binary PNG image
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(`tile_${zoom}_${x}_${y}.png`, buffer);
  console.log(`Saved tile_${zoom}_${x}_${y}.png`);
}

fetchHeatmapTile('US_AQI', 2, 0, 1, 'YOUR_API_KEY').catch(console.error);
```

### 3. Overlaying Heatmap Tiles on Google Maps JS API

When displaying the heatmap tiles directly on a Google Map in the browser using
`google.maps.ImageMapType`, configure the `internalUsageAttributionIds` in
`MapOptions`:

```javascript
function initMap() {
  const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 4,
    center: { lat: 39.8283, lng: -98.5795 }, // Center of the US
    internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
  });

  const apiKey = "YOUR_API_KEY";
  const mapType = "US_AQI";

  const airQualityMapType = new google.maps.ImageMapType({
    getTileUrl: function (coord, zoom) {
      // Ensure zoom is within the supported range (0-16)
      if (zoom < 0 || zoom > 16) {
        return null;
      }

      // Normalize X coordinate to wrap around the world, and validate Y coordinate
      const numTiles = 1 << zoom;
      if (coord.y < 0 || coord.y >= numTiles) {
        return null;
      }
      const x = ((coord.x % numTiles) + numTiles) % numTiles;

      return `https://airquality.googleapis.com/v1/mapTypes/${mapType}/heatmapTiles/${zoom}/${x}/${coord.y}?key=${apiKey}`;
    },
    tileSize: new google.maps.Size(256, 256),
    maxZoom: 16,
    minZoom: 0,
    name: "Air Quality",
    opacity: 0.6,
  });

  // Add the heatmap tile overlay on top of the base map
  map.overlayMapTypes.insertAt(0, airQualityMapType);
}
```

## Common Errors & Troubleshooting

-   **Invalid Coordinates for Zoom Level (`400 Bad Request`)**: Ensure that both
    `X` and `Y` are within the bounds of `0` and `(2^Z) - 1`. For example,
    requesting coordinates `(10, 10)` at zoom level `2` (where max coordinate is
    `3`) will return an error.
-   **Invalid Zoom Level (`400 Bad Request`)**: The zoom level `Z` must be
    between `0` and `16` inclusive.
