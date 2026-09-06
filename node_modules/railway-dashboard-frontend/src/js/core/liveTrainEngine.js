/**
 * PROJECT-KAVACH — Live Cyclic Train Simulation & Delay Analytics Engine
 * Real-Time IST Integration, Deceleration/Acceleration Physics, Deterministic Mathematical Delay Modeling
 * All Times in 12-Hour AM/PM Format
 */

(function (window) {
  "use strict";

  const LiveTrainEngine = {
    // Reference to loaded datasets (injected or retrieved from window/dashboard)
    trains: [],
    schedules: {},
    stations: [],
    delayModel: null,

    // Configuration
    config: {
      timeOffsetMs: 0, // Allows custom testing or time shifts, default 0 (live IST)
      speedTickIntervalMs: 1000,
    },

    /**
     * Initialize datasets for the engine
     */
    init: function (trainDatabase, schedulesIndex, stationsList, delayData) {
      if (Array.isArray(trainDatabase)) this.trains = trainDatabase;
      if (schedulesIndex && typeof schedulesIndex === "object") this.schedules = schedulesIndex;
      if (Array.isArray(stationsList)) this.stations = stationsList;
      if (delayData) this.delayModel = delayData;
      console.log(`[LiveTrainEngine] Initialized with ${this.trains.length} trains, ${Object.keys(this.schedules).length} schedules`);
    },

    /**
     * Get Current Real-Time Indian Standard Time (IST: UTC + 5:30)
     */
    getISTTime: function () {
      const now = new Date(Date.now() + this.config.timeOffsetMs);
      // IST is UTC + 5h 30m
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const ist = new Date(utc + (3600000 * 5.5));
      return ist;
    },

    /**
     * Format any Date or "HH:MM" string into 12-Hour AM/PM Format
     * Example: "14:35" -> "02:35 PM", "05:05" -> "05:05 AM", "--" -> "--"
     */
    formatAMPM: function (timeInput) {
      if (!timeInput || timeInput === "--" || timeInput === "-") return "--";

      if (timeInput instanceof Date) {
        let hours = timeInput.getHours();
        let minutes = timeInput.getMinutes();
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12; // '0' becomes '12'
        const strMin = minutes < 10 ? "0" + minutes : minutes;
        const strHrs = hours < 10 ? "0" + hours : hours;
        return `${strHrs}:${strMin} ${ampm}`;
      }

      if (typeof timeInput === "string") {
        // If already in AM/PM format
        if (timeInput.toUpperCase().includes("AM") || timeInput.toUpperCase().includes("PM")) {
          return timeInput;
        }

        const parts = timeInput.trim().split(":");
        if (parts.length >= 2) {
          let hours = parseInt(parts[0], 10);
          let minutes = parseInt(parts[1], 10);
          if (isNaN(hours) || isNaN(minutes)) return timeInput;

          const ampm = hours >= 12 ? "PM" : "AM";
          hours = hours % 12;
          hours = hours ? hours : 12;
          const strMin = minutes < 10 ? "0" + minutes : minutes;
          const strHrs = hours < 10 ? "0" + hours : hours;
          return `${strHrs}:${strMin} ${ampm}`;
        }
      }

      return String(timeInput);
    },

    /**
     * Format Date to "DD-MMM-YYYY (Day)"
     */
    formatDateDisplay: function (date) {
      if (!date) return "";
      const d = date instanceof Date ? date : new Date(date);
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const dayName = days[d.getDay()];
      const day = String(d.getDate()).padStart(2, "0");
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day}-${month}-${year} (${dayName})`;
    },

    /**
     * Stable 32-bit Integer Hash for Seeded Determinism
     */
    hashString: function (str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
      }
      return Math.abs(hash);
    },

    /**
     * Seeded pseudo-random float generator [0, 1)
     */
    seededRandom: function (seed) {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    },

    /**
     * Parse schedule station time into full Date relative to journey start date
     * @param {string} timeStr - "HH:MM" or "--"
     * @param {number} dayNumber - 1, 2, 3... day of journey
     * @param {Date} journeyStartDate - Base date when train departed origin
     */
    parseScheduleDateTime: function (timeStr, dayNumber, journeyStartDate) {
      if (!timeStr || timeStr === "--") return null;
      const parts = timeStr.trim().split(":");
      if (parts.length < 2) return null;

      const hrs = parseInt(parts[0], 10);
      const mins = parseInt(parts[1], 10);
      if (isNaN(hrs) || isNaN(mins)) return null;

      const dt = new Date(journeyStartDate);
      // Reset hours to 0
      dt.setHours(hrs, mins, 0, 0);
      // Add day offset (day 1 = 0 extra days, day 2 = +1 extra day)
      const dayOffset = Math.max(0, (dayNumber || 1) - 1);
      dt.setDate(dt.getDate() + dayOffset);
      return dt;
    },

    /**
     * Parse maximum permissible cruise speed from speed string (e.g. "110-130 km/h" -> 120, "160 km/h" -> 160)
     */
    parseCruiseSpeed: function (train) {
      if (!train) return 100;
      const type = (train.type || "").toLowerCase();
      const name = (train.name || "").toLowerCase();

      if (name.includes("vande") || type.includes("vande")) return 160;
      if (name.includes("rajdhani") || type.includes("rajdhani")) return 130;
      if (name.includes("shatabdi") || type.includes("shatabdi")) return 130;
      if (name.includes("tejas") || type.includes("tejas")) return 130;
      if (type.includes("superfast")) return 110;
      if (type.includes("express") || type.includes("mail")) return 90;
      if (type.includes("passenger") || type.includes("local") || type.includes("dmu")) return 70;

      if (train.speed) {
        const matches = train.speed.match(/\d+/g);
        if (matches && matches.length >= 2) {
          return Math.round((parseInt(matches[0], 10) + parseInt(matches[1], 10)) / 2);
        } else if (matches && matches.length === 1) {
          return parseInt(matches[0], 10);
        }
      }
      return 100;
    },

    /**
     * Realistic Indian Railway Speed Physics:
     * - Stopped at station platform: 0 km/h
     * - Within 2.5 km of next station: decelerates smoothly to ~15 km/h
     * - Within 2.0 km after leaving last station: accelerates from ~15 km/h up to cruise speed
     * - Mid-section cruising: holds cruise speed with small dynamic track variation
     */
    calculateSpeedPhysics: function (params) {
      const {
        isHalted,
        distFromLastStationKm,
        distToNextStationKm,
        maxCruiseSpeed,
        seed = 42
      } = params;

      if (isHalted) return 0;

      const decelDistanceKm = 2.5; // Deceleration starts 2.5km before station
      const accelDistanceKm = 2.0; // Acceleration takes 2km after departing station
      const minApproachSpeed = 15;  // Slows down to 15 km/h as it approaches platform

      // Approaching next station (Deceleration)
      if (distToNextStationKm <= decelDistanceKm && distToNextStationKm >= 0) {
        const progress = Math.max(0, Math.min(1, distToNextStationKm / decelDistanceKm));
        // Quadratic deceleration curve
        const speed = minApproachSpeed + (maxCruiseSpeed - minApproachSpeed) * Math.pow(progress, 1.4);
        return Math.round(speed);
      }

      // Departing previous station (Acceleration)
      if (distFromLastStationKm <= accelDistanceKm && distFromLastStationKm >= 0) {
        const progress = Math.max(0, Math.min(1, distFromLastStationKm / accelDistanceKm));
        // Smooth logarithmic/quadratic acceleration
        const speed = minApproachSpeed + (maxCruiseSpeed - minApproachSpeed) * Math.sqrt(progress);
        return Math.round(speed);
      }

      // Cruising between stations: dynamic micro-fluctuation (±3 km/h) based on time & seed
      const timeJitter = Math.sin((Date.now() / 15000) + seed) * 3;
      const speed = Math.max(minApproachSpeed, Math.min(maxCruiseSpeed, Math.round(maxCruiseSpeed + timeJitter)));
      return speed;
    },

    /**
     * Mathematical Deterministic Delay Calculation:
     * Generates exact, repeatable delays for every train based on date, train number, distance, and congestion
     */
    computeStationDelays: function (train, scheduleStations, journeyDate) {
      if (!scheduleStations || scheduleStations.length === 0) return [];
      const dateKey = journeyDate.toISOString().slice(0, 10);
      const seedStr = `${train.number || 'TR'}_${dateKey}`;
      const baseSeed = this.hashString(seedStr);

      const totalDist = scheduleStations[scheduleStations.length - 1].dist || 1000;
      const trainType = (train.type || 'Express').toLowerCase();

      // Train type base punctuality weight
      let punctualityWeight = 0.5; // default
      if (trainType.includes('vande')) punctualityWeight = 0.15; // very punctual
      else if (trainType.includes('rajdhani') || trainType.includes('shatabdi')) punctualityWeight = 0.25;
      else if (trainType.includes('superfast')) punctualityWeight = 0.45;
      else if (trainType.includes('passenger') || trainType.includes('local')) punctualityWeight = 0.8;

      // Major railway junction congestion hubs prone to delays
      const congestedJunctions = [
        'NDLS', 'CNB', 'MGS', 'DDU', 'HWH', 'MMCT', 'BCT', 'BRC', 'KOTA', 'PUNE',
        'BSL', 'ET', 'JBP', 'BPL', 'GKP', 'ALD', 'PRYJ', 'BZA', 'MAS', 'SBC', 'UBL'
      ];

      const stationDelays = [];
      let runningDelay = 0;

      for (let i = 0; i < scheduleStations.length; i++) {
        const st = scheduleStations[i];
        if (i === 0) {
          // Origin departure delay: 90% chance on time (0 min), 10% chance slight turnaround delay (2-8 min)
          const originRand = this.seededRandom(baseSeed + 1);
          runningDelay = originRand > 0.88 ? Math.round(originRand * 7) : 0;
        } else {
          const stationDist = st.dist || (i * 40);
          const stSeed = baseSeed + i * 31;
          const rand = this.seededRandom(stSeed);

          // Congestion factor for major hubs
          const isJunction = congestedJunctions.includes(st.code);
          const junctionDelay = isJunction && rand > 0.4 ? Math.round(this.seededRandom(stSeed + 7) * 12 * punctualityWeight) : 0;

          // Natural operational delay variance
          let delta = 0;
          if (rand > 0.65) {
            delta = Math.round(this.seededRandom(stSeed + 13) * 6 * punctualityWeight);
          } else if (rand < 0.25 && runningDelay > 4) {
            // Slack time / recovery stretch in timetable
            delta = -Math.round(this.seededRandom(stSeed + 19) * 4);
          }

          runningDelay = Math.max(0, runningDelay + delta + junctionDelay);
        }

        // Cap delay realistically (max ~180 mins for passenger, ~60 mins for superfast)
        const maxCap = trainType.includes('vande') ? 35 : trainType.includes('rajdhani') ? 50 : 180;
        runningDelay = Math.min(runningDelay, maxCap);

        stationDelays.push({
          code: st.code,
          name: st.name,
          scheduledArr: st.arr,
          scheduledDep: st.dep,
          scheduledArrAMPM: this.formatAMPM(st.arr),
          scheduledDepAMPM: this.formatAMPM(st.dep),
          delayMinutes: runningDelay,
          dist: st.dist || 0,
          pf: st.pf || 1
        });
      }

      return stationDelays;
    },

    /**
     * Get Complete Live Telemetry for a Given Train on a Given Date
     * Determines whether train is SCHEDULED, RUNNING, HALTED, or COMPLETED
     */
    getTrainStatus: function (trainNumber, targetDateInput) {
      const train = this.trains.find(t => t.number === String(trainNumber)) ||
                    this.trains.find(t => t.number.padStart(5, '0') === String(trainNumber).padStart(5, '0'));
      if (!train) return null;

      const schedule = this.schedules[train.number] || this.schedules[String(parseInt(train.number, 10))] || train.stations;
      if (!schedule || !Array.isArray(schedule) || schedule.length === 0) return null;

      const nowIST = this.getISTTime();
      const checkDate = targetDateInput ? new Date(targetDateInput) : new Date(nowIST);

      // Check if train runs on this day of week
      const dayOfWeekIdx = (checkDate.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
      const runsToday = train.days ? train.days[dayOfWeekIdx] : true;

      // Base journey start date (origin departure day)
      const journeyStartDate = new Date(checkDate);
      journeyStartDate.setHours(0, 0, 0, 0);

      // Compute station delays
      const computedDelays = this.computeStationDelays(train, schedule, journeyStartDate);

      // Map stations with full Date timestamps
      const enrichedStations = schedule.map((st, idx) => {
        const delayInfo = computedDelays[idx] || { delayMinutes: 0 };
        const dayNum = st.day || 1;

        const schedArrDate = this.parseScheduleDateTime(st.arr, dayNum, journeyStartDate);
        const schedDepDate = this.parseScheduleDateTime(st.dep, dayNum, journeyStartDate);

        // Actual timestamps including calculated delay
        const actualArrDate = schedArrDate ? new Date(schedArrDate.getTime() + delayInfo.delayMinutes * 60000) : null;
        const actualDepDate = schedDepDate ? new Date(schedDepDate.getTime() + delayInfo.delayMinutes * 60000) : null;

        return {
          code: st.code,
          name: st.name,
          pf: st.pf || (idx + 1),
          dist: st.dist || 0,
          day: dayNum,
          arr: st.arr,
          dep: st.dep,
          arrAMPM: this.formatAMPM(st.arr),
          depAMPM: this.formatAMPM(st.dep),
          schedArrDate,
          schedDepDate,
          actualArrDate,
          actualDepDate,
          actualArrAMPM: actualArrDate ? this.formatAMPM(actualArrDate) : "--",
          actualDepAMPM: actualDepDate ? this.formatAMPM(actualDepDate) : "--",
          delayMinutes: delayInfo.delayMinutes
        };
      });

      const originStation = enrichedStations[0];
      const termStation = enrichedStations[enrichedStations.length - 1];

      const departureTime = originStation.actualDepDate || originStation.schedDepDate;
      const arrivalTime = termStation.actualArrDate || termStation.schedArrDate;

      const maxCruiseSpeed = this.parseCruiseSpeed(train);
      const isDateToday = checkDate.toDateString() === nowIST.toDateString();

      // Check temporal relation with nowIST
      let state = "SCHEDULED"; // "SCHEDULED" | "RUNNING" | "HALTED" | "COMPLETED"
      let currentStation = originStation;
      let nextStation = enrichedStations[1] || termStation;
      let currentStationIndex = 0;
      let currentSpeed = 0;
      let progressPct = 0;
      let distCoveredKm = 0;
      let distRemainingKm = termStation.dist || 100;
      let activeDelayMinutes = 0;
      let liveStatusText = "Scheduled Departure";
      let liveStatusColor = "#2563eb";
      let liveStatusBg = "#eff6ff";

      if (!runsToday) {
        state = "NOT_OPERATIONAL";
        liveStatusText = "Does Not Run on Selected Day";
        liveStatusColor = "#64748b";
        liveStatusBg = "#f1f5f9";
      } else if (nowIST < departureTime) {
        state = "SCHEDULED";
        currentSpeed = 0;
        progressPct = 0;
        activeDelayMinutes = originStation.delayMinutes;
        const diffMins = Math.round((departureTime - nowIST) / 60000);
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        const timeRemaining = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
        liveStatusText = `Departs in ${timeRemaining} at ${originStation.actualDepAMPM}`;
        liveStatusColor = activeDelayMinutes > 5 ? "#d97706" : "#166534";
        liveStatusBg = activeDelayMinutes > 5 ? "#fffbeb" : "#f0fdf4";
      } else if (nowIST >= arrivalTime) {
        state = "COMPLETED";
        currentSpeed = 0;
        progressPct = 100;
        currentStation = termStation;
        nextStation = termStation;
        currentStationIndex = enrichedStations.length - 1;
        distCoveredKm = termStation.dist || 100;
        distRemainingKm = 0;
        activeDelayMinutes = termStation.delayMinutes;
        liveStatusText = `Arrived at ${termStation.name} (${termStation.actualArrAMPM})`;
        liveStatusColor = "#166534";
        liveStatusBg = "#f0fdf4";
      } else {
        // Train is currently RUNNING or HALTED at a station!
        // Find which segment it currently occupies
        for (let i = 0; i < enrichedStations.length; i++) {
          const st = enrichedStations[i];
          const nextSt = enrichedStations[i + 1];

          // Check if halted at station i
          if (st.actualArrDate && st.actualDepDate && nowIST >= st.actualArrDate && nowIST <= st.actualDepDate) {
            state = "HALTED";
            currentStation = st;
            nextStation = nextSt || st;
            currentStationIndex = i;
            currentSpeed = 0;
            distCoveredKm = st.dist;
            distRemainingKm = Math.max(0, (termStation.dist || 100) - distCoveredKm);
            activeDelayMinutes = st.delayMinutes;
            liveStatusText = `Halted at ${st.name} (PF #${st.pf})`;
            liveStatusColor = "#0284c7";
            liveStatusBg = "#f0f9ff";
            break;
          }

          // Check if running between st and nextSt
          if (nextSt) {
            const depFromSt = st.actualDepDate || st.actualArrDate || departureTime;
            const arrAtNext = nextSt.actualArrDate || nextSt.actualDepDate || arrivalTime;

            if (nowIST >= depFromSt && nowIST < arrAtNext) {
              state = "RUNNING";
              currentStation = st;
              nextStation = nextSt;
              currentStationIndex = i;
              activeDelayMinutes = nextSt.delayMinutes;

              const totalSegmentMs = Math.max(1, arrAtNext - depFromSt);
              const elapsedSegmentMs = Math.max(0, nowIST - depFromSt);
              const segProgress = Math.min(1, Math.max(0, elapsedSegmentMs / totalSegmentMs));

              const segDistKm = Math.max(1, (nextSt.dist || 0) - (st.dist || 0));
              const distFromLastKm = segDistKm * segProgress;
              const distToNextKm = segDistKm * (1 - segProgress);

              distCoveredKm = (st.dist || 0) + distFromLastKm;
              distRemainingKm = Math.max(0, (termStation.dist || 100) - distCoveredKm);
              progressPct = Math.round((distCoveredKm / Math.max(1, termStation.dist || 100)) * 100);

              currentSpeed = this.calculateSpeedPhysics({
                isHalted: false,
                distFromLastStationKm: distFromLastKm,
                distToNextStationKm: distToNextKm,
                maxCruiseSpeed: maxCruiseSpeed,
                seed: this.hashString(train.number) + i
              });

              const etaAMPM = nextSt.actualArrAMPM;
              liveStatusText = `Running: ${st.code} → ${nextSt.code} (ETA ${etaAMPM})`;
              liveStatusColor = activeDelayMinutes > 15 ? "#dc2626" : activeDelayMinutes > 0 ? "#d97706" : "#166534";
              liveStatusBg = activeDelayMinutes > 15 ? "#fef2f2" : activeDelayMinutes > 0 ? "#fffbeb" : "#f0fdf4";
              break;
            }
          }
        }
      }

      // Root cause factors for delays
      const delayCauses = [
        { label: "Route Congestion & Junction Clearance", pct: 42, color: "#f59e0b" },
        { label: "Adverse Weather / Visibility Caution", pct: 28, color: "#06b6d4" },
        { label: "Permanent Way & Speed Restrictions (TSR)", pct: 18, color: "#8b5cf6" },
        { label: "Loco / Rolling Stock Turnaround", pct: 12, color: "#ef4444" }
      ];

      return {
        trainNumber: train.number,
        trainName: train.name,
        trainType: train.type,
        origin: originStation.name,
        originCode: originStation.code,
        destination: termStation.name,
        destinationCode: termStation.code,
        departureTimeAMPM: originStation.actualDepAMPM,
        arrivalTimeAMPM: termStation.actualArrAMPM,
        scheduledDepartureAMPM: originStation.arrAMPM !== '--' ? originStation.arrAMPM : originStation.depAMPM,
        scheduledArrivalAMPM: termStation.arrAMPM !== '--' ? termStation.arrAMPM : termStation.depAMPM,
        totalDistanceKm: termStation.dist || 100,
        distCoveredKm: Math.round(distCoveredKm),
        distRemainingKm: Math.round(distRemainingKm),
        progressPct,
        state,
        currentSpeed,
        maxCruiseSpeed,
        currentStation,
        nextStation,
        currentStationIndex,
        delayMinutes: activeDelayMinutes,
        delayText: activeDelayMinutes === 0 ? "ON TIME" : `+${activeDelayMinutes} MIN DELAY`,
        liveStatusText,
        liveStatusColor,
        liveStatusBg,
        stations: enrichedStations,
        delayCauses,
        kavachStatus: "ARMED (SIL-4 CERTIFIED)",
        lastUpdatedIST: this.formatAMPM(nowIST)
      };
    },

    /**
     * 30-Day Cyclic Schedule Matrix for a Train
     * Shows completed runs, currently running run, and upcoming scheduled runs
     */
    getCyclicRollingSchedule: function (trainNumber, daysCount = 30) {
      const train = this.trains.find(t => t.number === String(trainNumber)) ||
                    this.trains.find(t => t.number.padStart(5, '0') === String(trainNumber).padStart(5, '0'));
      if (!train) return [];

      const nowIST = this.getISTTime();
      const results = [];

      // Look back 7 days, look forward 23 days (total 30 days)
      const startDate = new Date(nowIST);
      startDate.setDate(startDate.getDate() - 7);

      for (let i = 0; i < daysCount; i++) {
        const targetDate = new Date(startDate);
        targetDate.setDate(targetDate.getDate() + i);

        const status = this.getTrainStatus(trainNumber, targetDate);
        if (status) {
          results.push({
            date: new Date(targetDate),
            dateFormatted: this.formatDateDisplay(targetDate),
            isToday: targetDate.toDateString() === nowIST.toDateString(),
            isPast: targetDate < nowIST && targetDate.toDateString() !== nowIST.toDateString(),
            isFuture: targetDate > nowIST && targetDate.toDateString() !== nowIST.toDateString(),
            status: status.state,
            delayMinutes: status.delayMinutes,
            delayText: status.delayText,
            departureAMPM: status.departureTimeAMPM,
            arrivalAMPM: status.arrivalTimeAMPM,
            liveStatusText: status.liveStatusText,
            liveStatusColor: status.liveStatusColor,
            liveStatusBg: status.liveStatusBg,
            speed: status.currentSpeed,
            currentStation: status.currentStation.name,
            nextStation: status.nextStation.name
          });
        }
      }

      return results;
    },

    /**
     * Get List of All Currently Delayed Trains in the Network
     */
    getDelayedTrainsGrid: function (options = {}) {
      const minDelay = options.minDelay !== undefined ? options.minDelay : 1;
      const limit = options.limit || 50;
      const delayedList = [];

      const nowIST = this.getISTTime();

      for (const tr of this.trains) {
        // Fast status evaluation using memoized/deterministic delay calculation
        const status = this.getTrainStatus(tr.number, nowIST);
        if (status && status.delayMinutes >= minDelay && status.state !== "NOT_OPERATIONAL") {
          delayedList.push({
            number: tr.number,
            name: tr.name,
            type: tr.type,
            from: tr.from,
            to: tr.to,
            fromName: tr.fromName || tr.from,
            toName: tr.toName || tr.to,
            delayMinutes: status.delayMinutes,
            delayText: status.delayText,
            state: status.state,
            speed: status.currentSpeed,
            departureAMPM: status.departureTimeAMPM,
            arrivalAMPM: status.arrivalTimeAMPM,
            currentStation: status.currentStation.name,
            currentStationCode: status.currentStation.code,
            nextStation: status.nextStation.name,
            nextStationCode: status.nextStation.code,
            liveStatusText: status.liveStatusText,
            liveStatusColor: status.liveStatusColor,
            liveStatusBg: status.liveStatusBg,
            progressPct: status.progressPct,
            kavach: tr.kavach || "ARMED"
          });
        }
      }

      // Sort by delay descending (highest delay first)
      delayedList.sort((a, b) => b.delayMinutes - a.delayMinutes);

      return options.all ? delayedList : delayedList.slice(0, limit);
    },

    /**
     * Station-to-Station Search Specifically for Delayed Trains
     */
    searchDelayedTrainsBetween: function (fromStationCode, toStationCode) {
      if (!fromStationCode || !toStationCode) return [];
      const fromUpper = fromStationCode.trim().toUpperCase();
      const toUpper = toStationCode.trim().toUpperCase();

      const matchingDelayedTrains = [];
      const nowIST = this.getISTTime();

      for (const tr of this.trains) {
        const schedule = this.schedules[tr.number] || this.schedules[String(parseInt(tr.number, 10))];
        let hasDirectConnection = false;

        if (schedule && Array.isArray(schedule)) {
          const fromIdx = schedule.findIndex(s => s.code.toUpperCase() === fromUpper);
          const toIdx = schedule.findIndex(s => s.code.toUpperCase() === toUpper);
          if (fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx) {
            hasDirectConnection = true;
          }
        } else if (tr.stopCodes && Array.isArray(tr.stopCodes)) {
          const fromIdx = tr.stopCodes.indexOf(fromUpper);
          const toIdx = tr.stopCodes.indexOf(toUpper);
          if (fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx) {
            hasDirectConnection = true;
          }
        } else if ((tr.from === fromUpper && tr.to === toUpper)) {
          hasDirectConnection = true;
        }

        if (hasDirectConnection) {
          const status = this.getTrainStatus(tr.number, nowIST);
          if (status && status.delayMinutes > 0) {
            matchingDelayedTrains.push({
              number: tr.number,
              name: tr.name,
              type: tr.type,
              from: tr.from,
              to: tr.to,
              fromName: tr.fromName || tr.from,
              toName: tr.toName || tr.to,
              delayMinutes: status.delayMinutes,
              delayText: status.delayText,
              state: status.state,
              speed: status.currentSpeed,
              departureAMPM: status.departureTimeAMPM,
              arrivalAMPM: status.arrivalTimeAMPM,
              currentStation: status.currentStation.name,
              nextStation: status.nextStation.name,
              liveStatusText: status.liveStatusText,
              progressPct: status.progressPct
            });
          }
        }
      }

      matchingDelayedTrains.sort((a, b) => b.delayMinutes - a.delayMinutes);
      return matchingDelayedTrains;
    },

    /**
     * Dedicated Analytics Metric Bundle for a Train
     * Perfect for rendering Chart.js graphs and high-impact delay telemetry cards
     */
    getTrainDelayAnalytics: function (trainNumber) {
      const status = this.getTrainStatus(trainNumber);
      if (!status) return null;

      const stations = status.stations || [];
      const labels = stations.map(s => s.code);
      const delayPoints = stations.map(s => s.delayMinutes);
      const scheduledTimes = stations.map(s => s.arrAMPM !== '--' ? s.arrAMPM : s.depAMPM);
      const actualTimes = stations.map(s => s.actualArrAMPM !== '--' ? s.actualArrAMPM : s.actualDepAMPM);

      // Speed profile along route (calculated dynamically)
      const speedProfile = stations.map((s, idx) => {
        if (idx === 0 || idx === stations.length - 1) return 0;
        return Math.round(status.maxCruiseSpeed * (0.8 + (idx % 3) * 0.1));
      });

      // Statistical calculations
      const totalDelay = status.delayMinutes;
      const maxDelayObj = stations.reduce((max, cur) => cur.delayMinutes > max.delayMinutes ? cur : max, { delayMinutes: 0, name: '--' });
      const avgDelay = stations.length > 0 ? Math.round(delayPoints.reduce((a, b) => a + b, 0) / stations.length) : 0;
      const punctualityIndex = Math.max(0, 100 - Math.round(totalDelay * 1.2));

      return {
        status,
        trainNumber: status.trainNumber,
        trainName: status.trainName,
        trainType: status.trainType,
        totalDelay,
        maxDelay: maxDelayObj.delayMinutes,
        maxDelayStation: maxDelayObj.name,
        avgDelay,
        punctualityIndex,
        labels,
        delayPoints,
        scheduledTimes,
        actualTimes,
        speedProfile,
        delayCauses: status.delayCauses
      };
    },

    /**
     * Autocomplete search for stations by code or name
     */
    findStationsByQuery: function (query) {
      if (!query || typeof query !== "string") return [];
      const q = query.trim().toLowerCase();
      if (q.length < 1) return [];

      const results = [];
      const seenCodes = new Set();

      if (Array.isArray(this.stations)) {
        for (const st of this.stations) {
          if (!st || !st.code) continue;
          const code = st.code.toLowerCase();
          const name = (st.name || "").toLowerCase();

          // Exact code match gets highest priority
          if (code === q) {
            results.unshift({ code: st.code, name: st.name || st.code, state: st.state || "", zone: st.zone || "" });
            seenCodes.add(st.code);
          } else if (code.startsWith(q) || name.includes(q)) {
            if (!seenCodes.has(st.code)) {
              results.push({ code: st.code, name: st.name || st.code, state: st.state || "", zone: st.zone || "" });
              seenCodes.add(st.code);
            }
          } else if (st.aliases && Array.isArray(st.aliases) && st.aliases.some(a => a.toLowerCase().includes(q))) {
            if (!seenCodes.has(st.code)) {
              results.push({ code: st.code, name: st.name || st.code, state: st.state || "", zone: st.zone || "" });
              seenCodes.add(st.code);
            }
          }
          if (results.length >= 10) break;
        }
      }

      // Fallback: If few results found, search endpoints in trains
      if (results.length < 5 && Array.isArray(this.trains)) {
        for (const tr of this.trains) {
          const from = tr.from || "";
          const to = tr.to || "";
          const fromName = tr.fromName || from;
          const toName = tr.toName || to;

          if (!seenCodes.has(from) && (from.toLowerCase().includes(q) || fromName.toLowerCase().includes(q))) {
            results.push({ code: from, name: fromName, state: "", zone: "" });
            seenCodes.add(from);
          }
          if (!seenCodes.has(to) && (to.toLowerCase().includes(q) || toName.toLowerCase().includes(q))) {
            results.push({ code: to, name: toName, state: "", zone: "" });
            seenCodes.add(to);
          }
          if (results.length >= 10) break;
        }
      }

      return results.slice(0, 10);
    },

    /**
     * Resolves station code from either a station code or name
     */
    resolveStationCode: function (input) {
      if (!input || typeof input !== "string") return "";
      const trimmed = input.trim();
      const upper = trimmed.toUpperCase();

      if (Array.isArray(this.stations)) {
        const exactCode = this.stations.find(s => s && s.code && s.code.toUpperCase() === upper);
        if (exactCode) return exactCode.code;

        // Check aliases (e.g. MMCT -> BCT)
        const aliasMatch = this.stations.find(s => s && s.aliases && Array.isArray(s.aliases) && s.aliases.some(a => a.toUpperCase() === upper));
        if (aliasMatch) return aliasMatch.code;

        const exactName = this.stations.find(s => s && s.name && s.name.toUpperCase() === upper);
        if (exactName) return exactName.code;

        const partial = this.stations.find(s => s && ((s.name && s.name.toLowerCase().includes(trimmed.toLowerCase())) || (s.code && s.code.toLowerCase().includes(trimmed.toLowerCase()))));
        if (partial) return partial.code;
      }

      // Hardcoded common IR aliases
      const commonAliases = {
        "MMCT": "BCT",
        "MUMBAI": "BCT",
        "DELHI": "NDLS",
        "NEW DELHI": "NDLS",
        "KOLKATA": "HWH",
        "HOWRAH": "HWH",
        "CHENNAI": "MAS"
      };
      if (commonAliases[upper]) return commonAliases[upper];

      return upper;
    },

    /**
     * Searches ALL live trains between two stations (running, delayed, on-time, scheduled)
     */
    searchTrainsBetweenStations: function (fromQueryOrCode, toQueryOrCode) {
      if (!fromQueryOrCode || !toQueryOrCode) return [];
      const fromCode = this.resolveStationCode(fromQueryOrCode).toUpperCase();
      const toCode = this.resolveStationCode(toQueryOrCode).toUpperCase();

      const matchingTrains = [];
      const nowIST = this.getISTTime();

      for (const tr of this.trains) {
        const schedule = this.schedules[tr.number] || this.schedules[String(parseInt(tr.number, 10))];
        let hasDirectConnection = false;

        if (schedule && Array.isArray(schedule)) {
          const fromIdx = schedule.findIndex(s => s.code && s.code.toUpperCase() === fromCode);
          const toIdx = schedule.findIndex(s => s.code && s.code.toUpperCase() === toCode);
          if (fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx) {
            hasDirectConnection = true;
          }
        } else if (tr.stopCodes && Array.isArray(tr.stopCodes)) {
          const fromIdx = tr.stopCodes.indexOf(fromCode);
          const toIdx = tr.stopCodes.indexOf(toCode);
          if (fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx) {
            hasDirectConnection = true;
          }
        } else if (tr.from === fromCode && tr.to === toCode) {
          hasDirectConnection = true;
        }

        if (hasDirectConnection) {
          const status = this.getTrainStatus(tr.number, nowIST);
          if (status) {
            matchingTrains.push({
              number: tr.number,
              name: tr.name,
              type: tr.type,
              from: tr.from,
              to: tr.to,
              fromName: tr.fromName || tr.from,
              toName: tr.toName || tr.to,
              delayMinutes: status.delayMinutes,
              delayText: status.delayText,
              state: status.state,
              speed: status.currentSpeed,
              departureAMPM: status.departureTimeAMPM,
              arrivalAMPM: status.arrivalTimeAMPM,
              currentStation: status.currentStation ? status.currentStation.name : "--",
              nextStation: status.nextStation ? status.nextStation.name : "--",
              liveStatusText: status.liveStatusText,
              progressPct: status.progressPct,
              isDelayed: status.delayMinutes > 0,
              kavachActive: true
            });
          }
        }
      }

      // Sort: RUNNING trains first, then by delayMinutes descending, then scheduled
      matchingTrains.sort((a, b) => {
        const statePriority = { "RUNNING": 3, "HALTED": 2, "SCHEDULED": 1, "COMPLETED": 0 };
        const pA = statePriority[a.state] || 0;
        const pB = statePriority[b.state] || 0;
        if (pA !== pB) return pB - pA;
        return b.delayMinutes - a.delayMinutes;
      });

      return matchingTrains;
    },

    /**
     * Get all unique states available in the railway network
     */
    getAllStates: function () {
      const stateSet = new Set();
      if (Array.isArray(this.stations)) {
        for (const st of this.stations) {
          if (st && st.state && typeof st.state === "string" && st.state.trim().length > 0) {
            stateSet.add(st.state.trim());
          }
        }
      }

      // Standard Indian States guarantee
      const standardStates = [
        "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Gujarat", 
        "Haryana", "Himachal Pradesh", "Jammu & Kashmir", "Jharkhand", "Karnataka", 
        "Kerala", "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan", 
        "Tamil Nadu", "Telangana", "Uttar Pradesh", "Uttarakhand", "West Bengal"
      ];

      for (const s of standardStates) {
        stateSet.add(s);
      }

      return Array.from(stateSet).sort();
    },

    /**
     * Get station codes belonging to a specific state
     */
    getStationsByState: function (stateName) {
      if (!stateName) return [];
      const target = stateName.trim().toLowerCase();
      const stationCodes = [];
      if (Array.isArray(this.stations)) {
        for (const st of this.stations) {
          if (st && st.state && st.state.toLowerCase() === target) {
            stationCodes.push(st.code.toUpperCase());
          }
        }
      }
      return stationCodes;
    },

    /**
     * Get trains that pass through or stop at stations in a state
     */
    getTrainsByState: function (stateName, options) {
      options = options || {};
      if (!stateName || stateName === "all" || stateName === "All States" || stateName === "All States (Pan-India)") {
        return this.getDelayedTrainsGrid(options);
      }

      const stateStationCodes = new Set(this.getStationsByState(stateName));
      const matchingTrains = [];
      const nowIST = this.getISTTime();

      for (const tr of this.trains) {
        const schedule = this.schedules[tr.number] || this.schedules[String(parseInt(tr.number, 10))];
        let touchesState = false;

        if (schedule && Array.isArray(schedule)) {
          for (const st of schedule) {
            if (stateStationCodes.has((st.code || "").toUpperCase())) {
              touchesState = true;
              break;
            }
          }
        } else if (tr.stopCodes && Array.isArray(tr.stopCodes)) {
          for (const code of tr.stopCodes) {
            if (stateStationCodes.has(code.toUpperCase())) {
              touchesState = true;
              break;
            }
          }
        }

        if (touchesState) {
          const status = this.getTrainStatus(tr.number, nowIST);
          if (status) {
            const minDelay = options.minDelay !== undefined ? options.minDelay : 0;
            if (status.delayMinutes >= minDelay) {
              matchingTrains.push({
                number: tr.number,
                name: tr.name,
                type: tr.type,
                from: tr.from,
                to: tr.to,
                fromName: tr.fromName || tr.from,
                toName: tr.toName || tr.to,
                delayMinutes: status.delayMinutes,
                delayText: status.delayText,
                state: status.state,
                speed: status.currentSpeed,
                departureAMPM: status.departureTimeAMPM,
                arrivalAMPM: status.arrivalTimeAMPM,
                currentStation: status.currentStation ? status.currentStation.name : "--",
                nextStation: status.nextStation ? status.nextStation.name : "--",
                liveStatusText: status.liveStatusText,
                progressPct: status.progressPct
              });
            }
          }
        }
      }

      matchingTrains.sort((a, b) => b.delayMinutes - a.delayMinutes);
      if (options.limit && !options.all) {
        return matchingTrains.slice(0, options.limit);
      }
      return matchingTrains;
    }
  };

  // Expose to window
  window.LiveTrainEngine = LiveTrainEngine;

})(window);
