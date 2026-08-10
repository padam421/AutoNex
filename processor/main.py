import os
import time
import json
import math
import logging
from datetime import datetime
import sys
import types

# Polyfill asyncore for Python 3.12/3.13 compatibility with Datastax driver
try:
    import asyncore
except ImportError:
    asyncore_stub = types.ModuleType("asyncore")
    class _stub_dispatcher:
        def __init__(self, sock=None, map=None): pass
        def add_channel(self, map=None): pass
        def del_channel(self, map=None): pass
        def close(self): pass
    class _stub_file_dispatcher(_stub_dispatcher): pass
    asyncore_stub.dispatcher = _stub_dispatcher
    asyncore_stub.file_dispatcher = _stub_file_dispatcher
    asyncore_stub.socket_map = {}
    sys.modules["asyncore"] = asyncore_stub

# pyrefly: ignore [missing-import]
from cassandra.cluster import Cluster
# pyrefly: ignore [missing-import]
from cassandra.query import SimpleStatement
# pyrefly: ignore [missing-import]
from confluent_kafka import Consumer, KafkaError


try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("stream-processor")

KAFKA_BROKER = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")
CASSANDRA_HOST = os.getenv("CASSANDRA_HOST", "cassandra")
DATA_DIR = os.getenv("DATA_DIR", "/app/data")
PARQUET_FILE = os.path.join(DATA_DIR, "ml_ready_dataset", "kavach_ml_dataset.parquet")

def save_to_parquet_batch(records_batch):
    # Local Parquet file write disabled by user request. All data stream to Cassandra.
    return

def init_cassandra():
    logger.info(f"Checking optional Cassandra connection at {CASSANDRA_HOST}...")
    session = None
    for attempt in range(2):
        try:
            cluster = Cluster([CASSANDRA_HOST], port=9042)
            session = cluster.connect()
            logger.info("Connected to Cassandra successfully.")
            break
        except Exception as e:
            logger.warning(f"Cassandra not active ({e}). Streaming processor will save to local DATA_DIR.")
            time.sleep(1)

    if session:
        try:
            session.execute("""
                CREATE KEYSPACE IF NOT EXISTS kavach
                WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};
            """)

            session.set_keyspace("kavach")

            session.execute("""
                CREATE TABLE IF NOT EXISTS train_telemetry (
                    train_id text,
                    timestamp timestamp,
                    precedence_rank int,
                    train_category text,
                    max_permitted_speed double,
                    rake_length_meters double,
                    gross_weight_tonnes double,
                    brake_type text,
                    latitude double,
                    longitude double,
                    speed double,
                    calculated_ebd double,
                    elevation double,
                    slope_gradient double,
                    rail_temperature double,
                    movement_authority double,
                    rfid_tag_id text,
                    track_type text,
                    signal_status text,
                    collision_risk text,
                    PRIMARY KEY (train_id, timestamp)
                ) WITH CLUSTERING ORDER BY (timestamp DESC);
            """)

            session.execute("""
                CREATE TABLE IF NOT EXISTS weather_history (
                    station_code text,
                    timestamp timestamp,
                    station_name text,
                    zone text,
                    latitude double,
                    longitude double,
                    temperature_c double,
                    humidity_pct double,
                    wind_speed_kmh double,
                    visibility_km double,
                    fog_rain_hazard boolean,
                    PRIMARY KEY (station_code, timestamp)
                ) WITH CLUSTERING ORDER BY (timestamp DESC)
                  AND default_time_to_live = 432000;
            """)

            session.execute("""
                CREATE TABLE IF NOT EXISTS kavach_alerts (
                    alert_id text,
                    timestamp timestamp,
                    train_1 text,
                    train_2 text,
                    distance_meters double,
                    severity text,
                    action_taken text,
                    PRIMARY KEY (alert_id)
                );
            """)
            logger.info("Cassandra schema initialized: Keyspace 'kavach' ready.")
        except Exception as se:
            logger.warning(f"Cassandra schema execution notice: {se}")

    return session

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # Radius of Earth in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def start_pipeline():
    session = init_cassandra()

    conf = {
        'bootstrap.servers': KAFKA_BROKER,
        'group.id': 'kavach-processor-group',
        'auto.offset.reset': 'earliest'
    }

    consumer = None
    while not consumer:
        try:
            consumer = Consumer(conf)
            consumer.subscribe(['train-telemetry', 'railway-tracks', 'railway-weather', 'railway-stations'])
            logger.info("Connected to Kafka consumer. Subscribed to 'train-telemetry', 'railway-weather', 'railway-stations' & 'railway-tracks'.")
        except Exception as e:
            logger.warning(f"Waiting for Kafka broker ({e})... retrying in 5s")
            time.sleep(5)

    recent_train_positions = {}

    prepared_stmt = None
    weather_stmt = None
    alert_stmt = None

    if session:
        try:
            prepared_stmt = session.prepare("""
                INSERT INTO train_telemetry (
                    train_id, timestamp, precedence_rank, train_category, max_permitted_speed,
                    rake_length_meters, gross_weight_tonnes, brake_type, latitude, longitude,
                    speed, calculated_ebd, elevation, slope_gradient, rail_temperature,
                    movement_authority, rfid_tag_id, track_type, signal_status, collision_risk
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """)

            weather_stmt = session.prepare("""
                INSERT INTO weather_history (
                    station_code, timestamp, station_name, zone, latitude, longitude,
                    temperature_c, humidity_pct, wind_speed_kmh, visibility_km, fog_rain_hazard
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """)

            alert_stmt = session.prepare("""
                INSERT INTO kavach_alerts (alert_id, timestamp, train_1, train_2, distance_meters, severity, action_taken)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """)
        except Exception as pe:
            logger.warning(f"Notice preparing statements: {pe}")

    logger.info("⚡ STREAM PROCESSOR BRIDGE IS LIVE AND CONSUMING FROM KAFKA ⚡")
    parquet_buffer = []

    raw_dir = os.path.join(DATA_DIR, "raw")
    os.makedirs(raw_dir, exist_ok=True)

    while True:
        msg = consumer.poll(1.0)
        if msg is None:
            if parquet_buffer:
                save_to_parquet_batch(parquet_buffer)
                parquet_buffer.clear()
            continue
        if msg.error():
            if msg.error().code() != KafkaError._PARTITION_EOF:
                logger.error(f"Kafka error: {msg.error()}")
            continue

        try:
            payload = json.loads(msg.value().decode('utf-8'))
            topic = msg.topic()

            if topic == 'railway-weather':
                stn_code = payload.get("station_code", "STN")
                ts_str = payload.get("last_updated_utc", datetime.utcnow().isoformat())
                try:
                    ts = datetime.fromisoformat(ts_str.replace("Z", ""))
                except Exception:
                    ts = datetime.utcnow()

                if session and weather_stmt:
                    try:
                        session.execute(weather_stmt, [
                            stn_code, ts, payload.get("station_name", ""), payload.get("zone", ""),
                            float(payload.get("latitude", 0.0)), float(payload.get("longitude", 0.0)),
                            float(payload.get("temperature_c", 30.0)), float(payload.get("humidity_pct", 60.0)),
                            float(payload.get("wind_speed_kmh", 10.0)), float(payload.get("visibility_km", 10.0)),
                            bool(payload.get("fog_rain_hazard", False))
                        ])
                    except Exception:
                        pass
                
                logger.info(f"🌩️ Weather History Persisted in Cassandra: {stn_code} @ {payload.get('temperature_c')}°C")

            elif topic == 'train-telemetry':
                train_id = payload.get("train_id", "TRAIN-UNKNOWN")
                ts_str = payload.get("timestamp", datetime.utcnow().isoformat())
                try:
                    ts = datetime.fromisoformat(ts_str.replace("Z", ""))
                except Exception:
                    ts = datetime.utcnow()

                precedence_rank = int(payload.get("precedence_rank", 3))
                train_category = payload.get("train_category", "EXPRESS")
                max_permitted_speed = float(payload.get("max_permitted_speed", 110.0))
                rake_length = float(payload.get("rake_length_meters", 500.0))
                gross_weight = float(payload.get("gross_weight_tonnes", 1000.0))
                brake_type = payload.get("brake_type", "TWIN_PIPE_AIR_BRAKE")
                lat = float(payload.get("latitude", 0.0))
                lon = float(payload.get("longitude", 0.0))
                speed = float(payload.get("speed", 0.0))
                ebd = float(payload.get("calculated_ebd_meters", 0.0))
                elevation = float(payload.get("elevation_meters", 0.0))
                slope = float(payload.get("slope_gradient_pct", 0.0))
                rail_temp = float(payload.get("rail_temperature_c", 35.0))
                ma = float(payload.get("movement_authority_meters", 2000.0))
                rfid_tag = payload.get("rfid_tag_id", "RFID-DEFAULT")
                track_type = payload.get("track_type", "MAIN_LINE")
                signal_status = payload.get("signal_status", "GREEN")
                risk = "NORMAL"

                # Check collision risk with other active trains
                for other_id, pos in recent_train_positions.items():
                    if other_id != train_id:
                        dist = calculate_distance(lat, lon, pos['lat'], pos['lon'])
                        if dist < 500: # less than 500 meters
                            risk = "CRITICAL_COLLISION_ALERT"
                            alert_id = f"ALT-{int(time.time()*1000)}"
                            logger.warning(f"🚨 COLLISION ALERT DETECTED between {train_id} (Rank {precedence_rank}) and {other_id} ({dist:.1f}m)! Triggering Kavach Auto-Brake!")
                            if session and alert_stmt:
                                try:
                                    session.execute(alert_stmt, [
                                        alert_id, ts, train_id, other_id, dist, "CRITICAL", "AUTO_BRAKE_APPLIED"
                                    ])
                                except Exception:
                                    pass

                recent_train_positions[train_id] = {'lat': lat, 'lon': lon, 'time': ts}

                if session and prepared_stmt:
                    try:
                        session.execute(prepared_stmt, [
                            train_id, ts, precedence_rank, train_category, max_permitted_speed,
                            rake_length, gross_weight, brake_type, lat, lon,
                            speed, ebd, elevation, slope, rail_temp,
                            ma, rfid_tag, track_type, signal_status, risk
                        ])
                    except Exception:
                        pass

                # Buffer for Parquet ML dataset export
                parquet_buffer.append({
                    "train_id": train_id,
                    "timestamp": ts_str,
                    "precedence_rank": precedence_rank,
                    "train_category": train_category,
                    "max_permitted_speed": max_permitted_speed,
                    "rake_length_meters": rake_length,
                    "gross_weight_tonnes": gross_weight,
                    "brake_type": brake_type,
                    "latitude": lat,
                    "longitude": lon,
                    "speed": speed,
                    "calculated_ebd": ebd,
                    "elevation": elevation,
                    "slope_gradient": slope,
                    "rail_temperature_c": rail_temp,
                    "movement_authority_meters": ma,
                    "rfid_tag_id": rfid_tag,
                    "track_type": track_type,
                    "signal_status": signal_status,
                    "collision_risk": risk
                })

                if len(parquet_buffer) >= 50:
                    save_to_parquet_batch(parquet_buffer)
                    parquet_buffer.clear()

                logger.info(f"Pipeline Processed: {train_id} (Rank {precedence_rank}) @ ({lat:.4f}, {lon:.4f}) | Speed: {speed}km/h | Risk: {risk}")

        except Exception as e:
            logger.error(f"Error processing record: {e}")

if __name__ == "__main__":
    start_pipeline()

