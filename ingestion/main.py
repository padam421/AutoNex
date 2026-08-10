"""
PROJECT-KAVACH MASTER INGESTION SERVICE (ENTRYPOINT)
=====================================================
Modular Entrypoint for PROJECT-KAVACH Ingestion Engine v4.0:
- Imports Master Loader (master_loader.py)
- Imports Weather Service (weather_service.py)
- Imports GIS Extractor (gis_extractor.py)
- Imports Telemetry Engine (telemetry_engine.py)
- Imports API Routes (api_routes.py)

Run with: uvicorn ingestion.main:app --host 0.0.0.0 --port 8000
"""

import os
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Import Modular Subservices with Docker & local fallback support
try:
    from ingestion.master_loader import load_real_indian_railways_master
    from ingestion.weather_service import fetch_all_india_weather_telemetry, continuous_5hr_all_india_weather_loop
    from ingestion.gis_extractor import extract_railway_infrastructure
    from ingestion.telemetry_engine import continuous_24x7_all_india_telemetry_loop
    from ingestion.railway_iot_sensors import continuous_railway_iot_sensors_loop
    from ingestion.api_routes import setup_routes, add_live_log, save_api_response_to_cassandra
except ImportError:
    from master_loader import load_real_indian_railways_master
    from weather_service import fetch_all_india_weather_telemetry, continuous_5hr_all_india_weather_loop
    from gis_extractor import extract_railway_infrastructure
    from telemetry_engine import continuous_24x7_all_india_telemetry_loop
    from railway_iot_sensors import continuous_railway_iot_sensors_loop
    from api_routes import setup_routes, add_live_log, save_api_response_to_cassandra

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("kavach-ingestion-main")

app = FastAPI(
    title="PROJECT-KAVACH Master Ingestion Engine v4.0 (Modular)",
    description="100% Real Indian Railways Network Data + 5s Satellite Weather + 5h Infrastructure Refresh + 24/7 Telemetry",
    version="4.0.0"
)

# Enable CORS for Swagger UI & Browser Frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def resolve_data_dir():
    env_dir = os.getenv("DATA_DIR")
    if env_dir:
        return env_dir
    if os.path.exists("/app/data") and os.path.isdir("/app/data"):
        return "/app/data"
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    local_data = os.path.join(project_root, "data")
    os.makedirs(local_data, exist_ok=True)
    return local_data

DATA_DIR = resolve_data_dir()
KAFKA_BROKER = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "kafka:9092")

kafka_producer = None

def get_kafka_producer():
    """
    Connects and returns singleton Confluent-Kafka Producer instance.
    """
    global kafka_producer
    if kafka_producer is None:
        try:
            # pyrefly: ignore [missing-import]
            from confluent_kafka import Producer
            kafka_producer = Producer({'bootstrap.servers': KAFKA_BROKER})
            logger.info(f"Kafka Producer connected to {KAFKA_BROKER}")
            add_live_log("KAFKA", f"Producer connected to {KAFKA_BROKER}")
        except Exception as e:
            logger.warning(f"Kafka Producer connection pending: {e}")
    return kafka_producer

def get_data_dir():
    return DATA_DIR


# Register REST API Endpoints & Dashboard
setup_routes(app, get_kafka_producer, get_data_dir)

scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_event():
    """
    Initializes background tasks on FastAPI startup:
    1. 5-Hour Recurring Infrastructure Overwrite Job (Preserves local disk space)
    2. 5-Second Real-Time Satellite Weather Sync Loop (Streams to Cassandra)
    3. 24/7 Continuous All-India Telemetry Stream Loop
    """
    producer = get_kafka_producer()
    
    # 5-Hour Recurring Infrastructure Extraction & Master Data Reload
    scheduler.add_job(lambda: asyncio.create_task(extract_railway_infrastructure(DATA_DIR, producer, add_live_log)), 'interval', hours=5, id="5_hour_infrastructure")
    scheduler.add_job(lambda: asyncio.create_task(load_real_indian_railways_master(DATA_DIR, producer, add_live_log, True)), 'interval', hours=5, id="5_hour_ir_master")
    scheduler.start()
    
    add_live_log("SYSTEM", "PROJECT-KAVACH Master Ingestion Engine v4.0 Started (5s Weather / 5h Infra Refresh)", "SUCCESS")

    # Initial Run of Master Data & Infrastructure
    asyncio.create_task(extract_railway_infrastructure(DATA_DIR, producer, add_live_log))
    asyncio.create_task(load_real_indian_railways_master(DATA_DIR, producer, add_live_log, True))
    
    # Background 5-Hour Real-Time Satellite Weather Loop
    asyncio.create_task(continuous_5hr_all_india_weather_loop(DATA_DIR, get_kafka_producer, add_live_log))
    
    # Background 24/7 Sub-second All-India Real Route Telemetry Stream Engine
    asyncio.create_task(continuous_24x7_all_india_telemetry_loop(get_kafka_producer, add_live_log))

    # Background 24/7 Continuous RDSO Railway IoT Sensors Telemetry Stream Engine (MEMS, USFD, Strain Gauge, Pyrometer, DAS, Laser Profiler)
    asyncio.create_task(continuous_railway_iot_sensors_loop(save_api_response_to_cassandra, add_live_log))

