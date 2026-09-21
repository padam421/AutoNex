/**
 * PROJECT-KAVACH — AI Dynamic Cascade Delay Prediction Engine
 * Author: Padam Kishore & Team
 * Description: Calculates real-time downstream delay propagation across preceding and following
 *              coaching trains sharing the same track blocks, stations, and junction throats.
 */

class CascadePredictor {
  constructor() {
    // Standard Indian Railways automatic signaling block headway minimum buffer (minutes)
    this.DEFAULT_HEADWAY_BUFFER_MINUTES = 12.0;

    // Train Priority Precedence Weights (1: Highest -> absorbs least delay; 4: Local -> absorbs highest)
    this.PRIORITY_RESILIENCE_FACTORS = {
      1: 0.20, // Vande Bharat / Tejas (priority clearance)
      2: 0.35, // Rajdhani / Shatabdi / Duronto
      3: 0.65, // Superfast / Mail / Express
      4: 0.90  // Passenger / MEMU / Freight
    };
  }

  /**
   * Evaluates delay propagation from a leading delayed train to following trains on the same corridor.
   * @param {Object} primaryTrain - { trainId, trainName, priorityRank, currentDelayMinutes, currentStation, nextStation, corridor }
   * @param {Array} trailingTrains - Array of { trainId, trainName, priorityRank, currentDelayMinutes, currentStation, nextStation, headwayDistanceKm }
   * @returns {Object} Cascade impact report including propagated delays, affected trains, and recovery advice.
   */
  evaluateCascadePropagation(primaryTrain, trailingTrains = []) {
    if (!primaryTrain || primaryTrain.currentDelayMinutes <= 0) {
      return {
        status: "NOMINAL",
        cascadeTriggered: false,
        primaryTrainId: primaryTrain ? primaryTrain.trainId : null,
        impactedTrainsCount: 0,
        totalNetworkDelayAddedMinutes: 0,
        trailingTrainsImpact: [],
        mitigationDirective: "Normal automatic block operation. Full clearance maintained."
      };
    }

    const primaryDelay = Number(primaryTrain.currentDelayMinutes);
    const primaryPriority = Number(primaryTrain.priorityRank) || 3;
    const impactedList = [];
    let totalAddedDelay = 0;

    trailingTrains.forEach((trailing, idx) => {
      const trailingPriority = Number(trailing.priorityRank) || 3;
      const initialTrailingDelay = Number(trailing.currentDelayMinutes) || 0;
      const headwayDistance = Number(trailing.headwayDistanceKm) || (15 + idx * 12);

      // Effective headway deficit: If trailing train is within 35 km of delayed leading train
      const isWithinInterlockDistance = headwayDistance <= 35.0;
      let propagatedDelay = 0;

      if (isWithinInterlockDistance) {
        // Raw delay push
        const rawDeficit = Math.max(0, primaryDelay - (headwayDistance / 60) * 40); // 40 km/h caution deceleration
        const absorptionFactor = this.PRIORITY_RESILIENCE_FACTORS[trailingPriority] || 0.65;
        propagatedDelay = Math.round(rawDeficit * absorptionFactor);

        // Precedence Inversion: Slower/lower priority leading train holding higher priority following train
        if (primaryPriority > trailingPriority && primaryDelay >= 10) {
          propagatedDelay += 6; // Extra bottleneck penalty waiting for station loop line overtake
        }
      }

      const newProjectedDelay = initialTrailingDelay + propagatedDelay;
      totalAddedDelay += propagatedDelay;

      impactedList.push({
        trainId: trailing.trainId,
        trainName: trailing.trainName || `Train ${trailing.trainId}`,
        priorityRank: trailingPriority,
        initialDelayMinutes: initialTrailingDelay,
        propagatedDelayMinutes: propagatedDelay,
        newProjectedDelayMinutes: newProjectedDelay,
        headwayDistanceKm: headwayDistance,
        signalStatusForced: propagatedDelay > 10 ? "RED_HOLD" : propagatedDelay > 3 ? "YELLOW_RESTRICTIVE" : "DOUBLE_YELLOW",
        actionRecommended: trailingPriority < primaryPriority 
          ? `INITIATE_LEAPFROG: Loop primary train ${primaryTrain.trainId} at ${primaryTrain.nextStation || "next junction"} to release high-priority train ${trailing.trainId}`
          : `REGULATE_HEADWAY: Maintain 30 km/h caution aspect between ${trailing.currentStation || "Section"} and ${primaryTrain.currentStation || "Block"}`
      });
    });

    const isLeapfrogNeeded = impactedList.some(t => t.priorityRank < primaryPriority && t.propagatedDelayMinutes >= 5);

    return {
      status: "CASCADE_ACTIVE",
      cascadeTriggered: impactedList.length > 0 && totalAddedDelay > 0,
      primaryTrainId: primaryTrain.trainId,
      primaryTrainName: primaryTrain.trainName,
      primaryDelayMinutes: primaryDelay,
      impactedTrainsCount: impactedList.length,
      totalNetworkDelayAddedMinutes: totalAddedDelay,
      trailingTrainsImpact: impactedList,
      leapfrogRecommendation: isLeapfrogNeeded,
      mitigationDirective: isLeapfrogNeeded
        ? `HIGH PRIORITY CONFLICT: Divert leading train ${primaryTrain.trainId} to loop line at next station to prevent cascading delays to trailing express.`
        : `THROTTLED PACING: Section speed pacing recommended. Absorbed ${totalAddedDelay} mins network delay.`
    };
  }
}

module.exports = new CascadePredictor();
