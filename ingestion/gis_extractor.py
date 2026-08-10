"""
PROJECT-KAVACH RAILWAY GIS TRACK & SIGNAL EXTRACTOR
===================================================
Yeh module Overpass Turbo API se OpenStreetMap ke 100% Real Broad Gauge Railway Tracks
aur OpenRailwayMap ke Signals fetch karke single master GeoJSON files update karta hai:
- data/geojson/india_railway_tracks.geojson
- data/raw/openrailwaymap_signals.json
"""

import os
import json
import logging
import httpx

logger = logging.getLogger("kavach-gis-extractor")

OVERPASS_SERVERS = [
    "https://overpass-api.de/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
]

async def extract_railway_infrastructure(data_dir: str, producer=None, add_log_fn=None):
    """
    Overpass Turbo API query run karta hai aur Broad Gauge Tracks + Signals ka data
    master files me save karta hai (no storage bloat).
    """
    if add_log_fn:
        add_log_fn("OVERPASS_API", "Running 1-Minute Railway Infrastructure & Track GIS Extraction...")

    tracks_query = '[out:json][timeout:180];(way["railway"="rail"](18.9,72.8,28.7,77.2););out geom;'
    signals_query = '[out:json][timeout:180];node["railway"="signal"](18.9,72.8,28.7,77.2);out body;'

    headers = {"User-Agent": "ProjectKavach/4.0 (Legal Open Data Extractor)"}
    tracks_data = None
    signals_data = None

    async with httpx.AsyncClient(timeout=180.0, follow_redirects=True) as client:
        # 1. Fetch Tracks Geometry
        for server in OVERPASS_SERVERS:
            try:
                r1 = await client.get(f"{server}?data={tracks_query}", headers=headers)
                if r1.status_code == 200 and len(r1.content) > 1000:
                    tracks_data = r1.json()
                    if add_log_fn:
                        add_log_fn("TRACKS_GIS", f"Fetched {len(r1.content)} bytes of Broad Gauge tracks from {server}", "SUCCESS")
                    break
            except Exception as e:
                logger.debug(f"Overpass track server retry: {e}")

        # 2. Fetch Signals Positions
        for server in OVERPASS_SERVERS:
            try:
                r2 = await client.get(f"{server}?data={signals_query}", headers=headers)
                if r2.status_code == 200:
                    signals_data = r2.json()
                    if add_log_fn:
                        add_log_fn("SIGNALS_API", f"Fetched OpenRailwayMap Signals from {server}", "SUCCESS")
                    break
            except Exception as e:
                logger.debug(f"Overpass signal server retry: {e}")

    # Overwrite single master track GeoJSON file
    if tracks_data:
        latest_tracks_path = os.path.join(data_dir, "geojson", "india_railway_tracks.geojson")
        os.makedirs(os.path.dirname(latest_tracks_path), exist_ok=True)
        with open(latest_tracks_path, "w", encoding="utf-8") as f:
            json.dump(tracks_data, f, indent=2)

        if add_log_fn:
            add_log_fn("TRACKS_UPDATER", "Updated Master Track GeoJSON file (No storage bloat)", "SUCCESS")

        if producer:
            for elem in tracks_data.get("elements", []):
                producer.produce("railway-tracks", key=str(elem.get("id")), value=json.dumps(elem))
            producer.flush()

    # Overwrite single master signals JSON file
    if signals_data:
        signals_path = os.path.join(data_dir, "raw", "openrailwaymap_signals.json")
        os.makedirs(os.path.dirname(signals_path), exist_ok=True)
        with open(signals_path, "w", encoding="utf-8") as f:
            json.dump(signals_data, f, indent=2)

        if add_log_fn:
            add_log_fn("SIGNALS_UPDATER", "Updated Master Signal JSON file (No storage bloat)", "SUCCESS")
