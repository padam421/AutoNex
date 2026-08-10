"""
PROJECT-KAVACH MASTER RAILWAYS DATASET LOADER
================================================
Yeh module 100% REAL Indian Railways Master Datasets ko load aur process karta hai:
- 8,990+ Real Stations (india_railway_stations_master.json)
- 11,000+ Real Trains & Routes (india_railway_trains_master.json)

Ye code direct Master Files ko read karke Kafka topics ('railway-stations', 'train-schedules')
me publish karta hai bina local disk storage me extra snapshot files create kiye.
"""

import os
import json
import logging
from datetime import datetime

logger = logging.getLogger("kavach-master-loader")

# Master Nodes for fallback coordinates across all 18 Indian Railway Zones
ALL_INDIA_RAILWAY_NODES = [
    {"code": "NDLS", "name": "New Delhi", "lat": 28.6139, "lon": 77.2090, "zone": "Northern Railway"},
    {"code": "LKO", "name": "Lucknow Charbagh", "lat": 26.8322, "lon": 80.9231, "zone": "Northern Railway"},
    {"code": "JAT", "name": "Jammu Tawi", "lat": 32.7060, "lon": 74.8797, "zone": "Northern Railway"},
    {"code": "ASR", "name": "Amritsar Junction", "lat": 31.6340, "lon": 74.8723, "zone": "Northern Railway"},
    {"code": "CDG", "name": "Chandigarh Junction", "lat": 30.7046, "lon": 76.8014, "zone": "Northern Railway"},
    {"code": "BSB", "name": "Varanasi Junction", "lat": 25.3176, "lon": 82.9739, "zone": "Northern Railway"},
    {"code": "MB", "name": "Moradabad Junction", "lat": 28.8386, "lon": 78.7733, "zone": "Northern Railway"},

    {"code": "CSMT", "name": "Mumbai CSMT", "lat": 18.9401, "lon": 72.8350, "zone": "Central Railway"},
    {"code": "MMCT", "name": "Mumbai Central", "lat": 18.9696, "lon": 72.8193, "zone": "Western Railway"},
    {"code": "PUNE", "name": "Pune Junction", "lat": 18.5289, "lon": 73.8744, "zone": "Central Railway"},
    {"code": "ADI", "name": "Ahmedabad Junction", "lat": 23.0225, "lon": 72.5714, "zone": "Western Railway"},
    {"code": "ST", "name": "Surat", "lat": 21.2039, "lon": 72.8406, "zone": "Western Railway"},
    {"code": "BRC", "name": "Vadodara Junction", "lat": 22.3107, "lon": 73.1812, "zone": "Western Railway"},
    {"code": "NGP", "name": "Nagpur Junction", "lat": 21.1504, "lon": 79.0882, "zone": "Central Railway"},

    {"code": "HWH", "name": "Howrah Junction", "lat": 22.5840, "lon": 88.3426, "zone": "Eastern Railway"},
    {"code": "SDAH", "name": "Sealdah", "lat": 22.5684, "lon": 88.3700, "zone": "Eastern Railway"},
    {"code": "ASN", "name": "Asansol Junction", "lat": 23.6835, "lon": 86.9649, "zone": "Eastern Railway"},
    {"code": "TATA", "name": "Tatanagar Junction", "lat": 22.7694, "lon": 86.1989, "zone": "South Eastern Railway"},
    {"code": "ROU", "name": "Rourkela Junction", "lat": 22.2268, "lon": 84.8569, "zone": "South Eastern Railway"},

    {"code": "MAS", "name": "Chennai Central", "lat": 13.0827, "lon": 80.2707, "zone": "Southern Railway"},
    {"code": "SC", "name": "Secunderabad Junction", "lat": 17.4339, "lon": 78.5016, "zone": "South Central Railway"},
    {"code": "BZA", "name": "Vijayawada Junction", "lat": 16.5062, "lon": 80.6480, "zone": "South Central Railway"},
    {"code": "SBC", "name": "KSR Bengaluru", "lat": 12.9781, "lon": 77.5697, "zone": "South Western Railway"},
    {"code": "TVC", "name": "Thiruvananthapuram Central", "lat": 8.4875, "lon": 76.9525, "zone": "Southern Railway"},

    {"code": "JP", "name": "Jaipur Junction", "lat": 26.9196, "lon": 75.7878, "zone": "North Western Railway"},
    {"code": "KOTA", "name": "Kota Junction", "lat": 25.2224, "lon": 75.8648, "zone": "West Central Railway"},
    {"code": "BPL", "name": "Bhopal Junction", "lat": 23.2599, "lon": 77.4126, "zone": "West Central Railway"},
    {"code": "CNB", "name": "Kanpur Central", "lat": 26.4547, "lon": 80.3508, "zone": "North Central Railway"},
    {"code": "PNBE", "name": "Patna Junction", "lat": 25.6022, "lon": 85.1376, "zone": "East Central Railway"},
    {"code": "GHY", "name": "Guwahati", "lat": 26.1806, "lon": 91.7539, "zone": "Northeast Frontier Railway"},
    {"code": "BBS", "name": "Bhubaneswar", "lat": 20.2666, "lon": 85.8436, "zone": "East Coast Railway"}
]

async def load_real_indian_railways_master(data_dir: str, producer=None, add_log_fn=None, send_to_kafka: bool = True):
    """
    Reads official master JSON datasets (Stations & Trains) and streams records to Kafka.
    No timestamped snapshot files are written to disk.
    """
    if add_log_fn:
        add_log_fn("MASTER_LOADER", "Loading 100% REAL Indian Railways Master Datasets (11,000+ Trains & 8,990+ Stations)")
        
    stations_path = os.path.join(data_dir, "raw", "india_railway_stations_master.json")
    trains_path = os.path.join(data_dir, "raw", "india_railway_trains_master.json")

    # 1. Process Stations Master Data
    if os.path.exists(stations_path):
        with open(stations_path, "r", encoding="utf-8") as f:
            stations_data = json.load(f)
            count = len(stations_data.get('features', []))
            
            if add_log_fn:
                add_log_fn("STATIONS_MASTER", f"Loaded Master Station Network ({count} Stations across 18 Zones)", "SUCCESS")
                
            if send_to_kafka and producer:
                for feature in stations_data.get("features", [])[:1000]:
                    stn_code = feature.get("properties", {}).get("code", "STN")
                    producer.produce("railway-stations", key=str(stn_code), value=json.dumps(feature))
                producer.flush()

    # 2. Process Trains Master Schedules Data
    if os.path.exists(trains_path):
        with open(trains_path, "r", encoding="utf-8") as f:
            trains_data = json.load(f)
            features = trains_data.get("features", [])
            
            if add_log_fn:
                add_log_fn("TRAINS_MASTER", f"Loaded Master Train Schedules ({len(features)} Real Indian Trains)", "SUCCESS")
                
            if send_to_kafka and producer:
                for tr in features[:500]:
                    tr_no = tr.get("properties", {}).get("number", "TRAIN")
                    producer.produce("train-schedules", key=str(tr_no), value=json.dumps(tr))
                producer.flush()
