/**
 * PROJECT-KAVACH — Traction Energy & Fuel Optimization Service
 * Author: Padam Kishore & Team
 * Description: Computes optimal train driving profiles (coasting, acceleration,
 *              regenerative braking energy recovery) to minimize kWh power consumption.
 */

class FuelOptimizationEngine {
  constructor() {
    this.DAVIS_A = 1.30; // Rolling friction parameter
    this.DAVIS_B = 0.01; // Mechanical drag parameter
    this.DAVIS_C = 0.00034; // Aerodynamic drag parameter
  }

  /**
   * Calculates regenerative braking energy return and fuel savings for an active trip.
   */
  calculateEnergySavings(params = {}) {
    const grossWeightTonnes = Number(params.grossWeightTonnes || 950.0);
    const speedKmh = Number(params.speedKmh || 110.0);
    const distanceKm = Number(params.distanceKm || 45.0);
    const delayMinutes = Number(params.delayMinutes || 0);

    // Kinetic Energy E = 0.5 * m * v^2
    const speedMs = speedKmh / 3.6;
    const kineticEnergyJoules = 0.5 * (grossWeightTonnes * 1000) * (speedMs * speedMs);
    const kineticEnergyKWh = kineticEnergyJoules / 3.6e6;

    // 3-Phase AC Traction Regenerative Braking Efficiency (~38-42% recovery back to 25kV OHE line)
    const regenEfficiency = 0.40;
    const recoveredEnergyKWh = Math.round(kineticEnergyKWh * regenEfficiency * 10) / 10;

    // Diesel equivalent savings (1 kWh ~ 0.25 L diesel equivalent)
    const dieselSavedLiters = Math.round(recoveredEnergyKWh * 0.24 * 10) / 10;

    // Financial saving in INR (avg IR traction electricity cost ₹7.20 / unit)
    const costSavedINR = Math.round(recoveredEnergyKWh * 7.20);

    return {
      status: "OPTIMAL",
      speedKmh: speedKmh,
      distanceKm: distanceKm,
      grossWeightTonnes: grossWeightTonnes,
      kineticEnergyKWh: Math.round(kineticEnergyKWh),
      regenerativeEnergyRecoveredKWh: recoveredEnergyKWh,
      dieselEquivalentSavedLiters: dieselSavedLiters,
      costSavingsINR: costSavedINR,
      recommendedThrottleProfile: delayMinutes > 15 ? "STEP_MAX_POWER_ACCEL" : "ENERGY_OPTIMAL_COASTING",
      cabAdvice: delayMinutes > 15
        ? "Priority schedule recovery: Apply 85% continuous traction power on flat section."
        : "Energy saving active: Coast train on down-gradients to capture regenerative grid power."
    };
  }
}

module.exports = new FuelOptimizationEngine();
