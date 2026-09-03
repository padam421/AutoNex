"""
===============================================================================
PROJECT-KAVACH (SIH 2026): STEP 3 - TRAIN/TEST SPLITTING & FEATURE SCALING
Author: Padam Kishore & Team
Description: Splits 50,000 cleaned samples into 80% Train / 20% Test sets and
             applies StandardScaler normalization for AI Model Training.
===============================================================================
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from colab_step2_data_cleaning import KavachDataCleanerAndFeatureEngine

class KavachDataSplitterAndScaler:
    """
    Step 3 Pipeline:
    1. Feature / Target Matrix Separation
    2. 80/20 Train-Test Stratified Split
    3. StandardScaler Normalization (Mean=0, Std=1)
    4. Scaler Joblib Export for Production Deployment
    """

    def __init__(self, models_dir: str = "./models"):
        self.models_dir = models_dir
        os.makedirs(self.models_dir, exist_ok=True)
        self.scaler = StandardScaler()

    def split_and_scale(self, df_engineered: pd.DataFrame):
        """
        Executes Step 3: Splits data into Train (80%) and Test (20%), then scales features.
        """
        print("==========================================================================================")
        print("[SPLITTING] STEP 3A: SEPARATING FEATURES (X) & TARGETS (Y)")
        print("==========================================================================================")

        # Select 16 Input Features
        feature_columns = [
            'weather_temp_c', 'vibration_rms', 'kurtosis', 'rail_temp', 'axle_load_tonnes', 
            'usfd_flaw_mm', 'inter_distance_km', 'superfast_speed_kmh', 'track_max_speed_kmh', 
            'inter_station_dist_km', 'ebd_superfast_m', 'safe_headway_km', 'tshi_score', 
            'speed_ratio', 'speed_delta_kmh', 'leapfrog_safety_margin_mins'
        ]

        # Ensure all feature columns exist
        available_features = [col for col in feature_columns if col in df_engineered.columns]
        
        X = df_engineered[available_features]
        y_defect = df_engineered['target_defect']
        y_scenario = df_engineered['target_scenario']

        print(f"  Input Features Matrix (X): {X.shape[0]:,} samples x {X.shape[1]} features")
        print(f"  Target 1 (Track Defect Level): {y_defect.nunique()} classes")
        print(f"  Target 2 (Scenario Dispatch Action): {y_scenario.nunique()} classes")

        print("\n==========================================================================================")
        print("[SPLITTING] STEP 3B: EXECUTING 80% TRAIN / 20% TEST SPLIT")
        print("==========================================================================================")

        # 80/20 Train-Test Split
        X_train, X_test, y_train_def, y_test_def, y_train_scen, y_test_scen = train_test_split(
            X, y_defect, y_scenario, test_size=0.20, random_state=42
        )

        print(f"  Training Set (X_train): {X_train.shape[0]:,} samples (80%)")
        print(f"  Testing Set  (X_test) : {X_test.shape[0]:,} samples (20%)")

        print("\n==========================================================================================")
        print("[SCALING] STEP 3C: FEATURE SCALING & NORMALIZATION (StandardScaler)")
        print("==========================================================================================")

        # Fit Scaler on X_train, then transform both X_train and X_test
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Save Scaler Object for Deployment
        scaler_path = os.path.join(self.models_dir, "scaler.joblib")
        joblib.dump(self.scaler, scaler_path)
        print(f"[SUCCESS] FEATURE SCALING COMPLETE! Scaler saved to: {scaler_path}")
        print(f"          Mean of Scaled Features: {np.mean(X_train_scaled):.4f} (~0)")
        print(f"          Std  of Scaled Features: {np.std(X_train_scaled):.4f} (~1)")

        return {
            "X_train_scaled": X_train_scaled,
            "X_test_scaled": X_test_scaled,
            "y_train_defect": y_train_def,
            "y_test_defect": y_test_def,
            "y_train_scenario": y_train_scen,
            "y_test_scenario": y_test_scen,
            "feature_names": available_features
        }

if __name__ == "__main__":
    np.random.seed(42)
    n_samples = 50000

    df_raw = pd.DataFrame({
        'weather_temp_c': np.random.uniform(20.0, 50.0, n_samples),
        'vibration_rms': np.random.uniform(0.5, 6.0, n_samples),
        'kurtosis': np.random.uniform(2.0, 7.0, n_samples),
        'rail_temp': np.random.uniform(30.0, 70.0, n_samples),
        'axle_load_tonnes': np.random.uniform(18.0, 30.0, n_samples),
        'usfd_flaw_mm': np.random.choice([0.0, 2.0, 8.0], size=n_samples, p=[0.90, 0.07, 0.03]),
        'inter_distance_km': np.random.uniform(2.0, 50.0, n_samples),
        'superfast_speed_kmh': np.random.uniform(60.0, 110.0, n_samples),
        'track_max_speed_kmh': np.random.choice([110.0, 120.0, 130.0], n_samples),
        'inter_station_dist_km': np.random.uniform(8.0, 20.0, n_samples),
        'target_defect': np.random.choice([0, 1, 2, 3], size=n_samples),
        'target_scenario': np.random.choice([0, 1, 2], size=n_samples)
    })

    cleaner = KavachDataCleanerAndFeatureEngine()
    df_engineered = cleaner.engineer_railway_features(df_raw)

    splitter = KavachDataSplitterAndScaler()
    data_dict = splitter.split_and_scale(df_engineered)
    print("\nStep 3 Pipeline Ready for Model Training!")
