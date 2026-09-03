"""
===============================================================================
PROJECT-KAVACH (SIH 2026): FASTAPI AI MODEL INFERENCE SERVICE
Author: Padam Kishore & Team
Description: Loads saved joblib models (scaler, defect, dispatch) and serves real-time
             AI predictions for the FastAPI ingestion backend and Render deployment.
===============================================================================
"""

import os
import joblib
import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, List

logger = logging.getLogger("kavach-ai-service")

# Resolve model paths (supports local workspace & Docker /app/models)
def resolve_models_dir() -> str:
    env_dir = os.getenv("MODELS_DIR")
    if env_dir and os.path.exists(env_dir):
        return env_dir
    if os.path.exists("/app/models") and os.path.isdir("/app/models"):
        return "/app/models"
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    local_models = os.path.join(project_root, "models")
    os.makedirs(local_models, exist_ok=True)
    return local_models

MODELS_DIR = resolve_models_dir()

SCALER_OBJ = None
MODEL_DEFECT_OBJ = None
MODEL_DISPATCH_OBJ = None
AI_SERVICE_LOADED = False

def load_ai_models() -> bool:
    global SCALER_OBJ, MODEL_DEFECT_OBJ, MODEL_DISPATCH_OBJ, AI_SERVICE_LOADED
    
    scaler_path = os.path.join(MODELS_DIR, "scaler.joblib")
    defect_path = os.path.join(MODELS_DIR, "model_defect.joblib")
    dispatch_path = os.path.join(MODELS_DIR, "model_dispatch.joblib")

    if os.path.exists(scaler_path) and os.path.exists(defect_path) and os.path.exists(dispatch_path):
        try:
            SCALER_OBJ = joblib.load(scaler_path)
            MODEL_DEFECT_OBJ = joblib.load(defect_path)
            MODEL_DISPATCH_OBJ = joblib.load(dispatch_path)
            AI_SERVICE_LOADED = True
            logger.info(f"[SUCCESS] Trained AI Models & Scaler Loaded Successfully from: {MODELS_DIR}")
            return True
        except Exception as e:
            logger.error(f"[ERROR] Failed to load trained AI models: {e}")
            AI_SERVICE_LOADED = False
            return False
    else:
        logger.warning(f"[WARNING] Trained AI Model files missing in {MODELS_DIR}. Inference running in fallback mode.")
        AI_SERVICE_LOADED = False
        return False

# Attempt model loading on module import
load_ai_models()

FEATURE_COLUMNS = [
    'weather_temp_c', 'vibration_rms', 'kurtosis', 'rail_temp', 'axle_load_tonnes', 
    'usfd_flaw_mm', 'inter_distance_km', 'superfast_speed_kmh', 'track_max_speed_kmh', 
    'inter_station_dist_km', 'ebd_superfast_m', 'safe_headway_km', 'tshi_score', 
    'speed_ratio', 'speed_delta_kmh', 'leapfrog_safety_margin_mins'
]

DEFECT_LABELS = ["Safe", "Monitor", "Warning", "Critical Track Defect"]
DISPATCH_LABELS = ["Safety Hold", "Scenario 1 (Speed Up)", "Scenario 2 (Leapfrog)"]

def clean_and_engineer_packet(raw_packet: Dict[str, Any]) -> pd.DataFrame:
    """Helper to transform raw telemetry packet into 16-feature vector"""
    df = pd.DataFrame([raw_packet])
    
    # Harmonize names
    if 'weather_temp' in df.columns and 'weather_temp_c' not in df.columns:
        df['weather_temp_c'] = df['weather_temp']
    if 'axle_load' in df.columns and 'axle_load_tonnes' not in df.columns:
        df['axle_load_tonnes'] = df['axle_load']
    if 'superfast_speed' in df.columns and 'superfast_speed_kmh' not in df.columns:
        df['superfast_speed_kmh'] = df['superfast_speed']
    if 'track_max_speed' in df.columns and 'track_max_speed_kmh' not in df.columns:
        df['track_max_speed_kmh'] = df['track_max_speed']
    if 'inter_station_km' in df.columns and 'inter_station_dist_km' not in df.columns:
        df['inter_station_dist_km'] = df['inter_station_km']

    df['weather_temp_c'] = df['weather_temp_c'].fillna(32.0)
    df['vibration_rms'] = df['vibration_rms'].fillna(1.2)
    df['kurtosis'] = df['kurtosis'].fillna(3.0)
    df['rail_temp'] = df['rail_temp'].fillna(df['weather_temp_c'] + 15.0)
    df['axle_load_tonnes'] = df['axle_load_tonnes'].fillna(22.0)
    df['usfd_flaw_mm'] = df['usfd_flaw_mm'].fillna(0.0)
    df['inter_distance_km'] = df['inter_distance_km'].fillna(25.0)
    df['superfast_speed_kmh'] = df['superfast_speed_kmh'].fillna(80.0)
    df['track_max_speed_kmh'] = df['track_max_speed_kmh'].fillna(110.0)
    df['inter_station_dist_km'] = df['inter_station_dist_km'].fillna(12.0)

    # Feature Engineering
    mu = 0.15
    safety_m = 500.0
    df['ebd_superfast_m'] = (df['superfast_speed_kmh'] ** 2) / (250.0 * mu)
    df['ebd_local_m'] = (60.0 ** 2) / (250.0 * mu)
    df['safe_headway_km'] = (df['ebd_superfast_m'] + df['ebd_local_m'] + safety_m) / 1000.0

    tshi = 100.0 - (
        (df['kurtosis'] > 4.5).astype(float) * 15.0 +
        (df['rail_temp'] > 60.0).astype(float) * 15.0 +
        (df['usfd_flaw_mm'] > 0.0).astype(float) * 35.0 +
        (df['axle_load_tonnes'] > 25.0).astype(float) * 20.0
    )
    df['tshi_score'] = tshi.clip(0.0, 100.0)

    df['speed_ratio'] = df['superfast_speed_kmh'] / df['track_max_speed_kmh']
    df['speed_delta_kmh'] = df['track_max_speed_kmh'] - df['superfast_speed_kmh']
    df['thermal_risk_delta_c'] = df['rail_temp'] - 55.0

    t_local_ab_mins = (df['inter_station_dist_km'] / 60.0) * 60.0 + 3.0
    t_superfast_to_b_mins = ((df['inter_distance_km'] + df['inter_station_dist_km']) / np.maximum(df['superfast_speed_kmh'], 10.0)) * 60.0
    df['leapfrog_safety_margin_mins'] = t_superfast_to_b_mins - t_local_ab_mins

    return df

def predict_ai_action(raw_telemetry_packet: Dict[str, Any]) -> Dict[str, Any]:
    """
    Exposes Live AI Prediction for FastAPI endpoints.
    """
    df_engineered = clean_and_engineer_packet(raw_telemetry_packet)
    X = df_engineered[FEATURE_COLUMNS]

    if AI_SERVICE_LOADED and SCALER_OBJ is not None:
        X_scaled = SCALER_OBJ.transform(X)
        pred_def_idx = int(MODEL_DEFECT_OBJ.predict(X_scaled)[0])
        pred_disp_idx = int(MODEL_DISPATCH_OBJ.predict(X_scaled)[0])
        def_prob = float(np.max(MODEL_DEFECT_OBJ.predict_proba(X_scaled)[0]))
        disp_prob = float(np.max(MODEL_DISPATCH_OBJ.predict_proba(X_scaled)[0]))
    else:
        # Physics fallback if models loading pending
        usfd = float(df_engineered['usfd_flaw_mm'].iloc[0])
        tshi = float(df_engineered['tshi_score'].iloc[0])
        pred_def_idx = 3 if usfd > 10.0 or tshi < 50.0 else (0 if tshi >= 90.0 else 1)
        pred_disp_idx = 1 if float(df_engineered['inter_distance_km'].iloc[0]) < 20.0 else 2
        def_prob, disp_prob = 0.95, 0.97

    tshi_score = float(df_engineered['tshi_score'].iloc[0])
    inter_dist = float(df_engineered['inter_distance_km'].iloc[0])
    superfast_sp = float(df_engineered['superfast_speed_kmh'].iloc[0])
    track_max_sp = float(df_engineered['track_max_speed_kmh'].iloc[0])

    return {
        "status": "SUCCESS",
        "ai_service_loaded": AI_SERVICE_LOADED,
        "track_structural_defect": {
            "prediction_code": pred_def_idx,
            "prediction_label": DEFECT_LABELS[pred_def_idx],
            "confidence_score": round(def_prob, 4),
            "track_structural_health_index_pct": tshi_score
        },
        "scenario_dispatch_action": {
            "prediction_code": pred_disp_idx,
            "prediction_label": DISPATCH_LABELS[pred_disp_idx],
            "confidence_score": round(disp_prob, 4),
            "recommended_cab_action": (
                f"ELEVATE_SPEED to {track_max_sp}km/h (+{track_max_sp - superfast_sp}km/h)"
                if pred_disp_idx == 1 else ("ADVANCE_LOCAL_TO_LOOP_LINE" if pred_disp_idx == 2 else "HOLD_SAFETY_MARGIN")
            )
        },
        "live_features_extracted": {
            "ebd_superfast_meters": round(float(df_engineered['ebd_superfast_m'].iloc[0]), 1),
            "safe_headway_km": round(float(df_engineered['safe_headway_km'].iloc[0]), 2),
            "leapfrog_safety_margin_mins": round(float(df_engineered['leapfrog_safety_margin_mins'].iloc[0]), 1)
        }
    }
