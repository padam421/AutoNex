"""
PROJECT-KAVACH RAILWAY IOT SENSORS TELEMETRY ENGINE
===================================================
RDSO & SIH Specification Compliant Indian Railways IoT Sensor Pipeline:
1. Sleeper-Mounted MEMS Accelerometer (X, Y, Z Track Vibration)
2. Ultrasonic Transducer Array (USFD Internal Rail Crack Flaw Detection)
3. Rail-Mounted Foil Strain Gauge (Wheel Load & Axle Overload Detection)
4. Wayside Non-Contact IR Pyrometer (Rail Steel Temperature & Buckling Prevention)
5. Distributed Acoustic Sensing - DAS Interrogator (Fiber Optic Acoustic Tracking)
6. Under-chassis Laser Sheet Profiler (Rail Wear & Broad Gauge Geometry Scanning)
"""

import os
import json
import time
import random
import logging
import asyncio
from datetime import datetime

logger = logging.getLogger("kavach-iot-sensors")

# Sensor Sampling Constants
SENSOR_STREAM_INTERVAL_SECONDS = 2.0

def generate_mems_accelerometer_payload():
    """
    Sleeper-Mounted MEMS Accelerometer (RDSO Compatible)
    Measures 3-Axis Track Vibration (g) and Kurtosis.
    """
    is_train_passing = random.choice([True, True, False])
    
    if is_train_passing:
        x_rms = round(random.uniform(0.10, 0.45), 2)
        y_rms = round(random.uniform(0.15, 0.60), 2)
        z_rms = round(random.uniform(0.80, 2.50), 2)
        z_peak = round(z_rms * random.uniform(2.1, 3.8), 2)
        kurtosis = round(random.uniform(2.5, 5.8), 2)
    else:
        x_rms, y_rms, z_rms = 0.02, 0.03, 0.08
        z_peak = 0.12
        kurtosis = 1.80

    raw_samples = [round(z_rms + random.uniform(-0.3, 0.3), 2) for _ in range(10)]

    return {
        "sensor_id": f"ACC-NDLS-KM{random.randint(100, 450)}-S{random.randint(10, 99)}",
        "sensor_type": "MEMS_3AXIS_ACCELEROMETER",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "train_triggered": is_train_passing,
        "sampling_rate_hz": 5000,
        "metrics": {
            "x_axis_rms_g": x_rms,
            "y_axis_rms_g": y_rms,
            "z_axis_rms_g": z_rms,
            "z_axis_peak_g": z_peak,
            "kurtosis_z": kurtosis
        },
        "ballast_condition": "GOOD" if kurtosis < 4.5 else "DEGRADED_BALLAST_ALERT",
        "raw_vibration_samples_z": raw_samples
    }

def generate_usfd_ultrasonic_payload():
    """
    Ultrasonic Wheel Probe / USFD Transducer Array (RDSO Spec M&C/NDT/128)
    Detects internal rail cracks, bolt-hole flaws, and transverse detail cracks.
    """
    has_defect = random.random() < 0.15  # 15% probability of flaw simulation
    
    defect_types = ["Transverse Detail Crack (TDC)", "Horizontal Fissure", "Bolt-Hole Crack", "Kidney Defect"]
    active_channel = random.choice(["0_deg_vertical", "37_deg_web", "70_deg_head"])

    return {
        "sensor_id": f"USFD-TROLLEY-KM{random.randint(50, 300)}",
        "sensor_type": "ULTRASONIC_USFD_ARRAY",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "track_section": f"NDLS-CNB-DN-KM{random.randint(100, 500)}",
        "coordinate_gps": [round(random.uniform(22.0, 28.5), 4), round(random.uniform(75.0, 88.0), 4)],
        "channel_active": active_channel,
        "flaw_depth_mm": round(random.uniform(2.5, 18.0), 1) if has_defect else 0.0,
        "reflection_amplitude_percentage": round(random.uniform(45.0, 95.0), 1) if has_defect else 5.0,
        "defect_classification": random.choice(defect_types) if has_defect else "NONE_HEALTHY_RAIL",
        "fault_triggered": has_defect
    }

def generate_strain_gauge_payload():
    """
    Rail-Mounted Foil Strain Gauge (Syscon Instruments Wheatstone Bridge)
    Measures Wheel Impact Force (Tonnes) and Axle Overload (>25t limit).
    """
    axle_load = round(random.uniform(18.0, 28.5), 1)
    is_overloaded = axle_load > 25.0  # 25 Tonne Broad Gauge Limit

    return {
        "sensor_id": f"STG-RAILWEB-KM{random.randint(10, 200)}",
        "sensor_type": "RAIL_WEB_FOIL_STRAIN_GAUGE",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "axle_index": random.randint(1, 16),
        "load_tonnes": axle_load,
        "speed_kmh": round(random.uniform(60.0, 130.0), 1),
        "broad_gauge_axle_limit_tonnes": 25.0,
        "anomaly_flag": 1 if is_overloaded else 0,
        "status": "OVERLOADED_AXLE_ALERT" if is_overloaded else "NORMAL_LOAD"
    }

def generate_ir_pyrometer_payload():
    """
    Wayside Non-Contact Infrared Pyrometer (Toshniwal Industries)
    Measures Steel Rail Temperature (°C) to prevent Summer Rail Buckling.
    """
    ambient = round(random.uniform(30.0, 44.0), 1)
    solar_rad = round(random.uniform(700, 1100), 0)
    rail_temp = round(ambient + (solar_rad * 0.025) + random.uniform(0.0, 5.0), 1)
    
    if rail_temp > 65.0:
        risk = "CRITICAL_BUCKLING_RISK"
    elif rail_temp > 55.0:
        risk = "ORANGE_WARNING"
    else:
        risk = "SAFE_NORMAL"

    return {
        "sensor_id": f"TEMP-PYRO-KM{random.randint(100, 600)}",
        "sensor_type": "WAYSIDE_IR_PYROMETER",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "ambient_temp_c": ambient,
        "rail_temp_c": rail_temp,
        "solar_irradiance_wm2": solar_rad,
        "buckling_risk_index": risk
    }

def generate_das_acoustic_payload():
    """
    Distributed Acoustic Sensing (DAS) Fiber Optic Interrogator (IIT Madras Research Park)
    Phase-backscatter Rayleigh acoustic tracking along optical fiber cable (OFC).
    """
    events = [
        "Heavy Track Vibration / Wheel Flat Alert",
        "Normal Passing Train Signature",
        "Animal Intrusion Near Track",
        "Trackside Footstep Acoustic Intrusions"
    ]
    event = random.choice(events)

    return {
        "sensor_id": f"DAS-OFC-STN-{random.randint(1, 20)}",
        "sensor_type": "DISTRIBUTED_ACOUSTIC_SENSING_DAS",
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [round(random.uniform(77.0, 88.0), 4), round(random.uniform(22.0, 28.5), 4)]
        },
        "properties": {
            "source_device": f"DAS-INTERROGATOR-UNIT-{random.randint(10, 99)}",
            "event_timestamp": datetime.utcnow().isoformat() + "Z",
            "event_class": event,
            "confidence": round(random.uniform(0.85, 0.99), 2),
            "chainage_km": round(random.uniform(10.0, 450.0), 2)
        }
    }

def generate_laser_profiler_payload():
    """
    Under-chassis Laser Sheet Profiler & LIDAR (Track Geometry Scanner)
    Scans Rail Wear (mm) and Broad Gauge Width (1676 mm).
    """
    gauge_width = round(1676.0 + random.uniform(-4.0, 8.0), 1)
    is_gauge_expanded = gauge_width > 1679.0

    return {
        "sensor_id": f"LASER-PROFILE-CAR-{random.randint(1, 5)}",
        "sensor_type": "UNDERCHASSIS_LASER_PROFILER",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "milepost_km": round(random.uniform(100.0, 800.0), 3),
        "left_rail_wear_mm": round(random.uniform(0.5, 3.2), 1),
        "right_rail_wear_mm": round(random.uniform(0.5, 3.0), 1),
        "gauge_width_mm": gauge_width,
        "standard_broad_gauge_mm": 1676.0,
        "cross_level_mm": round(random.uniform(0.1, 2.5), 1),
        "geometry_status": "GAUGE_EXPANSION_ALERT" if is_gauge_expanded else "NORMAL_GEOMETRY"
    }

async def continuous_railway_iot_sensors_loop(save_to_cassandra_fn, add_log_fn=None):
    """
    24/7 Continuous Background Ingestion Engine for all 6 RDSO Railway IoT Sensors.
    Generates real-time sensor streams and persists 100% directly into Cassandra NoSQL DB.
    """
    logger.info("⚡ Railway IoT Sensors Telemetry Loop Started (6 RDSO Sensors Active)")
    if add_log_fn:
        add_log_fn("IOT_SENSORS", "⚡ Railway IoT Sensors Engine Online (6 RDSO Sensors Streaming)", "SUCCESS")

    while True:
        try:
            sensors_payloads = [
                ("mems_accelerometer", "Sleep-Mounted MEMS Accelerometer", generate_mems_accelerometer_payload()),
                ("usfd_ultrasonic", "Ultrasonic Flaw Transducer Array", generate_usfd_ultrasonic_payload()),
                ("rail_strain_gauge", "Rail Web Foil Strain Gauge", generate_strain_gauge_payload()),
                ("wayside_ir_pyrometer", "Wayside Non-Contact IR Pyrometer", generate_ir_pyrometer_payload()),
                ("das_fiber_acoustic", "Distributed Acoustic Sensing (DAS)", generate_das_acoustic_payload()),
                ("laser_track_profiler", "Under-chassis Laser Track Profiler", generate_laser_profiler_payload())
            ]

            for api_id, name, payload in sensors_payloads:
                db_payload = {
                    "api_id": api_id,
                    "name": name,
                    "endpoint": f"RDSO-IoT-Sensor://{payload['sensor_type']}",
                    "sync_timestamp": payload.get("timestamp", datetime.utcnow().isoformat()),
                    "status": "SUCCESS",
                    "response_data": payload
                }
                save_to_cassandra_fn(api_id, name, db_payload["endpoint"], f"kavach.{api_id}", db_payload)

            if add_log_fn:
                add_log_fn("IOT_SENSORS", "⚡ Streamed 6 RDSO IoT Sensor readings directly to Cassandra DB", "SUCCESS")

        except Exception as e:
            logger.error(f"Error in IoT sensors loop: {e}")

        await asyncio.sleep(SENSOR_STREAM_INTERVAL_SECONDS)
