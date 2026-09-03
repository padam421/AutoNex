"""
===============================================================================
PROJECT-KAVACH (SIH 2026): STEP 5 - REAL-TIME LIVE MODEL INFERENCE & DEPLOYMENT TEST
Author: Padam Kishore & Team
Description: Loads saved models & scalers (.joblib) and evaluates live incoming
             telemetry packets against Scenarios 1, 2, 3 and Track Structural Safety.
===============================================================================
"""

import os
import joblib
import numpy as np
import pandas as pd
from colab_step2_data_cleaning import KavachDataCleanerAndFeatureEngine
from scenario_engine import KavachScenarioEngine

class KavachLiveInferencePipeline:
    """
    Step 5 Pipeline:
    1. Loads saved scaler.joblib, model_defect.joblib, model_dispatch.joblib
    2. Accepts raw real-time telemetry dictionaries/dataframes
    3. Transforms, scales, and predicts live AI actions
    4. Triggers cab messages and geotagged P-Way alerts
    """

    def __init__(self, models_dir: str = "./models"):
        self.models_dir = models_dir
        self.cleaner = KavachDataCleanerAndFeatureEngine()
        self.scenario_engine = KavachScenarioEngine()

        scaler_path = os.path.join(models_dir, "scaler.joblib")
        defect_path = os.path.join(models_dir, "model_defect.joblib")
        dispatch_path = os.path.join(models_dir, "model_dispatch.joblib")

        print("==========================================================================================")
        print("[DEPLOYMENT] LOADING TRAINED MODEL & SCALER ARTIFACTS (.joblib)")
        print("==========================================================================================")

        self.scaler = joblib.load(scaler_path)
        self.model_defect = joblib.load(defect_path)
        self.model_dispatch = joblib.load(dispatch_path)

        print(f"  [LOADED] Scaler       : {scaler_path}")
        print(f"  [LOADED] Defect Model : {defect_path}")
        print(f"  [LOADED] Dispatch Model: {dispatch_path}")

        self.feature_columns = [
            'weather_temp_c', 'vibration_rms', 'kurtosis', 'rail_temp', 'axle_load_tonnes', 
            'usfd_flaw_mm', 'inter_distance_km', 'superfast_speed_kmh', 'track_max_speed_kmh', 
            'inter_station_dist_km', 'ebd_superfast_m', 'safe_headway_km', 'tshi_score', 
            'speed_ratio', 'speed_delta_kmh', 'leapfrog_safety_margin_mins'
        ]

    def predict_live_telemetry(self, raw_telemetry: dict) -> dict:
        """
        Accepts a single raw telemetry packet from live APIs/schedules/sensors
        and returns complete AI prediction + scenario decision.
        """
        df_raw = pd.DataFrame([raw_telemetry])
        df_engineered = self.cleaner.transform_pipeline(df_raw)

        X = df_engineered[self.feature_columns]
        X_scaled = self.scaler.transform(X)

        defect_pred = self.model_defect.predict(X_scaled)[0]
        dispatch_pred = self.model_dispatch.predict(X_scaled)[0]

        defect_labels = ["Safe", "Monitor", "Warning", "Critical Track Defect"]
        dispatch_labels = ["Safety Hold", "Scenario 1 (Speed Up)", "Scenario 2 (Leapfrog)"]

        # Scenario engine decision details
        sc1 = self.scenario_engine.evaluate_scenario_1(
            local_train_id=raw_telemetry.get("local_train_id", "LOCAL-101"),
            superfast_train_id=raw_telemetry.get("superfast_train_id", "VANDE-BHARAT-20901"),
            inter_train_dist_km=df_engineered['inter_distance_km'].iloc[0],
            superfast_current_speed_kmh=df_engineered['superfast_speed_kmh'].iloc[0],
            track_max_speed_kmh=df_engineered['track_max_speed_kmh'].iloc[0],
            sensor_kurtosis=df_engineered['kurtosis'].iloc[0],
            sensor_rail_temp=df_engineered['rail_temp'].iloc[0],
            sensor_usfd_flaw_mm=df_engineered['usfd_flaw_mm'].iloc[0],
            sensor_axle_load=df_engineered['axle_load_tonnes'].iloc[0]
        )

        sc2 = self.scenario_engine.evaluate_scenario_2(
            local_train_id=raw_telemetry.get("local_train_id", "LOCAL-101"),
            superfast_train_id=raw_telemetry.get("superfast_train_id", "VANDE-BHARAT-20901"),
            station_a_name="Station A (Bhopal)",
            station_b_name="Station B (Habibganj)",
            inter_station_dist_km=df_engineered['inter_station_dist_km'].iloc[0],
            inter_train_dist_km=df_engineered['inter_distance_km'].iloc[0]
        )

        drift = self.scenario_engine.inspect_longterm_track_drift(
            live_vibration_rms=df_engineered['vibration_rms'].iloc[0],
            live_kurtosis=df_engineered['kurtosis'].iloc[0],
            live_usfd_flaw_mm=df_engineered['usfd_flaw_mm'].iloc[0],
            live_gauge_width_mm=raw_telemetry.get("laser_gauge_width_mm", 1676.0)
        )

        return {
            "ai_predicted_defect": defect_labels[defect_pred],
            "ai_predicted_dispatch": dispatch_labels[dispatch_pred],
            "track_structural_health_index": df_engineered['tshi_score'].iloc[0],
            "scenario_1_details": sc1,
            "scenario_2_details": sc2,
            "longterm_track_drift_safety": drift
        }

if __name__ == "__main__":
    pipeline = KavachLiveInferencePipeline()

    print("\n" + "="*80)
    print("[TEST 1] TESTING LIVE TELEMETRY SAMPLE 1: SCENARIO 1 (SPEED ELEVATION AUTHORIZED)")
    print("="*80)
    sample_1 = {
        "weather_temp_c": 30.0, "vibration_rms": 1.1, "kurtosis": 2.5,
        "rail_temp": 42.0, "axle_load_tonnes": 22.0, "usfd_flaw_mm": 0.0,
        "inter_distance_km": 18.0, "superfast_speed_kmh": 75.0,
        "track_max_speed_kmh": 120.0, "inter_station_dist_km": 12.0,
        "laser_gauge_width_mm": 1676.2
    }
    res_1 = pipeline.predict_live_telemetry(sample_1)
    print(f"  AI Defect Prediction  : {res_1['ai_predicted_defect']}")
    print(f"  AI Dispatch Prediction: {res_1['ai_predicted_dispatch']}")
    print(f"  Track Health Index    : {res_1['track_structural_health_index']}%")
    print(f"  Cab Alert Superfast   : {res_1['scenario_1_details'].get('cab_message_superfast', 'N/A')}")

    print("\n" + "="*80)
    print("[TEST 2] TESTING LIVE TELEMETRY SAMPLE 2: CRITICAL TRACK DAMAGE ALERT (SAFETY DISPATCH)")
    print("="*80)
    sample_2 = {
        "weather_temp_c": 45.0, "vibration_rms": 4.8, "kurtosis": 5.8,
        "rail_temp": 68.0, "axle_load_tonnes": 26.5, "usfd_flaw_mm": 14.0,
        "inter_distance_km": 10.0, "superfast_speed_kmh": 90.0,
        "track_max_speed_kmh": 120.0, "inter_station_dist_km": 12.0,
        "laser_gauge_width_mm": 1680.5
    }
    res_2 = pipeline.predict_live_telemetry(sample_2)
    print(f"  AI Defect Prediction  : {res_2['ai_predicted_defect']}")
    print(f"  AI Dispatch Prediction: {res_2['ai_predicted_dispatch']}")
    print(f"  Track Health Index    : {res_2['track_structural_health_index']}%")
    print(f"  P-Way Notification    : {res_2['longterm_track_drift_safety'].get('pway_geotagged_notification')}")
