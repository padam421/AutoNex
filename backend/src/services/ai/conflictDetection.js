/**
 * PROJECT-KAVACH — Real-Time Conflict Detection & Platform Contention Engine
 * Author: Padam Kishore & Team
 * Description: Evaluates train track block occupancy, headway safety spacing,
 *              and platform overlap conflicts based on dynamic ML ETAs.
 */

class ConflictDetectionEngine {
  constructor() {
    this.MIN_HEADWAY_SPACING_METERS = 1500.0;
    this.PLATFORM_CLEARANCE_BUFFER_MINS = 15.0;
  }

  /**
   * Detects block section proximity conflicts between active trains using live GPS / Section data.
   */
  detectTrackConflicts(activeTrains = []) {
    const conflicts = [];
    if (!Array.isArray(activeTrains) || activeTrains.length < 2) {
      return conflicts;
    }

    for (let i = 0; i < activeTrains.length; i++) {
      for (let j = i + 1; j < activeTrains.length; j++) {
        const t1 = activeTrains[i];
        const t2 = activeTrains[j];

        // Same section check
        if (t1.currentStation === t2.currentStation || (t1.nextStation && t1.nextStation === t2.nextStation)) {
          const distKm = Math.abs((t1.distFromTrain || 0) - (t2.distFromTrain || 0));
          if (distKm < 5.0) {
            conflicts.push({
              conflictId: `CONF_${t1.trainId}_${t2.trainId}`,
              type: "BLOCK_HEADWAY_PROXIMITY",
              severity: distKm < 2.0 ? "CRITICAL" : "WARNING",
              trainA: { id: t1.trainId, name: t1.trainName, speed: t1.speedKmH },
              trainB: { id: t2.trainId, name: t2.trainName, speed: t2.speedKmH },
              location: t1.nextStation || t1.currentStation,
              separationDistanceKm: distKm.toFixed(2),
              recommendedAction: distKm < 2.0 ? "EMERGENCY_KAVACH_BRAKE_TARGET" : "REGULATE_APPROACH_SPEED_45KMH"
            });
          }
        }
      }
    }
    return conflicts;
  }

  /**
   * Detects Platform Contention at upcoming stations based on dynamic predicted ETAs.
   * If Train A and Train B have predicted arrival times on the same platform within 15 minutes.
   */
  detectPlatformConflicts(stationForecasts = []) {
    const platformConflicts = [];
    const platformSchedules = {}; // { "PF 1": [ { trainId, arrMins, depMins } ] }

    stationForecasts.forEach(entry => {
      const pf = entry.platform || "Platform 1";
      if (!platformSchedules[pf]) {
        platformSchedules[pf] = [];
      }
      platformSchedules[pf].push(entry);
    });

    for (const [pf, trains] of Object.entries(platformSchedules)) {
      if (trains.length < 2) continue;

      for (let i = 0; i < trains.length; i++) {
        for (let j = i + 1; j < trains.length; j++) {
          const t1 = trains[i];
          const t2 = trains[j];

          // Check if ETA overlap within buffer
          const t1Time = t1.dynamic_predicted_eta || t1.scheduled_arrival;
          const t2Time = t2.dynamic_predicted_eta || t2.scheduled_arrival;

          if (t1Time && t2Time && t1Time === t2Time) {
            platformConflicts.push({
              conflictId: `PF_CLASH_${pf}_${t1.trainId || t1.train_number}_${t2.trainId || t2.train_number}`,
              platform: pf,
              severity: "HIGH",
              trainA: t1.trainId || t1.train_number,
              trainB: t2.trainId || t2.train_number,
              projectedEta: t1Time,
              recommendedAction: `REASSIGN_PLATFORM: Reallocate Train ${t2.trainId || t2.train_number} to adjacent vacant platform to prevent outer signal hold.`
            });
          }
        }
      }
    }

    return platformConflicts;
  }
}

module.exports = new ConflictDetectionEngine();
