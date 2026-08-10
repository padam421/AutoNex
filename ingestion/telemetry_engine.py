"""
PROJECT-KAVACH 24/7 CONTINUOUS TELEMETRY STREAM ENGINE
======================================================
Yeh module 24/7 continuous live locomotive telemetry streams generate karta hai:
- Real-route corridor navigation (New Delhi -> Kanpur -> Varanasi, Mumbai -> Pune, Chennai -> Secunderabad, etc.)
- Train Precedence Ranks (Rank 1: Vande Bharat, Rank 2: Rajdhani, Rank 3: MEMU Local, Rank 4: Goods Coal)
- Physics-based parameters (Slope gradient, Elevation, Brake Type, Rake Length, Gross Weight)
- Kavach System Parameters (Movement Authority MA in meters, Track Sleeper RFID Tag IDs, Track Type MAIN/LOOP)
"""

import json
import logging
import asyncio
from datetime import datetime

try:
    from ingestion.weather_service import fetch_elevation_and_gradient
except ImportError:
    from weather_service import fetch_elevation_and_gradient

logger = logging.getLogger("kavach-telemetry-engine")

# Dynamic Telemetry Stream Interval in Seconds (Default: 0.5 Seconds)
DYNAMIC_TELEMETRY_INTERVAL_SECONDS = 0.5

def set_telemetry_interval_seconds(seconds: float):
    global DYNAMIC_TELEMETRY_INTERVAL_SECONDS
    DYNAMIC_TELEMETRY_INTERVAL_SECONDS = max(0.1, float(seconds))
    logger.info(f"⚡ Telemetry Stream Interval dynamically updated to {DYNAMIC_TELEMETRY_INTERVAL_SECONDS} seconds")

def get_telemetry_interval_seconds() -> float:
    return DYNAMIC_TELEMETRY_INTERVAL_SECONDS

# 5 Major Indian Railways Corridors covering 18 Zones
ALL_INDIA_TRAIN_CORRIDORS = [
    {
        "train_id": "VANDE-BHARAT-22436",
        "train_category": "PREMIUM_SUPERFAST",
        "precedence_rank": 1,  # Rank 1: Highest Right of Way
        "max_permitted_speed": 160.0,
        "loco_type": "WAP-7",
        "rake_length_meters": 430.0,
        "gross_weight_tonnes": 850.0,
        "brake_type": "TWIN_PIPE_AIR_BRAKE",
        "waypoints": [
            {"code": "NDLS", "lat": 28.6139, "lon": 77.2090},
            {"code": "CNB", "lat": 26.4547, "lon": 80.3508},
            {"code": "PRYJ", "lat": 25.4484, "lon": 81.8247},
            {"code": "DDU", "lat": 25.2818, "lon": 83.1189},
            {"code": "PNBE", "lat": 25.6022, "lon": 85.1376},
            {"code": "HWH", "lat": 22.5840, "lon": 88.3426}
        ]
    },
    {
        "train_id": "RAJDHANI-EXPRESS-12951",
        "train_category": "SUPERFAST_EXPRESS",
        "precedence_rank": 2,  # Rank 2: High Precedence
        "max_permitted_speed": 130.0,
        "loco_type": "WAP-7",
        "rake_length_meters": 620.0,
        "gross_weight_tonnes": 1200.0,
        "brake_type": "TWIN_PIPE_AIR_BRAKE",
        "waypoints": [
            {"code": "MMCT", "lat": 18.9696, "lon": 72.8193},
            {"code": "BRC", "lat": 22.3107, "lon": 73.1812},
            {"code": "ADI", "lat": 23.0225, "lon": 72.5714},
            {"code": "JP", "lat": 26.9196, "lon": 75.7878},
            {"code": "NDLS", "lat": 28.6139, "lon": 77.2090}
        ]
    },
    {
        "train_id": "SHATABDI-EXPRESS-12007",
        "train_category": "PREMIUM_SUPERFAST",
        "precedence_rank": 1,
        "max_permitted_speed": 130.0,
        "loco_type": "WAP-7",
        "rake_length_meters": 540.0,
        "gross_weight_tonnes": 980.0,
        "brake_type": "TWIN_PIPE_AIR_BRAKE",
        "waypoints": [
            {"code": "MAS", "lat": 13.0827, "lon": 80.2707},
            {"code": "BZA", "lat": 16.5062, "lon": 80.6480},
            {"code": "SC", "lat": 17.4339, "lon": 78.5016},
            {"code": "SBC", "lat": 12.9781, "lon": 77.5697}
        ]
    },
    {
        "train_id": "LOCAL-MEMU-PASSENGER-64001",
        "train_category": "PASSENGER_LOCAL",
        "precedence_rank": 3,
        "max_permitted_speed": 90.0,
        "loco_type": "MEMU-3Phase",
        "rake_length_meters": 280.0,
        "gross_weight_tonnes": 650.0,
        "brake_type": "ELECTRO_PNEUMATIC",
        "waypoints": [
            {"code": "NDLS", "lat": 28.6139, "lon": 77.2090},
            {"code": "GZB", "lat": 28.6692, "lon": 77.4538},
            {"code": "MB", "lat": 28.8386, "lon": 78.7733},
            {"code": "LKO", "lat": 26.8322, "lon": 80.9231}
        ]
    },
    {
        "train_id": "GOODS-COAL-BOXN-HEAVY-90012",
        "train_category": "FREIGHT_GOODS",
        "precedence_rank": 4,
        "max_permitted_speed": 75.0,
        "loco_type": "WAG-9",
        "rake_length_meters": 750.0,
        "gross_weight_tonnes": 4800.0,
        "brake_type": "TWIN_PIPE_AIR_BRAKE",
        "waypoints": [
            {"code": "BSP", "lat": 22.0797, "lon": 82.1391},
            {"code": "R", "lat": 21.2514, "lon": 81.6296},
            {"code": "NGP", "lat": 21.1458, "lon": 79.0882},
            {"code": "BPQ", "lat": 19.8789, "lon": 79.3562}
        ]
    }
]

async def continuous_24x7_all_india_telemetry_loop(get_producer_fn=None, add_log_fn=None):
    """
    Continuous sub-second telemetry engine simulating active locomotives moving across 18 Indian Railway Zones.
    Publishes to Kafka topic 'train-telemetry' which streams into Cassandra table 'kavach.train_telemetry'.
    """
    logger.info(f"🚀 Started 24/7 Locomotive Telemetry Engine (Interval: {DYNAMIC_TELEMETRY_INTERVAL_SECONDS}s)")
    step = 0

    while True:
        try:
            step += 1
            producer = get_producer_fn() if callable(get_producer_fn) else get_producer_fn

            for idx, corridor in enumerate(ALL_INDIA_TRAIN_CORRIDORS):
                waypoints = corridor["waypoints"]
                wp_idx = (step + idx) % len(waypoints)
                curr_wp = waypoints[wp_idx]

                lat = curr_wp["lat"] + (step % 5) * 0.001
                lon = curr_wp["lon"] + (step % 5) * 0.001

                # Dynamic physics & topography
                topo = await fetch_elevation_and_gradient(lat, lon)
                speed = min(corridor["max_permitted_speed"], max(40.0, 110.0 - topo["slope_gradient_pct"] * 15))

                # Dynamic Signal Aspects & Precedence MA
                signal_aspect = "GREEN" if (step % 7 != 0) else ("YELLOW" if step % 3 == 0 else "RED")
                track_kind = "MAIN" if corridor["precedence_rank"] <= 2 else "LOOP"
                rfid_code = f"TAG-IR-ZONE-{curr_wp['code']}-S{step % 99:03d}"

                # Calculate Emergency Braking Distance (EBD)
                base_ebd = (speed ** 2) / (250.0 * 0.15)

                telemetry_packet = {
                    "train_id": corridor["train_id"],
                    "train_category": corridor["train_category"],
                    "precedence_rank": corridor["precedence_rank"],
                    "max_permitted_speed": corridor["max_permitted_speed"],
                    "loco_type": corridor["loco_type"],
                    "rake_length_meters": corridor["rake_length_meters"],
                    "gross_weight_tonnes": corridor["gross_weight_tonnes"],
                    "brake_type": corridor["brake_type"],
                    "timestamp": datetime.utcnow().isoformat(),
                    "latitude": lat,
                    "longitude": lon,
                    "speed": speed,
                    "signal_status": signal_aspect,
                    "elevation_meters": topo["elevation_meters"],
                    "slope_gradient_pct": topo["slope_gradient_pct"],
                    "temperature_c": topo["temperature_c"],
                    "rail_temperature_c": round(topo["temperature_c"] + 8.5, 1),
                    "wind_speed_kmh": topo["wind_speed_kmh"],
                    "visibility_km": topo["visibility_km"],
                    "movement_authority_meters": 4000.0 if signal_aspect == "GREEN" else 500.0,
                    "rfid_tag_id": rfid_code,
                    "track_type": track_kind,
                    "calculated_ebd_meters": round(base_ebd, 1)
                }

                if producer:
                    producer.produce("train-telemetry", key=corridor["train_id"], value=json.dumps(telemetry_packet))

            if producer:
                producer.flush()

        except Exception as e:
            logger.error(f"Error in 24/7 telemetry loop: {e}")

        sleep_sec = get_telemetry_interval_seconds()
        await asyncio.sleep(sleep_sec)
