"""
===============================================================================
PROJECT-KAVACH (SIH 2026): STEP 4 - DUAL AI MODEL TRAINING & SERIALIZATION
Author: Padam Kishore & Team
Description: Trains Random Forest & XGBoost Models for Track Defect Classification
             and Scenario Dispatch Optimization (Scenarios 1, 2, 3).
===============================================================================
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from scenario_engine import KavachScenarioEngine

class KavachModelTrainer:
    """
    Step 4 Pipeline:
    1. Trains Model 1 (Track Structural Defect Predictor)
    2. Trains Model 2 (Scenario 1, 2, 3 Dispatch Optimizer)
    3. Evaluates Model Performance (Accuracy, Precision, Recall)
    4. Serializes Trained Weights to joblib Files
    """

    def __init__(self, models_dir: str = "./models"):
        self.models_dir = models_dir
        os.makedirs(self.models_dir, exist_ok=True)
        self.scenario_engine = KavachScenarioEngine()

        self.model_defect = None
        self.model_dispatch = None

    def train_and_evaluate(self, X_train_scaled, X_test_scaled, 
                           y_train_def, y_test_def, 
                           y_train_scen, y_test_scen):
        """
        Executes Step 4 Model Training on Scaled Data.
        """
        print("==========================================================================================")
        print("[TRAINING] STEP 4A: TRAINING MODEL 1 (TRACK STRUCTURAL DEFECT CLASSIFIER)")
        print("==========================================================================================")

        # Model 1: Random Forest Defect Classifier
        self.model_defect = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
        self.model_defect.fit(X_train_scaled, y_train_def)
        
        y_pred_def = self.model_defect.predict(X_test_scaled)
        acc_def = accuracy_score(y_test_def, y_pred_def)

        print(f"  [METRICS] Model 1 Defect Accuracy: {acc_def * 100:.2f}%")
        print("\n  Classification Report (Track Defects):")
        print(classification_report(y_test_def, y_pred_def, target_names=["Safe", "Monitor", "Warning", "Critical"]))

        print("==========================================================================================")
        print("[TRAINING] STEP 4B: TRAINING MODEL 2 (SCENARIO 1, 2, 3 DISPATCH OPTIMIZER)")
        print("==========================================================================================")

        # Model 2: Scenario Dispatch Optimizer
        self.model_dispatch = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
        self.model_dispatch.fit(X_train_scaled, y_train_scen)
        
        y_pred_scen = self.model_dispatch.predict(X_test_scaled)
        acc_scen = accuracy_score(y_test_scen, y_pred_scen)

        print(f"  [METRICS] Model 2 Dispatch Accuracy: {acc_scen * 100:.2f}%")
        print("\n  Classification Report (Dispatch Scenarios):")
        print(classification_report(y_test_scen, y_pred_scen, target_names=["Safety Hold", "Scenario 1 (Speed Up)", "Scenario 2 (Leapfrog)"]))

        print("==========================================================================================")
        print("[SERIALIZATION] STEP 4C: SAVING TRAINED MODELS (.joblib Export)")
        print("==========================================================================================")

        path_defect = os.path.join(self.models_dir, "model_defect.joblib")
        path_dispatch = os.path.join(self.models_dir, "model_dispatch.joblib")

        joblib.dump(self.model_defect, path_defect)
        joblib.dump(self.model_dispatch, path_dispatch)

        print(f"[SUCCESS] Model 1 saved to: {path_defect}")
        print(f"[SUCCESS] Model 2 saved to: {path_dispatch}")

        print("\n[COMPLETE] STEP 4 COMPLETE! AI Models are Trained, Evaluated & Saved!")
        return acc_def, acc_scen

if __name__ == "__main__":
    from data_manager import KavachMasterDataManager
    from colab_step2_data_cleaning import KavachDataCleanerAndFeatureEngine
    from colab_step3_split_and_scaling import KavachDataSplitterAndScaler

    # Ingest 50,000 dataset samples with true RDSO target labels
    manager = KavachMasterDataManager()
    df_raw = manager.build_complete_master_dataset(n_samples=50000)

    cleaner = KavachDataCleanerAndFeatureEngine()
    df_engineered = cleaner.transform_pipeline(df_raw)

    splitter = KavachDataSplitterAndScaler()
    data_dict = splitter.split_and_scale(df_engineered)

    trainer = KavachModelTrainer()
    trainer.train_and_evaluate(
        data_dict["X_train_scaled"], data_dict["X_test_scaled"],
        data_dict["y_train_defect"], data_dict["y_test_defect"],
        data_dict["y_train_scenario"], data_dict["y_test_scenario"]
    )
