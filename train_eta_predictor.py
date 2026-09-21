"""
===============================================================================
PROJECT-KAVACH (SIH 2026): REAL-TIME DYNAMIC ETA & SECTIONAL DELAY ML TRAINER
Author: Padam Kishore & Team
Description: Trains a Machine Learning Regressor (Gradient Boosting / Random Forest)
             to forecast Expected Time of Arrival (ETA) and Sectional Delay for
             Indian Railways coaching trains across all operational conditions.
===============================================================================
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

FEATURE_COLUMNS = [
    "distance_km",
    "scheduled_duration_min",
    "current_delay_min",
    "train_priority_rank",
    "max_permitted_speed_kmh",
    "signal_aspect_code",
    "active_tsr_speed_kmh",
    "weather_visibility_km",
    "weather_rain_hazard",
    "downstream_congestion_density",
    "preceding_train_delay_min",
    "time_of_day_hour",
    "day_of_week",
    "is_major_junction"
]

def generate_indian_railways_eta_dataset(n_samples: int = 60000, random_seed: int = 42) -> pd.DataFrame:
    """
    Generates a realistic, diverse Indian Railways operational dataset modeling:
    - Signal aspect holds (Red/Yellow delays)
    - Fog speed restrictions (RDSO rule: max 60 km/h in fog < 1km visibility)
    - Temporary Speed Restrictions (TSR 20-45 km/h caution orders)
    - Downstream track congestion & preceding train headway cascades
    - Peak-hour station throat interlocking delays at major junctions
    - Indian Railways 4-Tier Precedence Ranking (Vande Bharat > Rajdhani > Mail/Exp > Local)
    """
    np.random.seed(random_seed)
    
    # 1. Section Distance (10 km to 250 km between scheduled stops)
    distance_km = np.random.exponential(scale=45.0, size=n_samples)
    distance_km = np.clip(distance_km, 8.0, 240.0)
    
    # 2. Train Priority Rank: 1=Vande Bharat (10%), 2=Rajdhani/Shatabdi (20%), 3=Express/Mail (50%), 4=Passenger/Local (20%)
    train_priority = np.random.choice([1, 2, 3, 4], size=n_samples, p=[0.10, 0.20, 0.50, 0.20])
    
    # Max Permitted Speed based on priority
    max_speeds = {1: 160.0, 2: 130.0, 3: 110.0, 4: 75.0}
    max_permitted_speed = np.array([max_speeds[p] for p in train_priority])
    
    # Scheduled Cruise Speed (~80% of max permitted speed)
    cruise_speed = max_permitted_speed * np.random.uniform(0.78, 0.88, size=n_samples)
    
    # Scheduled Section Duration (minutes) with Indian Railways in-built recovery margin (~6-10%)
    raw_ideal_duration = (distance_km / cruise_speed) * 60.0
    recovery_margin = raw_ideal_duration * np.random.uniform(0.06, 0.12, size=n_samples)
    scheduled_duration_min = np.round(raw_ideal_duration + recovery_margin, 1)
    
    # 3. Current Initial Delay of the train upon entering this section (minutes)
    base_delay_scale = {1: 4.0, 2: 8.0, 3: 18.0, 4: 28.0}
    current_delay = np.array([np.random.exponential(scale=base_delay_scale[p]) for p in train_priority])
    on_time_mask = np.random.uniform(0, 1, size=n_samples) < 0.25
    current_delay[on_time_mask] = 0.0
    current_delay = np.clip(np.round(current_delay, 1), 0.0, 240.0)
    
    # 4. Signal Aspects: 0=Green (70%), 1=Double Yellow (15%), 2=Yellow (10%), 3=Red (5%)
    signal_aspect = np.random.choice([0, 1, 2, 3], size=n_samples, p=[0.70, 0.15, 0.10, 0.05])
    
    # 5. Temporary Speed Restrictions (TSR): Active in 15% of track sections
    has_tsr = np.random.choice([0, 1], size=n_samples, p=[0.85, 0.15])
    active_tsr_speed = np.where(has_tsr == 1, np.random.choice([20.0, 30.0, 45.0], size=n_samples), max_permitted_speed)
    
    # 6. Satellite Weather Conditions
    weather_visibility = np.random.choice([0.4, 0.8, 2.5, 6.0, 10.0], size=n_samples, p=[0.05, 0.10, 0.15, 0.30, 0.40])
    weather_rain = np.random.choice([0, 1], size=n_samples, p=[0.82, 0.18])
    
    # 7. Downstream Congestion & Preceding Train Headway
    downstream_congestion = np.random.beta(a=2.0, b=4.0, size=n_samples)
    preceding_delay = np.random.exponential(scale=12.0, size=n_samples)
    preceding_delay = np.where(downstream_congestion > 0.4, preceding_delay, 0.0)
    preceding_delay = np.clip(np.round(preceding_delay, 1), 0.0, 120.0)
    
    # 8. Temporal factors
    time_of_day_hour = np.random.randint(0, 24, size=n_samples)
    day_of_week = np.random.randint(0, 7, size=n_samples)
    is_peak_hour = np.isin(time_of_day_hour, [8, 9, 10, 17, 18, 19, 20]).astype(int)
    
    # 9. Major Bottleneck Junction
    is_major_junction = np.random.choice([0, 1], size=n_samples, p=[0.75, 0.25])
    
    # Running time calculation
    effective_speed = np.minimum(cruise_speed, active_tsr_speed)
    fog_penalty = np.where(weather_visibility < 1.0, np.maximum(0.0, effective_speed - 60.0), 0.0)
    effective_speed = effective_speed - fog_penalty
    effective_speed = np.where(weather_rain == 1, effective_speed * 0.95, effective_speed)
    
    actual_run_time = (distance_km / effective_speed) * 60.0
    
    signal_delay = np.zeros(n_samples)
    signal_delay = np.where(signal_aspect == 3, np.random.uniform(8.0, 24.0, size=n_samples), signal_delay)
    signal_delay = np.where(signal_aspect == 2, np.random.uniform(3.0, 8.0, size=n_samples), signal_delay)
    signal_delay = np.where(signal_aspect == 1, np.random.uniform(1.0, 4.0, size=n_samples), signal_delay)
    
    cascade_factor = np.where(train_priority == 1, 0.15, np.where(train_priority == 2, 0.30, 0.55))
    cascade_delay = preceding_delay * downstream_congestion * cascade_factor
    
    junction_delay = np.where((is_major_junction == 1) & (is_peak_hour == 1), 
                              np.random.uniform(6.0, 18.0, size=n_samples), 
                              np.where(is_major_junction == 1, np.random.uniform(1.0, 6.0, size=n_samples), 0.0))
    
    operational_noise = np.random.normal(loc=0.0, scale=1.5, size=n_samples)
    
    total_actual_duration = actual_run_time + signal_delay + cascade_delay + junction_delay + operational_noise
    total_actual_duration = np.maximum(total_actual_duration, raw_ideal_duration * 0.90)
    
    sectional_delay_min = total_actual_duration - scheduled_duration_min
    predicted_arrival_delay_min = np.maximum(0.0, current_delay + sectional_delay_min)
    
    df = pd.DataFrame({
        "distance_km": np.round(distance_km, 1),
        "scheduled_duration_min": np.round(scheduled_duration_min, 1),
        "current_delay_min": np.round(current_delay, 1),
        "train_priority_rank": train_priority,
        "max_permitted_speed_kmh": max_permitted_speed,
        "signal_aspect_code": signal_aspect,
        "active_tsr_speed_kmh": np.round(active_tsr_speed, 1),
        "weather_visibility_km": weather_visibility,
        "weather_rain_hazard": weather_rain,
        "downstream_congestion_density": np.round(downstream_congestion, 2),
        "preceding_train_delay_min": np.round(preceding_delay, 1),
        "time_of_day_hour": time_of_day_hour,
        "day_of_week": day_of_week,
        "is_major_junction": is_major_junction,
        "sectional_delay_min": np.round(sectional_delay_min, 1),
        "target_arrival_delay_min": np.round(predicted_arrival_delay_min, 1)
    })
    
    return df

def train_eta_models():
    print("================================================================================")
    print("🚆 PROJECT-KAVACH: TRAINING DYNAMIC ETA & SECTIONAL DELAY REGRESSION MODEL")
    print("================================================================================")
    
    print("\n[1/4] Generating 60,000 Indian Railways Operational Journey Samples...")
    df = generate_indian_railways_eta_dataset(n_samples=60000)
    print(f"      ✓ Dataset created: {df.shape[0]} rows, {df.shape[1]} columns")
    print(f"      ✓ Average Sectional Delay: {df['sectional_delay_min'].mean():.2f} min")
    print(f"      ✓ Average Total Arrival Delay: {df['target_arrival_delay_min'].mean():.2f} min")
    
    X = df[FEATURE_COLUMNS].copy()
    y = df["sectional_delay_min"].values
    
    print("\n[2/4] Splitting and Normalizing Features (80/20 Train-Test Split)...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42)
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    print("\n[3/4] Training Gradient Boosting Regressor Model...")
    model = GradientBoostingRegressor(
        n_estimators=120,
        learning_rate=0.1,
        max_depth=6,
        subsample=0.85,
        random_state=42
    )
    model.fit(X_train_scaled, y_train)
    
    print("\n[4/4] Evaluating Model Performance on Unseen Test Data...")
    y_pred = model.predict(X_test_scaled)
    
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    
    print("--------------------------------------------------------------------------------")
    print(f"  🏆 Model Accuracy (R² Score)  : {r2 * 100:.2f}%")
    print(f"  📉 Mean Absolute Error (MAE)  : {mae:.2f} minutes")
    print(f"  📊 Root Mean Squared Error    : {rmse:.2f} minutes")
    print("--------------------------------------------------------------------------------")
    
    importances = model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    print("\n  🔍 Top 6 Predictive Factors for ETA Delay:")
    for rank, idx in enumerate(sorted_idx[:6], 1):
        print(f"     {rank}. {FEATURE_COLUMNS[idx].ljust(30)} : {importances[idx]*100:.2f}% contribution")
    
    model_path = os.path.join(MODELS_DIR, "model_eta_predictor.joblib")
    scaler_path = os.path.join(MODELS_DIR, "scaler_eta.joblib")
    features_path = os.path.join(MODELS_DIR, "eta_feature_columns.json")
    
    joblib.dump(model, model_path)
    joblib.dump(scaler, scaler_path)
    with open(features_path, "w", encoding="utf-8") as f:
        json.dump(FEATURE_COLUMNS, f, indent=2)
        
    print(f"\n[SUCCESS] Trained ETA Model saved to: {model_path}")
    print(f"[SUCCESS] Scaler saved to: {scaler_path}")
    print(f"[SUCCESS] Feature columns saved to: {features_path}")
    print("================================================================================")
    
    return model, scaler

if __name__ == "__main__":
    train_eta_models()
