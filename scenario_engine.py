"""
===============================================================================
PROJECT-KAVACH (SIH 2026): COMPLETE SCENARIO & TRACK SAFETY ENGINE
Author: Padam Kishore & Team
Description: Decision engine for:
             - Scenario 1: Superfast Speed Elevation ($\Delta V$)
             - Scenario 2: Multi-Station Local Train Leapfrogging
             - Scenario 3: Dynamic Weather & Track TSR Relaxation
             - Track Safety Engine: Baseline vs Live Structural Drift Analysis
===============================================================================
"""

import math
from typing import Dict, Any

class KavachScenarioEngine:
    def __init__(self, safety_margin_meters: float = 500.0, deceleration_coeff: float = 0.15):
        self.safety_margin_meters = safety_margin_meters
        self.mu = deceleration_coeff

        # Stored Baseline Healthy Track Parameters (Original 100% Good Track)
        self.baseline_track = {
            "vibration_rms": 0.8,
            "kurtosis": 2.2,
            "usfd_flaw_mm": 0.0,
            "laser_gauge_width_mm": 1676.0,
            "rail_temp_c": 35.0
        }

    def calculate_ebd_meters(self, speed_kmh: float) -> float:
        """Emergency Braking Distance: EBD = V^2 / (250 * mu)"""
        return (speed_kmh ** 2) / (250.0 * self.mu)

    def calculate_track_health_index(self, kurtosis: float, rail_temp: float, 
                                    usfd_flaw_mm: float, axle_load_tonnes: float) -> float:
        """Calculates Track Structural Health Index (0 - 100%)"""
        health = 100.0
        if kurtosis > 4.5:
            health -= 15.0
        if rail_temp > 60.0:
            health -= 15.0
        if usfd_flaw_mm > 0.0:
            health -= 35.0
        if axle_load_tonnes > 25.0:
            health -= 20.0
        return max(0.0, health)

    # --------------------------------------------------------------------------
    # TRACK SAFETY: BASELINE VS LIVE STRUCTURAL DRIFT ENGINE
    # --------------------------------------------------------------------------
    def inspect_longterm_track_drift(self, 
                                     live_vibration_rms: float, 
                                     live_kurtosis: float,
                                     live_usfd_flaw_mm: float,
                                     live_gauge_width_mm: float,
                                     location_km: str = "KM 245/3 (Bhopal-Itarsi)") -> Dict[str, Any]:
        """
        Compares 2-3 year old stored baseline track signature with live incoming sensor stream.
        Triggers geotagged P-Way repair notifications if structural drift exceeds safety limits.
        """
        vibration_drift = live_vibration_rms - self.baseline_track["vibration_rms"]
        kurtosis_drift = live_kurtosis - self.baseline_track["kurtosis"]
        usfd_drift = live_usfd_flaw_mm - self.baseline_track["usfd_flaw_mm"]
        gauge_drift_mm = live_gauge_width_mm - self.baseline_track["laser_gauge_width_mm"]

        damage_detected = False
        alert_level = "NORMAL_SAFE"
        recommended_action = "Routine Maintenance Logging"

        if usfd_drift > 5.0 or gauge_drift_mm > 3.0 or kurtosis_drift > 2.5:
            damage_detected = True
            alert_level = "CRITICAL_TRACK_DAMAGE"
            recommended_action = f"IMMEDIATE P-WAY DISPATCH: Repair Track at {location_km}. Risk of Derailment due to Gauge Expansion ({live_gauge_width_mm}mm) or Internal Flaw ({live_usfd_flaw_mm}mm)."
        elif kurtosis_drift > 1.5 or vibration_drift > 1.5:
            damage_detected = True
            alert_level = "WARNING_BALLAST_DEGRADATION"
            recommended_action = f"SCHEDULE TAMPING BLOCK: Ballast voiding detected at {location_km}. Schedule maintenance within 7 days."

        return {
            "location_km": location_km,
            "damage_detected": damage_detected,
            "alert_level": alert_level,
            "vibration_drift_g": round(vibration_drift, 2),
            "kurtosis_drift": round(kurtosis_drift, 2),
            "usfd_flaw_drift_mm": round(usfd_drift, 2),
            "gauge_width_drift_mm": round(gauge_drift_mm, 2),
            "pway_geotagged_notification": recommended_action
        }

    # --------------------------------------------------------------------------
    # SCENARIO 1: SUPERFAST SPEED ELEVATION
    # --------------------------------------------------------------------------
    def evaluate_scenario_1(self, local_train_id: str, superfast_train_id: str,
                            inter_train_dist_km: float, superfast_current_speed_kmh: float,
                            track_max_speed_kmh: float, sensor_kurtosis: float,
                            sensor_rail_temp: float, sensor_usfd_flaw_mm: float,
                            sensor_axle_load: float) -> Dict[str, Any]:
        tshi = self.calculate_track_health_index(sensor_kurtosis, sensor_rail_temp, 
                                                  sensor_usfd_flaw_mm, sensor_axle_load)

        ebd_superfast = self.calculate_ebd_meters(track_max_speed_kmh)
        ebd_local = self.calculate_ebd_meters(60.0)
        safe_headway_km = (ebd_superfast + ebd_local + self.safety_margin_meters) / 1000.0

        track_certified = (tshi >= 85.0 and sensor_rail_temp < 55.0 and sensor_usfd_flaw_mm == 0.0)

        if track_certified and superfast_current_speed_kmh < track_max_speed_kmh:
            target_speed = track_max_speed_kmh
            delta_v = target_speed - superfast_current_speed_kmh
            time_saved_mins = (inter_train_dist_km * ((1.0 / superfast_current_speed_kmh) - (1.0 / target_speed))) * 60.0
            reduced_dwell_mins = max(3.0, 35.0 - time_saved_mins)

            return {
                "scenario_name": "Scenario 1: Superfast Speed Elevation & Cab Sync",
                "authorized": True,
                "track_health_index_pct": tshi,
                "current_superfast_speed_kmh": superfast_current_speed_kmh,
                "authorized_superfast_speed_kmh": target_speed,
                "speed_elevation_delta_kmh": delta_v,
                "inter_train_distance_km": inter_train_dist_km,
                "safe_headway_km": round(safe_headway_km, 2),
                "local_dwell_time_mins": round(reduced_dwell_mins, 1),
                "time_saved_mins": round(time_saved_mins, 1),
                "cab_message_local": f"Superfast {superfast_train_id} approaching at {target_speed}km/h. Live Gap: {inter_train_dist_km}km. Prepare for 3-min loop clearance.",
                "cab_message_superfast": f"Track Certified Safe (TSHI {tshi}%). Elevate Speed to {target_speed}km/h (+{delta_v}km/h). Clear Path Ahead."
            }
        else:
            return {
                "scenario_name": "Scenario 1: Superfast Speed Elevation",
                "authorized": False,
                "reason": "Track Health below threshold or Superfast already at max speed",
                "track_health_index_pct": tshi
            }

    # --------------------------------------------------------------------------
    # SCENARIO 2: MULTI-STATION LEAPFROGGING
    # --------------------------------------------------------------------------
    def evaluate_scenario_2(self, local_train_id: str, superfast_train_id: str,
                            station_a_name: str, station_b_name: str,
                            inter_station_dist_km: float, inter_train_dist_km: float,
                            local_speed_kmh: float = 60.0, superfast_speed_kmh: float = 100.0,
                            safety_buffer_mins: float = 5.0) -> Dict[str, Any]:
        t_local_ab_mins = (inter_station_dist_km / local_speed_kmh) * 60.0 + 3.0
        t_superfast_to_b_mins = ((inter_train_dist_km + inter_station_dist_km) / superfast_speed_kmh) * 60.0
        available_margin_mins = t_superfast_to_b_mins - t_local_ab_mins

        if available_margin_mins >= safety_buffer_mins:
            total_delay_saved = max(0.0, 35.0 - 4.0)
            return {
                "scenario_name": "Scenario 2: Multi-Station Leapfrog Dispatch",
                "authorized": True,
                "origin_station": station_a_name,
                "destination_station": station_b_name,
                "inter_station_distance_km": inter_station_dist_km,
                "inter_train_distance_km": inter_train_dist_km,
                "local_traversal_time_mins": round(t_local_ab_mins, 1),
                "superfast_arrival_b_mins": round(t_superfast_to_b_mins, 1),
                "safety_margin_mins": round(available_margin_mins, 1),
                "idle_delay_saved_mins": round(total_delay_saved, 1),
                "dispatch_command": f"ADVANCE_LOCAL_TO_{station_b_name.upper()}",
                "cab_message_local": f"Safe {round(available_margin_mins,1)}-min gap available. Proceed immediately from {station_a_name} to {station_b_name} Loop Line.",
                "station_master_notice": f"Signal Override Authorized: Advance {local_train_id} to {station_b_name}. Avoid 35-min delay at {station_a_name}."
            }
        else:
            return {
                "scenario_name": "Scenario 2: Multi-Station Leapfrog Dispatch",
                "authorized": False,
                "reason": "Insufficient safety buffer to reach next station",
                "available_margin_mins": round(available_margin_mins, 1)
            }

    # --------------------------------------------------------------------------
    # SCENARIO 3: DYNAMIC TSR RELAXATION (WEATHER & CLEARANCE SPEED BOOST)
    # --------------------------------------------------------------------------
    def evaluate_scenario_3(self, train_id: str, section_name: str,
                            current_restricted_speed_kmh: float,
                            visibility_meters: float,
                            sensor_kurtosis: float,
                            sensor_usfd_flaw_mm: float) -> Dict[str, Any]:
        """
        SCENARIO 3: Dynamic Weather & Track Temporary Speed Restriction (TSR) Relaxation.
        Relaxes 30km/h restrictions to 75-110km/h as weather/track clears, beaming digital orders to cab.
        """
        weather_clear = visibility_meters > 1000.0
        track_clear = (sensor_kurtosis < 3.5 and sensor_usfd_flaw_mm == 0.0)

        if weather_clear and track_clear and current_restricted_speed_kmh < 75.0:
            new_authorized_speed = 110.0 if visibility_meters > 3000.0 else 75.0
            time_saved_per_section_mins = 22.5

            return {
                "scenario_name": "Scenario 3: Dynamic TSR Restriction Relaxation",
                "authorized": True,
                "section_name": section_name,
                "old_restricted_speed_kmh": current_restricted_speed_kmh,
                "new_authorized_speed_kmh": new_authorized_speed,
                "visibility_m": visibility_meters,
                "time_saved_per_train_mins": time_saved_per_section_mins,
                "digital_caution_order": f"TSR RELAXED AT {section_name.upper()}: Speed authorized up to {new_authorized_speed}km/h (Visibility {visibility_meters}m). Paper T/409 order cancelled."
            }
        else:
            return {
                "scenario_name": "Scenario 3: Dynamic TSR Restriction Relaxation",
                "authorized": False,
                "reason": "Visibility or Track Condition still requires restriction"
            }

if __name__ == "__main__":
    engine = KavachScenarioEngine()
    print("--- TESTING TRACK STRUCTURAL DRIFT INSPECTION ---")
    drift = engine.inspect_longterm_track_drift(
        live_vibration_rms=3.2, live_kurtosis=4.8, live_usfd_flaw_mm=12.5,
        live_gauge_width_mm=1679.8, location_km="KM 245/3 (Bhopal-Itarsi)"
    )
    print(drift)
