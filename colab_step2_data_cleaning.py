"""
===============================================================================
PROJECT-KAVACH (SIH 2026): STEP 2 - AUTOMATED DATA CLEANING & FEATURE ENGINEERING
Author: Padam Kishore & Team
Description: Full Data Cleaning, Missing Value Imputation, Outlier Capping,
             and Domain Feature Engineering for 12 APIs & RDSO 6-Sensors.
===============================================================================
"""

import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any

class KavachDataCleanerAndFeatureEngine:
    def __init__(self, deceleration_coeff: float = 0.15, safety_margin_m: float = 500.0):
        self.mu = deceleration_coeff
        self.safety_margin_m = safety_margin_m

    def clean_raw_api_data(self, df_raw: pd.DataFrame) -> pd.DataFrame:
        df = df_raw.copy()
        initial_len = len(df)
        df.drop_duplicates(inplace=True)
        
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

        df['weather_temp_c'] = df['weather_temp_c'].clip(-10.0, 60.0)
        df['rail_temp'] = df['rail_temp'].clip(-10.0, 90.0)
        df['vibration_rms'] = df['vibration_rms'].clip(0.0, 15.0)
        df['kurtosis'] = df['kurtosis'].clip(1.0, 15.0)
        df['axle_load_tonnes'] = df['axle_load_tonnes'].clip(10.0, 40.0)
        df['usfd_flaw_mm'] = df['usfd_flaw_mm'].clip(0.0, 50.0)
        df['inter_distance_km'] = df['inter_distance_km'].clip(0.1, 100.0)
        df['superfast_speed_kmh'] = df['superfast_speed_kmh'].clip(0.0, 160.0)
        df['track_max_speed_kmh'] = df['track_max_speed_kmh'].clip(50.0, 160.0)
        df['inter_station_dist_km'] = df['inter_station_dist_km'].clip(1.0, 50.0)

        print(f"[CLEANING COMPLETE] Processed {initial_len:,} rows -> Cleaned {len(df):,} rows (Zero Nulls, No Outliers)")
        return df

    def engineer_railway_features(self, df_cleaned: pd.DataFrame) -> pd.DataFrame:
        df = df_cleaned.copy()
        
        df['ebd_superfast_m'] = (df['superfast_speed_kmh'] ** 2) / (250.0 * self.mu)
        df['ebd_local_m'] = (60.0 ** 2) / (250.0 * self.mu)
        df['safe_headway_km'] = (df['ebd_superfast_m'] + df['ebd_local_m'] + self.safety_margin_m) / 1000.0

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

        print(f"[FEATURE ENGINEERING COMPLETE] Added 7 Domain Features: ebd_superfast_m, safe_headway_km, tshi_score, speed_ratio, speed_delta_kmh, thermal_risk_delta_c, leapfrog_safety_margin_mins")
        return df

    def transform_pipeline(self, df_raw: pd.DataFrame) -> pd.DataFrame:
        df_clean = self.clean_raw_api_data(df_raw)
        df_engineered = self.engineer_railway_features(df_clean)
        return df_engineered

if __name__ == "__main__":
    raw_sample = pd.DataFrame([{
        "weather_temp_c": 34.5, "vibration_rms": 1.4, "kurtosis": 3.2,
        "rail_temp": 48.0, "axle_load_tonnes": 22.5, "usfd_flaw_mm": 0.0,
        "inter_distance_km": 32.0, "superfast_speed_kmh": 75.0,
        "track_max_speed_kmh": 120.0, "inter_station_dist_km": 14.0
    }])
    cleaner = KavachDataCleanerAndFeatureEngine()
    df_result = cleaner.transform_pipeline(raw_sample)
    print("\nTransformed Feature Vector Output:")
    print(df_result.T)
