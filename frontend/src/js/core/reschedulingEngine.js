/**
 * PROJECT-KAVACH — AI Dynamic Train Rescheduling & Timetable Mitigation Engine
 * Generates Root-Cause Delay Categorizations, Actionable Recovery Directives,
 * Multi-Train Dependency Cascades, and Real-Time Chart Telemetry.
 */

(function (window) {
  "use strict";

  const ReschedulingEngine = {
    liveEngine: null,
    appliedSolutions: {}, // trainNumber -> { solutionId, appliedAt, savedMinutes }

    init: function (liveTrainEngine) {
      this.liveEngine = liveTrainEngine || window.LiveTrainEngine;
      console.log("[ReschedulingEngine] Initialized with LiveTrainEngine integration");
    },

    /**
     * Generate realistic IR root causes for a train's delay
     */
    generateDelayReasons: function (trainStatus) {
      if (!trainStatus) return [];
      const delay = trainStatus.delayMinutes || 0;
      const currentStation = (trainStatus.currentStation && trainStatus.currentStation.name) || "Section Block";
      const nextStation = (trainStatus.nextStation && trainStatus.nextStation.name) || "Upcoming Junction";
      const trainNum = trainStatus.trainNumber || "Train";

      const reasons = [];

      if (delay > 0) {
        // Reason 1: Traffic / Headway Conflict
        const precedingMins = Math.max(8, Math.min(22, Math.round(delay * 0.45)));
        reasons.push({
          id: "traffic_preceding",
          category: "Traffic Headway",
          icon: "fa-solid fa-traffic-light",
          color: "#ea580c",
          bg: "#fff7ed",
          border: "#ffedd5",
          severity: delay > 25 ? "CRITICAL" : "MODERATE",
          description: `Preceding rake on ${currentStation}–${nextStation} block running with +${Math.round(delay * 0.4)}m headway deficit. Automatic block signaling spacing forced 15 km/h restrictive aspects.`,
          location: `${currentStation} Outer Block`,
          timeImpact: `+${precedingMins} min`
        });

        // Reason 2: Junction Interlocking / Route Contention
        if (delay >= 12) {
          const junctionMins = Math.max(5, Math.min(18, Math.round(delay * 0.35)));
          reasons.push({
            id: "junction_interlocking",
            category: "Route Interlocking",
            icon: "fa-solid fa-code-fork",
            color: "#dc2626",
            bg: "#fef2f2",
            border: "#fee2e2",
            severity: "HIGH",
            description: `Route interlocking lock at ${nextStation} Junction throat due to cross-movement conflict with incoming Freight Special.`,
            location: `${nextStation} Jn Throat`,
            timeImpact: `+${junctionMins} min`
          });
        }

        // Reason 3: Track Caution Order / TSR
        const tsrMins = Math.max(3, delay - (reasons.reduce((acc, r) => acc + parseInt(r.timeImpact), 0)));
        if (tsrMins > 0) {
          reasons.push({
            id: "tsr_caution",
            category: "Track Speed Restriction",
            icon: "fa-solid fa-triangle-exclamation",
            color: "#d97706",
            bg: "#fffbeb",
            border: "#fef3c7",
            severity: "MINOR",
            description: `Permanent Way engineering work between ${currentStation} and ${nextStation}. 30 km/h Temporary Speed Restriction (TSR) enforced via Kavach RFID transponder.`,
            location: `Km 384/12 – 391/04`,
            timeImpact: `+${tsrMins} min`
          });
        }
      } else {
        reasons.push({
          id: "nominal",
          category: "Nominal Running",
          icon: "fa-solid fa-circle-check",
          color: "#16a34a",
          bg: "#f0fdf4",
          border: "#dcfce7",
          severity: "OPTIMAL",
          description: "Operating precisely according to scheduled timetable with full Kavach cab signal clearance.",
          location: `${currentStation}–${nextStation}`,
          timeImpact: "0 min (On Time)"
        });
      }

      return reasons;
    },

    /**
     * Propose 2 to 3 actionable AI dispatch solutions
     */
    generateProposedSolutions: function (trainStatus, delayReasons) {
      if (!trainStatus) return [];
      const delay = trainStatus.delayMinutes || 0;
      const currentStation = (trainStatus.currentStation && trainStatus.currentStation.name) || "Current";
      const nextStation = (trainStatus.nextStation && trainStatus.nextStation.name) || "Next Junction";
      const isApplied = !!this.appliedSolutions[trainStatus.trainNumber];

      if (delay <= 0) {
        return [{
          id: "maintain_pace",
          title: "Maintain Nominal Speed Profile",
          action: "Continue standard sectional cruise velocity with SIL-4 Kavach supervision.",
          timeSaved: 0,
          risk: "LOW",
          isApplied: false,
          impactSummary: "Schedule maintained at 100% punctuality."
        }];
      }

      const sol1Saved = Math.min(delay, Math.max(6, Math.round(delay * 0.45)));
      const sol2Saved = Math.min(delay, Math.max(8, Math.round(delay * 0.65)));
      const sol3Saved = Math.min(delay, Math.max(4, Math.round(delay * 0.30)));

      return [
        {
          id: "sol_loop_overtake",
          title: `Loop Line Precedence Overtake at ${nextStation}`,
          action: `Divert trailing freight/slower rake to Loop Line 2 at ${nextStation} station. Authorize high-speed green passage on Main Line.`,
          timeSaved: sol2Saved,
          risk: "MEDIUM",
          riskBadgeBg: "#fef3c7",
          riskBadgeText: "#b45309",
          isApplied: isApplied && this.appliedSolutions[trainStatus.trainNumber].solutionId === "sol_loop_overtake",
          impactSummary: `Recovers +${sol2Saved} mins. Eliminates junction throttle deadlock for 2 downstream trains.`
        },
        {
          id: "sol_speed_corridor",
          title: `Kavach High-Speed Green Wave (+15 km/h cruise)`,
          action: `Leverage Kavach automatic cab signaling to elevate cruise speed from 100 km/h to 115 km/h along the 62 km clear block section.`,
          timeSaved: sol1Saved,
          risk: "LOW",
          riskBadgeBg: "#dcfce7",
          riskBadgeText: "#15803d",
          isApplied: isApplied && this.appliedSolutions[trainStatus.trainNumber].solutionId === "sol_speed_corridor",
          impactSummary: `Recovers +${sol1Saved} mins smoothly without braking strain or fuel surge.`
        },
        {
          id: "sol_platform_swap",
          title: `Dynamic Platform Reassignment at ${nextStation}`,
          action: `Re-route rake arrival to Platform 1 instead of Platform 4 to circumvent outer throat route lock.`,
          timeSaved: sol3Saved,
          risk: "LOW",
          riskBadgeBg: "#dcfce7",
          riskBadgeText: "#15803d",
          isApplied: isApplied && this.appliedSolutions[trainStatus.trainNumber].solutionId === "sol_platform_swap",
          impactSummary: `Recovers +${sol3Saved} mins. Cuts platform waiting halt to standard 2-minute dwell.`
        }
      ];
    },

    /**
     * Apply a proposed solution to a train and calculate network cascade impact
     */
    applySolution: function (trainNumber, solutionId, timeSaved) {
      this.appliedSolutions[trainNumber] = {
        solutionId,
        appliedAt: new Date(),
        savedMinutes: timeSaved || 12
      };
      return this.appliedSolutions[trainNumber];
    },

    /**
     * Compute multi-train cascade impact for a train
     */
    getDependencyCascade: function (trainStatus, savedMinutes) {
      if (!trainStatus) return [];
      const origin = trainStatus.origin || "NDLS";
      const dest = trainStatus.destination || "HWH";
      const delay = trainStatus.delayMinutes || 0;
      const baseSaved = savedMinutes || Math.max(5, Math.round(delay * 0.5));

      // Simulated realistic downstream trains sharing the corridor
      const downstreamTrainCandidates = [
        { number: "12419", name: "Gomti Express", segment: `${origin}–CNB Corridor`, baseDelay: Math.max(8, delay - 4) },
        { number: "12391", name: "Shramjeevi Express", segment: `CNB–DDU Section`, baseDelay: Math.max(6, delay - 7) },
        { number: "12565", name: "Bihar Sampark Kranti", segment: `DDU–GKP Link`, baseDelay: Math.max(5, delay - 9) },
        { number: "12875", name: "Neelanchal SF Exp", segment: `Section Main Line`, baseDelay: Math.max(3, delay - 12) }
      ];

      return downstreamTrainCandidates.map((tr, idx) => {
        const cascadeReduction = Math.max(2, Math.round(baseSaved * (0.7 - idx * 0.15)));
        const postDelay = Math.max(0, tr.baseDelay - cascadeReduction);
        return {
          number: tr.number,
          name: tr.name,
          segment: tr.segment,
          initialDelay: tr.baseDelay,
          cascadeReduction,
          finalDelay: postDelay,
          status: postDelay === 0 ? "FULLY STABILIZED" : "DELAY REDUCED"
        };
      });
    },

    /**
     * Generate Chart.js data packages for selected train
     */
    generateReschedulingChartsData: function (trainStatus, solution) {
      if (!trainStatus) return null;
      const stations = trainStatus.stations || [];
      const labels = stations.length > 0 ? stations.map(s => s.code) : ["ORIGIN", "STN 1", "STN 2", "STN 3", "DEST"];
      const currentDelayPoints = stations.length > 0 ? stations.map(s => s.delayMinutes) : [0, 8, 15, 22, 19];
      
      const savedMinutes = solution ? solution.timeSaved : Math.round((trainStatus.delayMinutes || 15) * 0.5);

      // 1. Recovery Curve: delay recovering towards 0
      const recoveredDelayPoints = currentDelayPoints.map((d, i) => {
        const recoveryProgress = i / Math.max(1, currentDelayPoints.length - 1);
        const red = Math.round(savedMinutes * recoveryProgress);
        return Math.max(0, d - red);
      });

      // 2. Speed Profile: current vs optimized speed
      const baseCruise = trainStatus.maxCruiseSpeed || 110;
      const currentSpeedProfile = labels.map((_, i) => (i === 0 || i === labels.length - 1) ? 0 : Math.round(baseCruise * 0.85));
      const optimizedSpeedProfile = labels.map((_, i) => (i === 0 || i === labels.length - 1) ? 0 : Math.min(130, Math.round(baseCruise * 1.05)));

      // 3. Downstream impact cascade bar
      const cascade = this.getDependencyCascade(trainStatus, savedMinutes);
      const cascadeLabels = cascade.map(c => `#${c.number} ${c.name}`);
      const cascadeReductions = cascade.map(c => c.cascadeReduction);

      // 4. Solutions comparison horizontal bar
      const proposed = this.generateProposedSolutions(trainStatus, []);
      const solLabels = proposed.map(s => s.title.split(" ")[0] + " " + (s.title.split(" ")[1] || ""));
      const solSavings = proposed.map(s => s.timeSaved);

      return {
        labels,
        currentDelayPoints,
        recoveredDelayPoints,
        currentSpeedProfile,
        optimizedSpeedProfile,
        cascadeLabels,
        cascadeReductions,
        solLabels,
        solSavings,
        savedMinutes
      };
    },

    /**
     * Global network-wide rescheduling statistics
     */
    getReschedulingNetworkStats: function () {
      const appliedCount = Object.keys(this.appliedSolutions).length;
      let totalMinutesSaved = 0;
      for (const k in this.appliedSolutions) {
        totalMinutesSaved += (this.appliedSolutions[k].savedMinutes || 0);
      }

      return {
        appliedCount,
        totalMinutesSaved: totalMinutesSaved + 48, // Base network cumulative
        stabilizedTrains: appliedCount * 3 + 14,
        networkEfficiencyScore: Math.min(99.4, 91.2 + (appliedCount * 1.5)).toFixed(1)
      };
    }
  };

  window.ReschedulingEngine = ReschedulingEngine;
})(window);
