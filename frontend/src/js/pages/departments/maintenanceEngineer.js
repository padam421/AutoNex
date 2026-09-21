// =========================================================================
// PROJECT-KAVACH — MAINTENANCE ENGINEERING DEPARTMENT HUB
// Module: maintenanceEngineer.js
// Systems: 
//  1. Train & Rolling Stock Health (Roster, Dedicated Train Dashboard, Coach-by-Coach, Sensors, Speed)
//  2. Pan-India 68,000 km Inter-Station Connected Track Network (Corridors, Geometry, Degradation, Track Sensors)
//  3. S&T Signal & Telecom Diagnostics (Point Machines, Dual Axle Counters, IPS, RFID Tags)
//  4. USFD Digital Ultrasonic A-Scan Oscilloscope (RDSO Probes, A-Scan Waveform)
//  5. 25 kV AC Traction OHE SCADA (TSS Voltage, Catenary Stagger, Auto-Tension, PTW)
//  6. P-Way Repair Work Orders Dispatcher
// Dual Presentation: Interactive Visual Graphs (Chart.js) + Structured Data Tables
// =========================================================================

(function () {
  "use strict";

  // Active Sub-Tab State
  let activeMaintSubTab = "train_fleet"; // 'train_fleet', 'pway_network', 's_and_t', 'usfd', 'ohe', 'work_orders'

  // Fleet Sub-Tab State
  let fleetSearchQuery = "";
  let fleetTypeFilter = "ALL";
  let fleetDisplayMode = "split"; // 'cards', 'table', 'split'
  let selectedTrainNo = "12002"; // Default inspected train: 12002 NDLS-BPL Shatabdi
  let isTrainDetailModalOpen = false;
  let trainDetailTab = "overview"; // 'overview', 'coaches', 'sensors', 'speed_profile'
  let trainDetailDisplayMode = "split"; // 'charts', 'table', 'split'

  // Track Network Sub-Tab State
  let trackCorridorId = "ndls_bpl";
  let customStationA = "NDLS";
  let customStationB = "BPL";
  let trackDisplayMode = "split"; // 'graphs', 'table', 'split'

  // USFD Oscilloscope State
  let usfdFreq = "4.0 MHz (70° Head Flaw)";
  let usfdGain = 48; // dB
  let usfdAnimId = null;

  // Track Geometry & Corridors Database (Spanning 68,000+ km Indian Railways Network)
  const irCorridors = {
    "ndls_bpl": {
      id: "ndls_bpl",
      name: "NDLS - BPL - CSTM Trunk (Golden Quadrilateral Central)",
      stations: ["NDLS", "MTJ", "AGC", "GWL", "VGLJ", "BINA", "BPL", "ET", "KNW", "BSL", "MMR", "KYN", "CSTM"],
      distanceKm: 1540,
      zone: "NR / NCR / WCR / CR",
      mps: "130-160 km/h",
      overallHealth: 96.4,
      degradationPct: 3.6,
      sections: [
        { from: "NDLS", to: "MTJ", dist: 141, health: 97.2, deg: 2.8, gauge: "+0.8 mm", cant: "+85 mm", twist: "1.1 mm/3m", unev: "1.8 mm", align: "1.4 mm", tqi: "98.1 (SUPERIOR)", rail: "60 kg/m HH", sleeper: "PSC-60 (1660/km)", ballast: "350 mm", issues: ["Km 42/8: Ballast shoulder tamping done", "Km 88/12: SEJ gap nominal 79mm"], sensorStatus: "OPTIMAL" },
        { from: "MTJ", to: "AGC", dist: 54, health: 96.8, deg: 3.2, gauge: "+1.2 mm", cant: "+90 mm", twist: "1.3 mm/3m", unev: "2.1 mm", align: "1.6 mm", tqi: "96.5 (EXCELLENT)", rail: "60 kg/m HH", sleeper: "PSC-60", ballast: "350 mm", issues: ["Km 164/2: Track thermistor 48°C safe"], sensorStatus: "OPTIMAL" },
        { from: "AGC", to: "GWL", dist: 118, health: 95.9, deg: 4.1, gauge: "+1.8 mm", cant: "+75 mm", twist: "1.6 mm/3m", unev: "2.6 mm", align: "2.0 mm", tqi: "94.8 (VERY GOOD)", rail: "60 kg/m 90UTS", sleeper: "PSC Monoblock", ballast: "300 mm", issues: ["Km 224/6: Minor railhead micro-spalling observed (OBS)"], sensorStatus: "OBSERVE" },
        { from: "GWL", to: "VGLJ", dist: 98, health: 96.1, deg: 3.9, gauge: "+1.4 mm", cant: "+80 mm", twist: "1.4 mm/3m", unev: "2.3 mm", align: "1.8 mm", tqi: "95.2 (EXCELLENT)", rail: "60 kg/m HH", sleeper: "PSC-60", ballast: "350 mm", issues: ["Km 312/10: DAS optical cable acoustic baseline normal"], sensorStatus: "OPTIMAL" },
        { from: "VGLJ", to: "BINA", dist: 153, health: 95.4, deg: 4.6, gauge: "+2.1 mm", cant: "+70 mm", twist: "1.8 mm/3m", unev: "2.9 mm", align: "2.3 mm", tqi: "93.6 (VERY GOOD)", rail: "60 kg/m 90UTS", sleeper: "PSC Monoblock", ballast: "300 mm", issues: ["Km 418/4: Ballast cushion screening scheduled"], sensorStatus: "OPTIMAL" },
        { from: "BINA", to: "BPL", dist: 139, health: 97.4, deg: 2.6, gauge: "+0.6 mm", cant: "+90 mm", twist: "1.0 mm/3m", unev: "1.6 mm", align: "1.2 mm", tqi: "98.5 (SUPERIOR)", rail: "60 kg/m 1175 HT", sleeper: "PSC-60 Heavy", ballast: "350 mm", issues: ["Km 582/14: High speed curve cant certified 160 km/h"], sensorStatus: "OPTIMAL" }
      ]
    },
    "ndls_hwh": {
      id: "ndls_hwh",
      name: "NDLS - CNB - DDU - HWH (Eastern Grand Chord Trunk: 1,445 km)",
      stations: ["NDLS", "GZB", "ALJN", "TDL", "CNB", "PRYJ", "DDU", "GAYA", "DHN", "ASN", "BWN", "HWH"],
      distanceKm: 1445,
      zone: "NR / NCR / ECR / ER",
      mps: "130-160 km/h",
      overallHealth: 95.8,
      degradationPct: 4.2,
      sections: [
        { from: "NDLS", to: "GZB", dist: 25, health: 94.8, deg: 5.2, gauge: "+2.4 mm", cant: "+50 mm", twist: "2.1 mm/3m", unev: "3.2 mm", align: "2.6 mm", tqi: "92.4 (GOOD)", rail: "60 kg/m 90UTS", sleeper: "PSC Monoblock", ballast: "300 mm", issues: ["Yard turnout switch wear inspected"], sensorStatus: "OBSERVE" },
        { from: "GZB", to: "ALJN", dist: 106, health: 96.6, deg: 3.4, gauge: "+1.1 mm", cant: "+85 mm", twist: "1.3 mm/3m", unev: "2.0 mm", align: "1.5 mm", tqi: "96.8 (EXCELLENT)", rail: "60 kg/m HH", sleeper: "PSC-60", ballast: "350 mm", issues: ["Automated CORPS laser profile scanned"], sensorStatus: "OPTIMAL" },
        { from: "ALJN", to: "TDL", dist: 78, health: 96.0, deg: 4.0, gauge: "+1.5 mm", cant: "+75 mm", twist: "1.5 mm/3m", unev: "2.4 mm", align: "1.9 mm", tqi: "95.1 (EXCELLENT)", rail: "60 kg/m HH", sleeper: "PSC-60", ballast: "350 mm", issues: ["Km 162/8: SEJ expansion gap 81mm"], sensorStatus: "OPTIMAL" },
        { from: "TDL", to: "CNB", dist: 231, health: 95.2, deg: 4.8, gauge: "+2.2 mm", cant: "+70 mm", twist: "1.9 mm/3m", unev: "3.0 mm", align: "2.4 mm", tqi: "93.2 (VERY GOOD)", rail: "60 kg/m 90UTS", sleeper: "PSC Monoblock", ballast: "300 mm", issues: ["Km 342/2: TSR 75 km/h for bridge re-girdering"], sensorStatus: "TSR ACTIVE" }
      ]
    },
    "mas_sbc": {
      id: "mas_sbc",
      name: "MAS - KPD - JTJ - SBC (Southern Vande Bharat Corridor: 362 km)",
      stations: ["MAS", "AJJ", "KPD", "JTJ", "KJM", "BNC", "SBC"],
      distanceKm: 362,
      zone: "SR / SWR",
      mps: "130-160 km/h",
      overallHealth: 97.6,
      degradationPct: 2.4,
      sections: [
        { from: "MAS", to: "AJJ", dist: 69, health: 97.8, deg: 2.2, gauge: "+0.5 mm", cant: "+85 mm", twist: "1.0 mm/3m", unev: "1.5 mm", align: "1.1 mm", tqi: "98.6 (SUPERIOR)", rail: "60 kg/m HH", sleeper: "PSC-60", ballast: "350 mm", issues: ["Optimal track geometry"], sensorStatus: "OPTIMAL" },
        { from: "AJJ", to: "KPD", dist: 61, health: 97.4, deg: 2.6, gauge: "+0.8 mm", cant: "+80 mm", twist: "1.2 mm/3m", unev: "1.7 mm", align: "1.3 mm", tqi: "97.9 (SUPERIOR)", rail: "60 kg/m HH", sleeper: "PSC-60", ballast: "350 mm", issues: ["Km 94/12: Rail thermistor 42°C normal"], sensorStatus: "OPTIMAL" },
        { from: "KPD", to: "JTJ", dist: 84, health: 97.1, deg: 2.9, gauge: "+1.0 mm", cant: "+80 mm", twist: "1.2 mm/3m", unev: "1.9 mm", align: "1.4 mm", tqi: "97.2 (SUPERIOR)", rail: "60 kg/m HH", sleeper: "PSC-60", ballast: "350 mm", issues: ["Dual Axle Counters 100% matched"], sensorStatus: "OPTIMAL" },
        { from: "JTJ", to: "SBC", dist: 148, health: 98.1, deg: 1.9, gauge: "+0.4 mm", cant: "+90 mm", twist: "0.9 mm/3m", unev: "1.4 mm", align: "1.0 mm", tqi: "99.1 (SUPERIOR)", rail: "60 kg/m 1175 HT", sleeper: "PSC-60 Heavy", ballast: "350 mm", issues: ["Grade 1 Track Certification valid"], sensorStatus: "OPTIMAL" }
      ]
    },
    "cstm_mas": {
      id: "cstm_mas",
      name: "CSTM - PUNE - SUR - WADI - GTL - MAS (Mumbai - Chennai Diagonal: 1,283 km)",
      stations: ["CSTM", "KYN", "KJT", "LNL", "PUNE", "DD", "KWV", "SUR", "GR", "WADI", "RC", "GTL", "HX", "RU", "MAS"],
      distanceKm: 1283,
      zone: "CR / SCR / SR",
      mps: "110-130 km/h",
      overallHealth: 94.7,
      degradationPct: 5.3,
      sections: [
        { from: "CSTM", to: "KYN", dist: 54, health: 93.8, deg: 6.2, gauge: "+3.1 mm", cant: "+60 mm", twist: "2.4 mm/3m", unev: "3.8 mm", align: "3.1 mm", tqi: "90.8 (GOOD)", rail: "60 kg/m 90UTS", sleeper: "PSC Monoblock", ballast: "300 mm", issues: ["Suburban high-density wear; nightly tamping"], sensorStatus: "OBSERVE" },
        { from: "KYN", to: "KJT", dist: 46, health: 94.2, deg: 5.8, gauge: "+2.6 mm", cant: "+65 mm", twist: "2.0 mm/3m", unev: "3.4 mm", align: "2.8 mm", tqi: "91.9 (GOOD)", rail: "60 kg/m 90UTS", sleeper: "PSC Monoblock", ballast: "300 mm", issues: ["Ghat approach curves monitored"], sensorStatus: "OPTIMAL" },
        { from: "KJT", to: "LNL", dist: 28, health: 95.0, deg: 5.0, gauge: "+1.9 mm", cant: "+105 mm", twist: "1.8 mm/3m", unev: "2.8 mm", align: "2.2 mm", tqi: "93.4 (VERY GOOD)", rail: "60 kg/m HH Special", sleeper: "Steel/PSC Ghat", ballast: "350 mm", issues: ["Bhor Ghat 1 in 37 incline catch siding tested"], sensorStatus: "OPTIMAL" },
        { from: "LNL", to: "PUNE", dist: 64, health: 96.5, deg: 3.5, gauge: "+1.0 mm", cant: "+75 mm", twist: "1.3 mm/3m", unev: "2.1 mm", align: "1.6 mm", tqi: "96.4 (EXCELLENT)", rail: "60 kg/m HH", sleeper: "PSC-60", ballast: "350 mm", issues: ["WIM dynamic axle weigh station clear"], sensorStatus: "OPTIMAL" }
      ]
    }
  };

  // P-Way Work Orders State
  let maintWorkOrders = [
    { id: "WO-2026-041", location: "NDLS - NZM Up Main (Km 14/2)", defect: "Rail Transverse Micro-Crack detected by USFD", priority: "CRITICAL", priorityClass: "bg-red-100 text-red-800 border-red-300", status: "SITE BLOCK ACTIVE", statusClass: "bg-amber-100 text-amber-800", crew: "Specialist USFD Team 02 (SSE NZM)", estHrs: "3.5 hrs", safetyPermit: "PTW-8812" },
    { id: "WO-2026-040", location: "NZM - FDB Line (Km 22/8)", defect: "Point Machine 104B throw obstruction current high (4.8A)", priority: "HIGH", priorityClass: "bg-amber-100 text-amber-800 border-amber-300", status: "DISPATCHED", statusClass: "bg-blue-100 text-blue-800", crew: "S&T Fast Response Gang 01", estHrs: "1.5 hrs", safetyPermit: "PTW-8810" },
    { id: "WO-2026-039", location: "TKD Yard Incline (Km 31/0)", defect: "OHE Contact Wire Stagger deviation (+220mm)", priority: "MEDIUM", priorityClass: "bg-blue-100 text-blue-800 border-blue-300", status: "SCHEDULED (NIGHT BLOCK)", statusClass: "bg-purple-100 text-purple-800", crew: "OHE Tower Wagon Team 03", estHrs: "4.0 hrs", safetyPermit: "PTW-8806" },
    { id: "WO-2026-038", location: "NDLS Yard Wash Line 3", defect: "Worn switch point tongue rail replacement", priority: "LOW", priorityClass: "bg-slate-100 text-slate-800 border-slate-300", status: "COMPLETED & CERTIFIED", statusClass: "bg-emerald-100 text-emerald-800", crew: "Yard Maintenance Gang 04", estHrs: "5.0 hrs", safetyPermit: "PTW-8798" }
  ];

  // Helper: Get realistic, deterministic health metrics for any train
  function getTrainHealthData(train) {
    if (!train) return null;
    const num = parseInt(train.number, 10) || 12002;
    // Deterministic pseudo-random based on train number
    const hash = ((num * 9301 + 49297) % 233280) / 233280;
    const hash2 = ((num * 49297 + 9301) % 233280) / 233280;
    const hash3 = ((num * 12345 + 67890) % 233280) / 233280;

    const isVandeBharat = (train.name && train.name.toUpperCase().includes("VANDE")) || (train.number && train.number.startsWith("224") || train.number.startsWith("206"));
    const isRajdhani = (train.name && train.name.toUpperCase().includes("RAJDHANI")) || (train.number && train.number.startsWith("124") || train.number.startsWith("129"));
    const isShatabdi = (train.name && train.name.toUpperCase().includes("SHATABDI")) || (train.number && train.number.startsWith("120"));
    const isFreight = (train.type && train.type.toUpperCase().includes("FREIGHT")) || (train.name && train.name.toUpperCase().includes("GOODS"));

    let locoType = "WAP-7 (6000 HP)";
    let locoNumber = `30${(num % 800 + 200).toString().padStart(3, "0")}`;
    let coachCount = 16;
    let mps = "130 km/h";

    if (isVandeBharat) {
      locoType = "Trainset 18 (Distributed Electric 12000 HP)";
      locoNumber = `VB-${(num % 50 + 1).toString().padStart(2, "0")}`;
      coachCount = 16;
      mps = "160 km/h";
    } else if (isRajdhani) {
      locoType = "WAP-7 HS (Twin-Head Cab)";
      locoNumber = `30${(num % 500 + 300).toString().padStart(3, "0")}`;
      coachCount = 20;
      mps = "140 km/h";
    } else if (isShatabdi) {
      locoType = "WAP-5 (5450 HP High Acceleration)";
      locoNumber = `30${(num % 300 + 100).toString().padStart(3, "0")}`;
      coachCount = 16;
      mps = "150 km/h";
    } else if (isFreight) {
      locoType = "WAG-9 Heavy Hauler (6120 HP)";
      locoNumber = `31${(num % 900 + 100).toString().padStart(3, "0")}`;
      coachCount = 58;
      mps = "100 km/h";
    }

    // Health score: 88.0% to 99.4%
    const baseHealth = 91.5 + (hash * 7.8);
    const healthPct = parseFloat(baseHealth.toFixed(1));
    const degPct = parseFloat((100 - healthPct).toFixed(1));

    // Engine Health
    const engineHealth = parseFloat(Math.min(99.6, baseHealth + (hash2 * 1.8 - 0.9)).toFixed(1));
    const engineDeg = parseFloat((100 - engineHealth).toFixed(1));

    // Current operating speed vs past vs future
    const currentSpeed = Math.round(55 + hash * 65);
    const pastAvgSpeed = Math.round(currentSpeed - 8 + hash2 * 14);
    const futureSpeedLimit = parseInt(mps.split(" ")[0], 10) || 130;

    // Failure Risk
    let riskLevel = "LOW RISK";
    let riskClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (degPct > 6.5) {
      riskLevel = "MODERATE RISK";
      riskClass = "bg-amber-100 text-amber-800 border-amber-300";
    }
    if (degPct > 9.0) {
      riskLevel = "CRITICAL / OVERHAUL DUE";
      riskClass = "bg-red-100 text-red-800 border-red-300";
    }

    // Generate Coaches
    const coaches = [];
    const coachPrefixes = isVandeBharat ? ["EC", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "C13", "C14", "EOG"]
      : isRajdhani ? ["EOG", "H1", "A1", "A2", "A3", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "PC", "B10", "B11", "B12", "B13", "EOG"]
      : ["LOCO", "EOG", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "PC", "EOG"];

    for (let i = 0; i < Math.min(coachCount, coachPrefixes.length); i++) {
      const cHash = ((num * (i + 7) + 31) % 100) / 100;
      const cHealth = parseFloat((92 + cHash * 7.5).toFixed(1));
      const cDeg = parseFloat((100 - cHealth).toFixed(1));
      const habdTemp = Math.round(36 + cHash * 18);
      const wildImpactKn = parseFloat((14 + cHash * 11).toFixed(1));
      const bogieVib = parseFloat((0.14 + cHash * 0.14).toFixed(2));
      const brakeBlockMm = Math.round(26 + cHash * 16);
      const airSpringBar = parseFloat((5.8 + cHash * 0.5).toFixed(2));

      coaches.push({
        id: `${train.number}-${coachPrefixes[i]}`,
        name: coachPrefixes[i],
        health: cHealth,
        deg: cDeg,
        habdTemp: `${habdTemp}°C`,
        wildImpactKn: `${wildImpactKn} kN`,
        bogieVib: `${bogieVib}g`,
        brakeBlockMm: `${brakeBlockMm} mm`,
        airSpringBar: `${airSpringBar} bar`,
        toiletStatus: cHash > 0.85 ? "78% (Service Scheduled)" : "28% (Optimal Vacuum)",
        hvacTemp: `${(22.0 + cHash * 1.5).toFixed(1)}°C`,
        status: cDeg > 6.0 ? "ATTENTION" : "CERTIFIED"
      });
    }

    // Physical Fitted Sensors Feed
    const sensors = [
      { id: "SENS-HABD-01", name: "Hot Axle Box Infrared Pyrometer", loc: "Bogie Axle Journal 1", liveValue: `${Math.round(38 + hash * 12)}°C`, baseline: "35°C", threshold: "75°C", health: 98.4, status: "NOMINAL", type: "Infrared Optical" },
      { id: "SENS-WILD-01", name: "Wheel Impact Load Strain-Gauge Array", loc: "Wheelset 1 & 2 Tread", liveValue: `${(15.2 + hash2 * 6).toFixed(1)} kN`, baseline: "14.0 kN", threshold: "35.0 kN", health: 97.1, status: "NOMINAL", type: "Piezo Strain Gauge" },
      { id: "SENS-ACCEL-01", name: "Triaxial Bogie Hunting Accelerometer", loc: "Primary Bogie Frame", liveValue: `${(0.18 + hash * 0.08).toFixed(2)}g`, baseline: "0.15g", threshold: "0.35g", health: 96.8, status: "NOMINAL", type: "MEMS Piezo-Electric" },
      { id: "SENS-RTD-TM01", name: "Traction Motor Stator RTD Sensor", loc: "Traction Motor 1 Stator", liveValue: `${Math.round(62 + hash2 * 18)}°C`, baseline: "55°C", threshold: "115°C", health: 95.5, status: "NOMINAL", type: "Platinum PT100" },
      { id: "SENS-HALL-01", name: "Hall-Effect Axle Rotational Speed Pick-Up", loc: "Axle End 1A", liveValue: `${currentSpeed} km/h (Pulse 48Hz)`, baseline: "Calibrated", threshold: "Slip > 8%", health: 99.2, status: "NOMINAL", type: "Magnetic Hall-Effect" },
      { id: "SENS-LVDT-01", name: "Secondary Air Spring LVDT Displacement", loc: "Bogie 1 Air Bellow", liveValue: "68.4 mm (Inflated)", baseline: "68.0 mm", threshold: "Min 50 mm", health: 97.9, status: "NOMINAL", type: "Linear Inductive" },
      { id: "SENS-OIL-01", name: "Transformer Dielectric & Particle Laser Sensor", loc: "Main Transformer Sump", liveValue: "Dielectric 62 kV / Dry", baseline: "60 kV", threshold: "Min 40 kV", health: 98.0, status: "NOMINAL", type: "Optical Turbidity" },
      { id: "SENS-PRESS-01", name: "Brake Pipe Pressure Transducer", loc: "Cab Pneumatic Manifold", liveValue: "5.02 kg/cm² (Nominal)", baseline: "5.00 kg/cm²", threshold: "Drop < 4.2 kg/cm²", health: 99.5, status: "NOMINAL", type: "Piezo-Resistive" },
      { id: "SENS-KAVACH-RF", name: "Kavach 160.225 MHz UHF Radio Telemetry", loc: "Cab Rooftop Antenna", liveValue: "+36.4 dB SNR (Locked)", baseline: "+30 dB", threshold: "Min +18 dB", health: 99.8, status: "SIL-4 ARMED", type: "Digital RF FSK" }
    ];

    return {
      trainNumber: train.number,
      trainName: train.name || "Express Train",
      from: train.from || "NDLS",
      fromName: train.fromName || "New Delhi",
      to: train.to || "BPL",
      toName: train.toName || "Bhopal",
      type: train.type || "Express",
      zone: train.zone || "NR",
      locoType,
      locoNumber,
      coachCount,
      mps,
      healthPct,
      degPct,
      engineHealth,
      engineDeg,
      currentSpeed,
      pastAvgSpeed,
      futureSpeedLimit,
      riskLevel,
      riskClass,
      coaches,
      sensors,
      tractionMotorTemp: Math.round(64 + hash * 16),
      compressorPressure: (8.9 + hash2 * 0.8).toFixed(1),
      brakePipePressure: "5.0 kg/cm²",
      pantographWear: `${Math.round(18 + hash * 12)} mm (Limit 34 mm)`,
      lastDepotInspection: "18 Sept 2026 (Passed)"
    };
  }

  // Get active train dataset
  function getTrainsList() {
    if (window.irTrainDatabase && Array.isArray(window.irTrainDatabase) && window.irTrainDatabase.length > 0) {
      return window.irTrainDatabase;
    }
    // Fallback high-profile roster
    return [
      { number: "12002", name: "New Delhi - Bhopal Shatabdi Express", type: "Shatabdi", from: "NDLS", fromName: "NEW DELHI", to: "BPL", toName: "BHOPAL JN", speed: "130-150 km/h", zone: "NR" },
      { number: "22436", name: "Vande Bharat Express (NDLS - BSB)", type: "Vande Bharat", from: "NDLS", fromName: "NEW DELHI", to: "BSB", toName: "VARANASI JN", speed: "130-160 km/h", zone: "NR" },
      { number: "12951", name: "Mumbai Rajdhani Express", type: "Rajdhani", from: "MMCT", fromName: "MUMBAI CENTRAL", to: "NDLS", toName: "NEW DELHI", speed: "130-140 km/h", zone: "WR" },
      { number: "12301", name: "Howrah Rajdhani Express", type: "Rajdhani", from: "HWH", fromName: "HOWRAH JN", to: "NDLS", toName: "NEW DELHI", speed: "130-140 km/h", zone: "ER" },
      { number: "20607", name: "Chennai - Mysuru Vande Bharat", type: "Vande Bharat", from: "MAS", fromName: "CHENNAI CENTRAL", to: "MYS", toName: "MYSURU JN", speed: "130-160 km/h", zone: "SR" },
      { number: "12259", name: "Sealdah - Bikaner AC Duronto", type: "Duronto", from: "SDAH", fromName: "SEALDAH", to: "BKN", toName: "BIKANER JN", speed: "120-130 km/h", zone: "ER" },
      { number: "12626", name: "Kerala Express", type: "Express", from: "NDLS", fromName: "NEW DELHI", to: "TVC", toName: "THIRUVANANTHAPURAM", speed: "110-120 km/h", zone: "SR" },
      { number: "BOXN-902", name: "Dadri NTPC Thermal Coal Rake", type: "Freight", from: "DHN", fromName: "DHANBAD", to: "DER", toName: "DADRI", speed: "80-100 km/h", zone: "ECR" },
      { number: "64491", name: "New Delhi - Palwal Suburban EMU", type: "Suburban", from: "NDLS", fromName: "NEW DELHI", to: "PWL", toName: "PALWAL", speed: "80-100 km/h", zone: "NR" }
    ];
  }

  // Switch Sub-Tab
  window.switchMaintSubTab = function (tabKey) {
    activeMaintSubTab = tabKey;
    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderMaintenanceEngineerWorkspace) {
      window.renderMaintenanceEngineerWorkspace(container);
    }
  };

  // Toggle View Modes
  window.setFleetDisplayMode = function (mode) {
    fleetDisplayMode = mode;
    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderMaintenanceEngineerWorkspace) {
      window.renderMaintenanceEngineerWorkspace(container);
    }
  };

  window.setTrackDisplayMode = function (mode) {
    trackDisplayMode = mode;
    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderMaintenanceEngineerWorkspace) {
      window.renderMaintenanceEngineerWorkspace(container);
    }
  };

  window.setTrainDetailDisplayMode = function (mode) {
    trainDetailDisplayMode = mode;
    renderTrainDetailModalContent();
  };

  window.setTrainDetailTab = function (tab) {
    trainDetailTab = tab;
    renderTrainDetailModalContent();
  };

  // Filter Fleet
  window.filterMaintFleet = function (query) {
    fleetSearchQuery = query.toLowerCase();
    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderMaintenanceEngineerWorkspace) {
      window.renderMaintenanceEngineerWorkspace(container);
    }
  };

  window.setFleetTypeFilter = function (type) {
    fleetTypeFilter = type;
    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderMaintenanceEngineerWorkspace) {
      window.renderMaintenanceEngineerWorkspace(container);
    }
  };

  // Select Corridor
  window.selectTrackCorridor = function (corrId) {
    trackCorridorId = corrId;
    const c = irCorridors[corrId];
    if (c && window.showToast) {
      window.showToast(`🛤️ Selected Corridor: ${c.name}`, "info");
    }
    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderMaintenanceEngineerWorkspace) {
      window.renderMaintenanceEngineerWorkspace(container);
    }
  };

  // Custom Station Pair Search for 68,000 km Network
  window.searchCustomStationPair = function () {
    const stAInput = document.getElementById("customStationAInput");
    const stBInput = document.getElementById("customStationBInput");
    if (!stAInput || !stBInput) return;
    const codeA = stAInput.value.trim().toUpperCase();
    const codeB = stBInput.value.trim().toUpperCase();

    if (!codeA || !codeB) {
      if (window.showToast) window.showToast("Please enter both Station A and Station B codes", "warning");
      return;
    }

    customStationA = codeA;
    customStationB = codeB;

    if (window.showToast) {
      window.showToast(`🔍 Analyzed 68,000 km Track Link: ${codeA} ➔ ${codeB}`, "success");
    }

    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderMaintenanceEngineerWorkspace) {
      window.renderMaintenanceEngineerWorkspace(container);
    }
  };

  // Open Train Maintenance Dashboard Modal
  window.openTrainMaintenanceDetail = function (trainNo) {
    selectedTrainNo = String(trainNo);
    isTrainDetailModalOpen = true;
    trainDetailTab = "overview";
    renderTrainDetailModalContent();
  };

  window.closeTrainMaintenanceDetail = function () {
    isTrainDetailModalOpen = false;
    const modal = document.getElementById("trainMaintDetailModal");
    if (modal) modal.remove();
  };

  // Change USFD Probe
  window.setUsfdProbe = function (probeStr) {
    usfdFreq = probeStr;
    if (window.showToast) {
      window.showToast(`🔍 Switched USFD Probe to ${probeStr}`, "info");
    }
    const el = document.getElementById("activeUsfdProbeLabel");
    if (el) el.textContent = probeStr;
  };

  // Adjust USFD Gain
  window.adjustUsfdGain = function (delta) {
    usfdGain = Math.max(20, Math.min(80, usfdGain + delta));
    const el = document.getElementById("usfdGainLabel");
    if (el) el.textContent = `${usfdGain} dB`;
  };

  // USFD A-Scan Oscilloscope Canvas Engine
  function initUsfdOscilloscope() {
    const canvas = document.getElementById("usfdOscilloscopeCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (usfdAnimId) cancelAnimationFrame(usfdAnimId);

    let offset = 0;

    function drawAscan() {
      if (!document.getElementById("usfdOscilloscopeCanvas")) return;
      const w = canvas.width = canvas.parentElement.clientWidth;
      const h = canvas.height = canvas.parentElement.clientHeight;

      // Dark Oscilloscope Grid
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, w, h);

      // Grid Lines
      ctx.strokeStyle = "rgba(16, 185, 129, 0.15)";
      ctx.lineWidth = 1;
      const xGrid = w / 10;
      const yGrid = h / 8;

      for (let x = 0; x < w; x += xGrid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += yGrid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Baseline Echo Waveform
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#10b981";
      ctx.beginPath();

      const baseY = h * 0.85;
      offset += 0.05;

      for (let x = 0; x < w; x++) {
        let y = baseY;

        // Transducer bang at x = 20
        if (x >= 15 && x <= 45) {
          y -= Math.sin((x - 15) / 30 * Math.PI) * (h * 0.7);
        }
        // Small acoustic noise
        y += (Math.random() - 0.5) * 3;

        // Flaw Peak (Simulated Rail Defect at 52% depth)
        const flawX = w * 0.52;
        if (x >= flawX - 25 && x <= flawX + 25) {
          const flawAmp = (h * 0.58) * (usfdGain / 50);
          y -= Math.sin((x - (flawX - 25)) / 50 * Math.PI) * flawAmp;
        }

        // Backwall Bottom Echo at 88% depth
        const backwallX = w * 0.88;
        if (x >= backwallX - 30 && x <= backwallX + 30) {
          y -= Math.sin((x - (backwallX - 30)) / 60 * Math.PI) * (h * 0.75);
        }

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
      ctx.shadowBlur = 0;

      // Annotations
      ctx.font = "bold 10px JetBrains Mono, monospace";
      ctx.fillStyle = "#34d399";
      ctx.fillText("TRANSDUCER BANG (0 mm)", 20, 20);
      ctx.fillStyle = "#f59e0b";
      ctx.fillText("FLAW PEAK: 92 mm DEPTH (48 dB)", w * 0.44, 40);
      ctx.fillStyle = "#60a5fa";
      ctx.fillText("RAIL FOOT BACKWALL (165 mm)", w * 0.78, 20);

      usfdAnimId = requestAnimationFrame(drawAscan);
    }

    drawAscan();
  }

  // Render Train Detail Modal
  function renderTrainDetailModalContent() {
    let modal = document.getElementById("trainMaintDetailModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "trainMaintDetailModal";
      modal.className = "fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto";
      document.body.appendChild(modal);
    }

    const trains = getTrainsList();
    const rawTrain = trains.find(t => String(t.number) === selectedTrainNo) || trains[0];
    const data = getTrainHealthData(rawTrain);

    if (!data) return;

    let tabBodyHtml = "";

    if (trainDetailTab === "overview") {
      tabBodyHtml = `
        <div class="space-y-4">
          <!-- Engine & Key Telemetry Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Engine / Loco Class</span>
              <strong class="text-base text-[#12355B] block font-['Outfit'] mt-1">${data.locoType}</strong>
              <span class="text-xs font-mono text-slate-600 block mt-0.5">Loco No: <strong>#${data.locoNumber}</strong></span>
              <div class="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span>Health Index:</span>
                <strong class="text-emerald-700 font-mono">${data.engineHealth}%</strong>
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Traction Motors (TM1 - TM6)</span>
              <strong class="text-2xl text-[#12355B] font-mono block mt-1">${data.tractionMotorTemp}°C</strong>
              <span class="text-xs font-mono text-emerald-700 block mt-0.5">Normal Operating Range (&lt; 115°C)</span>
              <div class="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span>Vibration:</span>
                <strong class="text-slate-800 font-mono">0.18g (Smooth)</strong>
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pneumatic Air Brake (MCP)</span>
              <strong class="text-2xl text-[#12355B] font-mono block mt-1">${data.compressorPressure} bar</strong>
              <span class="text-xs font-mono text-slate-600 block mt-0.5">Brake Pipe: <strong>${data.brakePipePressure}</strong></span>
              <div class="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span>Feed Pipe:</span>
                <strong class="text-emerald-700 font-mono">6.0 kg/cm²</strong>
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Kavach SIL-4 Unit</span>
              <strong class="text-base text-emerald-700 font-bold block mt-1">DUAL LOCKSTEP ACTIVE</strong>
              <span class="text-xs font-mono text-slate-600 block mt-0.5">160.225 MHz UHF Radio</span>
              <div class="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span>RF SNR:</span>
                <strong class="text-emerald-700 font-mono">+36.4 dB</strong>
              </div>
            </div>
          </div>

          <!-- Dual Format: Visual Chart vs Structured Table -->
          ${(trainDetailDisplayMode === "charts" || trainDetailDisplayMode === "split") ? `
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <!-- Engine Health Gauge Donut -->
              <div class="lg:col-span-4 p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                <h5 class="text-xs font-bold text-[#12355B] uppercase tracking-wider flex items-center gap-1.5">
                  <i class="fa-solid fa-chart-pie text-blue-600"></i> Rolling Stock Health vs Degradation
                </h5>
                <div class="h-44 relative flex items-center justify-center">
                  <canvas id="trainHealthDonutChart"></canvas>
                </div>
                <div class="flex justify-around text-center text-xs font-mono pt-2 border-t border-slate-100">
                  <div>
                    <span class="text-slate-400 block text-[10px]">Health</span>
                    <strong class="text-emerald-700 text-sm">${data.healthPct}%</strong>
                  </div>
                  <div>
                    <span class="text-slate-400 block text-[10px]">Degraded</span>
                    <strong class="text-amber-700 text-sm">-${data.degPct}%</strong>
                  </div>
                  <div>
                    <span class="text-slate-400 block text-[10px]">Coaches</span>
                    <strong class="text-[#12355B] text-sm">${data.coachCount} Units</strong>
                  </div>
                </div>
              </div>

              <!-- Speed & Operational Profile Graph -->
              <div class="lg:col-span-8 p-4 rounded-2xl border border-slate-200 bg-white space-y-2">
                <div class="flex items-center justify-between">
                  <h5 class="text-xs font-bold text-[#12355B] uppercase tracking-wider flex items-center gap-1.5">
                    <i class="fa-solid fa-gauge-high text-[#FF9933]"></i> Speed Profile: Past Operating vs Cruising vs Designed MPS
                  </h5>
                  <span class="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-mono text-[10px] font-bold border border-blue-200">
                    Designed MPS: ${data.mps}
                  </span>
                </div>
                <div class="h-44 relative">
                  <canvas id="trainSpeedProfileChart"></canvas>
                </div>
              </div>
            </div>
          ` : ''}

          ${(trainDetailDisplayMode === "table" || trainDetailDisplayMode === "split") ? `
            <div class="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
              <h5 class="text-xs font-bold text-[#12355B] uppercase tracking-wider flex items-center gap-1.5">
                <i class="fa-solid fa-table-list text-emerald-600"></i> Critical Locomotive Component Diagnostics Matrix
              </h5>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs font-mono">
                  <thead class="text-[10px] bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th class="py-2.5 px-3">Subsystem</th>
                      <th class="py-2.5 px-3">Parameter Measured</th>
                      <th class="py-2.5 px-3">Nominal Tolerance</th>
                      <th class="py-2.5 px-3">Real-Time Reading</th>
                      <th class="py-2.5 px-3">Degradation</th>
                      <th class="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
                    <tr>
                      <td class="py-2.5 px-3 font-bold text-[#12355B]">Traction Motors (TM1-6)</td>
                      <td class="py-2.5 px-3">Stator Winding Temp</td>
                      <td class="py-2.5 px-3">&lt; 115°C</td>
                      <td class="py-2.5 px-3 text-emerald-700 font-bold">${data.tractionMotorTemp}°C</td>
                      <td class="py-2.5 px-3 text-slate-500">-2.1%</td>
                      <td class="py-2.5 px-3 text-right"><span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">OPTIMAL</span></td>
                    </tr>
                    <tr>
                      <td class="py-2.5 px-3 font-bold text-[#12355B]">Main Compressor (MCP)</td>
                      <td class="py-2.5 px-3">Air Reservoir Pressure</td>
                      <td class="py-2.5 px-3">8.5 - 10.0 bar</td>
                      <td class="py-2.5 px-3 text-emerald-700 font-bold">${data.compressorPressure} bar</td>
                      <td class="py-2.5 px-3 text-slate-500">-0.8%</td>
                      <td class="py-2.5 px-3 text-right"><span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">CHARGED</span></td>
                    </tr>
                    <tr>
                      <td class="py-2.5 px-3 font-bold text-[#12355B]">Pantograph Carbon Strip</td>
                      <td class="py-2.5 px-3">Wear Thickness</td>
                      <td class="py-2.5 px-3">Min 10 mm (Scrap)</td>
                      <td class="py-2.5 px-3 text-[#12355B] font-bold">${data.pantographWear}</td>
                      <td class="py-2.5 px-3 text-amber-700 font-bold">-4.5%</td>
                      <td class="py-2.5 px-3 text-right"><span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">SAFE</span></td>
                    </tr>
                    <tr>
                      <td class="py-2.5 px-3 font-bold text-[#12355B]">Transformer Oil Sump</td>
                      <td class="py-2.5 px-3">Dielectric Breakdown</td>
                      <td class="py-2.5 px-3">&gt; 40 kV / BDV</td>
                      <td class="py-2.5 px-3 text-emerald-700 font-bold">62 kV (Dry & Clean)</td>
                      <td class="py-2.5 px-3 text-slate-500">-1.2%</td>
                      <td class="py-2.5 px-3 text-right"><span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">CERTIFIED</span></td>
                    </tr>
                    <tr>
                      <td class="py-2.5 px-3 font-bold text-[#12355B]">Auxiliary Converter BUR1-3</td>
                      <td class="py-2.5 px-3">DC Link Bus Voltage</td>
                      <td class="py-2.5 px-3">2800V DC ± 5%</td>
                      <td class="py-2.5 px-3 text-[#12355B] font-bold">2814 V DC</td>
                      <td class="py-2.5 px-3 text-slate-500">-0.2%</td>
                      <td class="py-2.5 px-3 text-right"><span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">SYNCHRONIZED</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    } else if (trainDetailTab === "coaches") {
      tabBodyHtml = `
        <div class="space-y-4">
          <div class="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
            <span><i class="fa-solid fa-train-subway text-blue-600 mr-1.5"></i> Comprehensive Coach-by-Coach Telemetry: <strong>${data.coachCount} Coaches</strong> in Active Rake.</span>
            <span class="font-mono text-slate-600 font-bold">HABD & WILD Active</span>
          </div>

          <!-- Coach Table -->
          <div class="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs font-mono">
                <thead class="text-[10px] bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th class="py-2.5 px-3">Coach ID</th>
                    <th class="py-2.5 px-3">Health Score</th>
                    <th class="py-2.5 px-3">Hot Axle (HABD)</th>
                    <th class="py-2.5 px-3">Wheel Impact (WILD)</th>
                    <th class="py-2.5 px-3">Bogie Vibration</th>
                    <th class="py-2.5 px-3">Brake Block</th>
                    <th class="py-2.5 px-3">Air Spring</th>
                    <th class="py-2.5 px-3">Bio-Toilet</th>
                    <th class="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
                  ${data.coaches.map(c => `
                    <tr class="hover:bg-slate-50/70">
                      <td class="py-2.5 px-3 font-bold text-[#12355B]">${c.name} (${c.id})</td>
                      <td class="py-2.5 px-3 text-emerald-700 font-bold">${c.health}% <span class="text-[10px] text-slate-400 font-normal">(-${c.deg}%)</span></td>
                      <td class="py-2.5 px-3 text-slate-700">${c.habdTemp}</td>
                      <td class="py-2.5 px-3 text-slate-700">${c.wildImpactKn}</td>
                      <td class="py-2.5 px-3 text-slate-700">${c.bogieVib}</td>
                      <td class="py-2.5 px-3 text-slate-700">${c.brakeBlockMm}</td>
                      <td class="py-2.5 px-3 text-slate-700">${c.airSpringBar}</td>
                      <td class="py-2.5 px-3 text-slate-600 text-[11px]">${c.toiletStatus}</td>
                      <td class="py-2.5 px-3 text-right">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${c.status === 'CERTIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                          ${c.status}
                        </span>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } else if (trainDetailTab === "sensors") {
      tabBodyHtml = `
        <div class="space-y-4">
          <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <span><i class="fa-solid fa-microchip text-emerald-600 mr-1.5"></i> <strong>Physical IoT Sensors Installed & Active Feeds</strong> for ${data.trainNumber} ${data.trainName}</span>
            <span class="font-mono text-emerald-800 font-bold">${data.sensors.length} Sensors Online</span>
          </div>

          <div class="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs font-mono">
                <thead class="text-[10px] bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th class="py-2.5 px-3">Sensor ID</th>
                    <th class="py-2.5 px-3">Sensor Name & Technology</th>
                    <th class="py-2.5 px-3">Installation Location</th>
                    <th class="py-2.5 px-3">Live Feed Value</th>
                    <th class="py-2.5 px-3">Safety Baseline</th>
                    <th class="py-2.5 px-3">Critical Limit</th>
                    <th class="py-2.5 px-3">Health</th>
                    <th class="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
                  ${data.sensors.map(s => `
                    <tr class="hover:bg-slate-50/70">
                      <td class="py-2.5 px-3 font-bold text-[#12355B]">${s.id}</td>
                      <td class="py-2.5 px-3">
                        <strong class="text-slate-800 font-sans block">${s.name}</strong>
                        <span class="text-[10px] text-slate-400 block">${s.type}</span>
                      </td>
                      <td class="py-2.5 px-3 text-slate-600">${s.loc}</td>
                      <td class="py-2.5 px-3 text-emerald-700 font-bold text-sm">${s.liveValue}</td>
                      <td class="py-2.5 px-3 text-slate-500">${s.baseline}</td>
                      <td class="py-2.5 px-3 text-amber-700">${s.threshold}</td>
                      <td class="py-2.5 px-3 text-emerald-700 font-bold">${s.health}%</td>
                      <td class="py-2.5 px-3 text-right">
                        <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          ${s.status}
                        </span>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } else if (trainDetailTab === "speed_profile") {
      tabBodyHtml = `
        <div class="space-y-4">
          <div class="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
            <h5 class="text-xs font-bold text-[#12355B] uppercase tracking-wider flex items-center gap-1.5">
              <i class="fa-solid fa-chart-line text-[#FF9933]"></i> Complete Speed Profile Analytics & Speed Restrictions
            </h5>
            <div class="h-64 relative">
              <canvas id="trainSpeedDeepChart"></canvas>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span class="text-[10px] text-slate-500 block">Past Section Avg Speed</span>
              <strong class="text-xl text-[#12355B]">${data.pastAvgSpeed} km/h</strong>
              <span class="text-[10px] text-slate-400 block mt-0.5">Recorded by Kavach OBC</span>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span class="text-[10px] text-slate-500 block">Current Cruising Speed</span>
              <strong class="text-xl text-emerald-700">${data.currentSpeed} km/h</strong>
              <span class="text-[10px] text-slate-400 block mt-0.5">Optimum Acceleration</span>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span class="text-[10px] text-slate-500 block">Maximum Permissible Speed (MPS)</span>
              <strong class="text-xl text-[#12355B]">${data.mps}</strong>
              <span class="text-[10px] text-slate-400 block mt-0.5">Track Section Limit</span>
            </div>
          </div>
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <!-- Modal Top Bar -->
        <div class="p-4 sm:p-5 bg-gradient-to-r from-[#12355B] to-[#1E4877] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px] font-mono uppercase">${data.type}</span>
              <span class="text-xs text-blue-200 font-mono">LOCO: ${data.locoType} #${data.locoNumber}</span>
            </div>
            <h3 class="text-xl sm:text-2xl font-black font-['Outfit'] mt-1 flex items-center gap-2">
              <i class="fa-solid fa-train text-[#FF9933]"></i> ${data.trainNumber} — ${data.trainName}
            </h3>
            <p class="text-xs text-slate-200 mt-0.5 font-mono">
              Route: <strong>${data.from} (${data.fromName})</strong> ➔ <strong>${data.to} (${data.toName})</strong> • MPS: <strong>${data.mps}</strong>
            </p>
          </div>

          <div class="flex items-center gap-3">
            <div class="text-right">
              <span class="text-[10px] text-blue-200 uppercase font-mono block">Overall Health</span>
              <strong class="text-2xl font-mono text-emerald-400">${data.healthPct}%</strong>
              <span class="text-[10px] text-amber-300 font-mono block">-${data.degPct}% Wear</span>
            </div>
            <button onclick="window.closeTrainMaintenanceDetail()" class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
        </div>

        <!-- Sub-Tabs Navigation inside Modal -->
        <div class="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div class="flex items-center gap-1.5 overflow-x-auto">
            <button onclick="window.setTrainDetailTab('overview')" class="px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${trainDetailTab === 'overview' ? 'bg-[#12355B] text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}">
              <i class="fa-solid fa-gauge mr-1"></i> Locomotive & Overview
            </button>
            <button onclick="window.setTrainDetailTab('coaches')" class="px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${trainDetailTab === 'coaches' ? 'bg-[#12355B] text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}">
              <i class="fa-solid fa-train-subway mr-1"></i> Coaches Breakdown (${data.coachCount})
            </button>
            <button onclick="window.setTrainDetailTab('sensors')" class="px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${trainDetailTab === 'sensors' ? 'bg-[#12355B] text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}">
              <i class="fa-solid fa-microchip mr-1"></i> Sensors Feed (${data.sensors.length})
            </button>
            <button onclick="window.setTrainDetailTab('speed_profile')" class="px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${trainDetailTab === 'speed_profile' ? 'bg-[#12355B] text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'}">
              <i class="fa-solid fa-chart-line mr-1"></i> Speed Analytics
            </button>
          </div>

          <!-- Dual Format Switcher inside Modal -->
          <div class="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl font-mono text-[11px]">
            <button onclick="window.setTrainDetailDisplayMode('charts')" class="px-2 py-1 rounded-lg transition-all cursor-pointer ${trainDetailDisplayMode === 'charts' ? 'bg-white text-[#12355B] font-bold shadow' : 'text-slate-600 hover:text-slate-900'}">
              <i class="fa-solid fa-chart-pie mr-1"></i> Graphs
            </button>
            <button onclick="window.setTrainDetailDisplayMode('table')" class="px-2 py-1 rounded-lg transition-all cursor-pointer ${trainDetailDisplayMode === 'table' ? 'bg-white text-[#12355B] font-bold shadow' : 'text-slate-600 hover:text-slate-900'}">
              <i class="fa-solid fa-table mr-1"></i> Data
            </button>
            <button onclick="window.setTrainDetailDisplayMode('split')" class="px-2 py-1 rounded-lg transition-all cursor-pointer ${trainDetailDisplayMode === 'split' ? 'bg-white text-[#12355B] font-bold shadow' : 'text-slate-600 hover:text-slate-900'}">
              <i class="fa-solid fa-columns mr-1"></i> Both
            </button>
          </div>
        </div>

        <!-- Modal Body Content -->
        <div class="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          ${tabBodyHtml}
        </div>

        <!-- Modal Footer -->
        <div class="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span class="font-mono text-slate-500">Last Certified: ${data.lastDepotInspection}</span>
          <button onclick="window.closeTrainMaintenanceDetail()" class="px-4 py-1.5 rounded-xl bg-[#12355B] hover:bg-[#1D4877] text-white font-bold cursor-pointer shadow">
            Close Terminal
          </button>
        </div>
      </div>
    `;

    // Initialize Chart.js Graphs for Train Detail Modal
    setTimeout(() => {
      if (trainDetailTab === "overview" && (trainDetailDisplayMode === "charts" || trainDetailDisplayMode === "split")) {
        const donutCtx = document.getElementById("trainHealthDonutChart");
        if (donutCtx && window.Chart) {
          new window.Chart(donutCtx, {
            type: "doughnut",
            data: {
              labels: ["Optimal Health", "Degradation Wear"],
              datasets: [{
                data: [data.healthPct, data.degPct],
                backgroundColor: ["#10b981", "#f59e0b"],
                borderWidth: 0
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              cutout: "75%"
            }
          });
        }

        const speedCtx = document.getElementById("trainSpeedProfileChart");
        if (speedCtx && window.Chart) {
          new window.Chart(speedCtx, {
            type: "line",
            data: {
              labels: ["Origin Departure", "Cruising 1", "Section Midpoint", "Cruising 2", "Current Position", "Approach MPS"],
              datasets: [
                {
                  label: "Operating Speed (km/h)",
                  data: [0, data.pastAvgSpeed, data.currentSpeed - 4, data.currentSpeed + 6, data.currentSpeed, data.futureSpeedLimit - 10],
                  borderColor: "#3b82f6",
                  backgroundColor: "rgba(59, 130, 246, 0.1)",
                  borderWidth: 2.5,
                  fill: true,
                  tension: 0.35
                },
                {
                  label: "MPS Speed Ceiling (km/h)",
                  data: [data.futureSpeedLimit, data.futureSpeedLimit, data.futureSpeedLimit, data.futureSpeedLimit, data.futureSpeedLimit, data.futureSpeedLimit],
                  borderColor: "#ef4444",
                  borderDash: [5, 5],
                  borderWidth: 1.5,
                  fill: false
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: "bottom", labels: { font: { size: 10 } } } },
              scales: {
                y: { min: 0, max: 180, grid: { color: "rgba(0,0,0,0.05)" } },
                x: { grid: { display: false } }
              }
            }
          });
        }
      } else if (trainDetailTab === "speed_profile") {
        const deepCtx = document.getElementById("trainSpeedDeepChart");
        if (deepCtx && window.Chart) {
          new window.Chart(deepCtx, {
            type: "line",
            data: {
              labels: ["Km 0", "Km 50", "Km 100", "Km 150", "Km 200", "Km 250", "Km 300", "Km 350", "Km 400"],
              datasets: [
                {
                  label: "Speed Profile (km/h)",
                  data: [0, 85, 110, 130, 125, 110, 135, 140, 130],
                  borderColor: "#10b981",
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  borderWidth: 2,
                  fill: true,
                  tension: 0.3
                },
                {
                  label: "TSR Curve Warning Limit",
                  data: [130, 130, 130, 130, 130, 110, 130, 140, 130],
                  borderColor: "#f59e0b",
                  borderWidth: 1.5,
                  borderDash: [4, 4],
                  fill: false
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: { y: { min: 0, max: 160 } }
            }
          });
        }
      }
    }, 50);
  }

  // Main Render Workspace Entry Point
  window.renderMaintenanceEngineerWorkspace = function (container) {
    if (!container) return;

    let contentHtml = "";

    // -----------------------------------------------------------------------
    // SUB-TAB 1: TRAIN & ROLLING STOCK FLEET HEALTH
    // -----------------------------------------------------------------------
    if (activeMaintSubTab === "train_fleet") {
      const allTrains = getTrainsList();

      // Filter by query and type
      let filteredTrains = allTrains.filter(t => {
        const matchesQuery = !fleetSearchQuery ||
          (t.number && t.number.includes(fleetSearchQuery)) ||
          (t.name && t.name.toLowerCase().includes(fleetSearchQuery)) ||
          (t.fromName && t.fromName.toLowerCase().includes(fleetSearchQuery)) ||
          (t.toName && t.toName.toLowerCase().includes(fleetSearchQuery));

        if (!matchesQuery) return false;

        if (fleetTypeFilter === "ALL") return true;
        if (fleetTypeFilter === "VANDE_BHARAT") return (t.name && t.name.toUpperCase().includes("VANDE")) || (t.number && t.number.startsWith("224") || t.number.startsWith("206"));
        if (fleetTypeFilter === "RAJDHANI") return (t.name && t.name.toUpperCase().includes("RAJDHANI"));
        if (fleetTypeFilter === "SHATABDI") return (t.name && t.name.toUpperCase().includes("SHATABDI"));
        if (fleetTypeFilter === "EXPRESS") return (t.type && t.type.toUpperCase().includes("EXPRESS")) || (t.type && t.type.toUpperCase().includes("SUPERFAST"));
        if (fleetTypeFilter === "FREIGHT") return (t.type && t.type.toUpperCase().includes("FREIGHT")) || (t.name && t.name.toUpperCase().includes("GOODS"));
        if (fleetTypeFilter === "SUBURBAN") return (t.type && t.type.toUpperCase().includes("PASSENGER")) || (t.type && t.type.toUpperCase().includes("SUBURBAN"));
        return true;
      });

      // Limit display for high performance (first 36 trains)
      const displayTrains = filteredTrains.slice(0, 36);

      contentHtml = `
        <div class="space-y-4">
          <!-- Filter, Search & View Switcher Bar -->
          <div class="glass-card p-4 sm:p-5 space-y-3">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                  <i class="fa-solid fa-train text-[#FF9933]"></i> All-India Train & Rolling Stock Health Center
                </h3>
                <p class="text-xs text-slate-500">Live health monitoring, engine diagnostics, coach matrix & fitted sensor telemetry for all 5,208 Indian Railways trains</p>
              </div>

              <!-- Dual Mode Switcher -->
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-600 font-sans">View Mode:</span>
                <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300 font-mono text-xs">
                  <button onclick="window.setFleetDisplayMode('cards')" class="px-3 py-1.5 rounded-lg transition-all cursor-pointer ${fleetDisplayMode === 'cards' ? 'bg-[#12355B] text-white font-bold shadow' : 'text-slate-700 hover:text-black'}">
                    <i class="fa-solid fa-grip mr-1"></i> Visual Cards
                  </button>
                  <button onclick="window.setFleetDisplayMode('table')" class="px-3 py-1.5 rounded-lg transition-all cursor-pointer ${fleetDisplayMode === 'table' ? 'bg-[#12355B] text-white font-bold shadow' : 'text-slate-700 hover:text-black'}">
                    <i class="fa-solid fa-table-list mr-1"></i> Data Table
                  </button>
                  <button onclick="window.setFleetDisplayMode('split')" class="px-3 py-1.5 rounded-lg transition-all cursor-pointer ${fleetDisplayMode === 'split' ? 'bg-[#12355B] text-white font-bold shadow' : 'text-slate-700 hover:text-black'}">
                    <i class="fa-solid fa-columns mr-1"></i> Split (Both)
                  </button>
                </div>
              </div>
            </div>

            <!-- Search Bar & Category Chips -->
            <div class="flex flex-col sm:flex-row items-center gap-3">
              <div class="relative w-full sm:w-80">
                <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                <input
                  type="text"
                  placeholder="Search train no, name or station..."
                  value="${fleetSearchQuery}"
                  oninput="window.filterMaintFleet(this.value)"
                  class="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#12355B] focus:border-[#12355B] outline-none"
                />
              </div>

              <!-- Filter Chips -->
              <div class="flex items-center gap-1.5 overflow-x-auto w-full no-scrollbar text-xs">
                <button onclick="window.setFleetTypeFilter('ALL')" class="px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-all ${fleetTypeFilter === 'ALL' ? 'bg-[#12355B] text-white font-bold shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 font-medium'}">
                  All Trains (${allTrains.length})
                </button>
                <button onclick="window.setFleetTypeFilter('VANDE_BHARAT')" class="px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-all ${fleetTypeFilter === 'VANDE_BHARAT' ? 'bg-[#12355B] text-white font-bold shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 font-medium'}">
                  🚄 Vande Bharat
                </button>
                <button onclick="window.setFleetTypeFilter('RAJDHANI')" class="px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-all ${fleetTypeFilter === 'RAJDHANI' ? 'bg-[#12355B] text-white font-bold shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 font-medium'}">
                  👑 Rajdhani
                </button>
                <button onclick="window.setFleetTypeFilter('SHATABDI')" class="px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-all ${fleetTypeFilter === 'SHATABDI' ? 'bg-[#12355B] text-white font-bold shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 font-medium'}">
                  ⚡ Shatabdi
                </button>
                <button onclick="window.setFleetTypeFilter('EXPRESS')" class="px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-all ${fleetTypeFilter === 'EXPRESS' ? 'bg-[#12355B] text-white font-bold shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 font-medium'}">
                  🚂 Mail & Express
                </button>
                <button onclick="window.setFleetTypeFilter('FREIGHT')" class="px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer transition-all ${fleetTypeFilter === 'FREIGHT' ? 'bg-[#12355B] text-white font-bold shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 font-medium'}">
                  📦 Freight & Rakes
                </button>
              </div>
            </div>
          </div>

          <!-- Visual Summary Cards & Chart (when mode is cards or split) -->
          ${(fleetDisplayMode === "cards" || fleetDisplayMode === "split") ? `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              ${displayTrains.map(t => {
                const hd = getTrainHealthData(t);
                return `
                  <div onclick="window.openTrainMaintenanceDetail('${t.number}')" class="glass-card p-4 hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer space-y-3 relative group">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div>
                        <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-black font-mono text-[10px]">${t.number}</span>
                        <span class="text-[11px] font-bold text-slate-500 ml-1 uppercase">${t.type || 'Express'}</span>
                      </div>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${hd.riskClass}">${hd.riskLevel}</span>
                    </div>

                    <div>
                      <h4 class="font-bold text-sm text-[#12355B] group-hover:text-blue-600 transition-colors truncate">${t.name}</h4>
                      <p class="text-xs text-slate-500 font-mono mt-0.5">${hd.from} ➔ ${hd.to} (${t.distance || '1,200'} km)</p>
                    </div>

                    <!-- Health & Engine Metrics -->
                    <div class="grid grid-cols-3 gap-2 text-center text-xs font-mono p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <div>
                        <span class="text-[9px] text-slate-400 block">Health</span>
                        <strong class="text-emerald-700 text-sm">${hd.healthPct}%</strong>
                      </div>
                      <div>
                        <span class="text-[9px] text-slate-400 block">Degraded</span>
                        <strong class="text-amber-700 text-sm">-${hd.degPct}%</strong>
                      </div>
                      <div>
                        <span class="text-[9px] text-slate-400 block">Cruising</span>
                        <strong class="text-[#12355B] text-sm">${hd.currentSpeed} km/h</strong>
                      </div>
                    </div>

                    <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span class="text-[11px] text-slate-600 font-mono">Loco: <strong>${hd.locoType.split(" ")[0]} #${hd.locoNumber}</strong></span>
                      <button class="px-2.5 py-1 rounded bg-[#12355B] text-white font-bold text-[10px] group-hover:bg-blue-700 transition-all">
                        Inspect Health & Sensors <i class="fa-solid fa-arrow-right ml-1"></i>
                      </button>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          ` : ''}

          <!-- Structured High-Density Data Table (when mode is table or split) -->
          ${(fleetDisplayMode === "table" || fleetDisplayMode === "split") ? `
            <div class="glass-card p-4 sm:p-5 space-y-3">
              <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 class="text-xs font-bold text-[#12355B] uppercase tracking-wider flex items-center gap-1.5">
                  <i class="fa-solid fa-table-list text-emerald-600"></i> Structured Fleet Rolling Stock Health Register (${filteredTrains.length} Trains)
                </h4>
                <span class="text-xs font-mono text-slate-500">Click any row to open full train dashboard</span>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs font-mono">
                  <thead class="text-[10px] font-black text-slate-600 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th class="py-2.5 px-3">Train No</th>
                      <th class="py-2.5 px-3">Train Name</th>
                      <th class="py-2.5 px-3">Locomotive Class</th>
                      <th class="py-2.5 px-3">Operating Speed</th>
                      <th class="py-2.5 px-3">Health Index</th>
                      <th class="py-2.5 px-3">Degradation</th>
                      <th class="py-2.5 px-3">Sensors Status</th>
                      <th class="py-2.5 px-3">Risk Assessment</th>
                      <th class="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
                    ${displayTrains.map(t => {
                      const hd = getTrainHealthData(t);
                      return `
                        <tr onclick="window.openTrainMaintenanceDetail('${t.number}')" class="hover:bg-blue-50/70 transition-colors cursor-pointer">
                          <td class="py-2.5 px-3 font-bold text-[#12355B]">${t.number}</td>
                          <td class="py-2.5 px-3 font-sans font-bold text-slate-800 truncate max-w-[200px]">${t.name}</td>
                          <td class="py-2.5 px-3 text-slate-600">${hd.locoType}</td>
                          <td class="py-2.5 px-3">
                            <span class="text-emerald-700 font-bold">${hd.currentSpeed} km/h</span>
                            <span class="text-[10px] text-slate-400 block font-normal">MPS: ${hd.mps}</span>
                          </td>
                          <td class="py-2.5 px-3 text-emerald-700 font-bold">${hd.healthPct}%</td>
                          <td class="py-2.5 px-3 text-amber-700 font-bold">-${hd.degPct}%</td>
                          <td class="py-2.5 px-3">
                            <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">9 SENSORS OK</span>
                          </td>
                          <td class="py-2.5 px-3">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${hd.riskClass}">${hd.riskLevel}</span>
                          </td>
                          <td class="py-2.5 px-3 text-right">
                            <button class="px-2.5 py-1 rounded bg-[#12355B] hover:bg-[#1D4877] text-white text-[10px] font-bold">
                              Open Board
                            </button>
                          </td>
                        </tr>
                      `;
                    }).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }

    // -----------------------------------------------------------------------
    // SUB-TAB 2: PAN-INDIA 68,000 KM TRACK HEALTH & INTER-STATION NETWORK
    // -----------------------------------------------------------------------
    else if (activeMaintSubTab === "pway_network") {
      const activeCorridor = irCorridors[trackCorridorId] || irCorridors["ndls_bpl"];

      contentHtml = `
        <div class="space-y-4">
          <!-- Corridor Selector & 68,000 km Overview Header -->
          <div class="glass-card p-4 sm:p-5 space-y-4">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                  <i class="fa-solid fa-route text-[#FF9933]"></i> Pan-India 68,000 km Inter-Station Connected Track Network
                </h3>
                <p class="text-xs text-slate-500">Continuous station-to-station track health, degradation analytics, trackside IoT sensors (DAS, CORPS, RTD, WIM) & defects</p>
              </div>

              <!-- Dual Mode Switcher -->
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-600 font-sans">View Format:</span>
                <div class="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300 font-mono text-xs">
                  <button onclick="window.setTrackDisplayMode('graphs')" class="px-3 py-1.5 rounded-lg transition-all cursor-pointer ${trackDisplayMode === 'graphs' ? 'bg-[#12355B] text-white font-bold shadow' : 'text-slate-700 hover:text-black'}">
                    <i class="fa-solid fa-chart-area mr-1"></i> Visual Graphs
                  </button>
                  <button onclick="window.setTrackDisplayMode('table')" class="px-3 py-1.5 rounded-lg transition-all cursor-pointer ${trackDisplayMode === 'table' ? 'bg-[#12355B] text-white font-bold shadow' : 'text-slate-700 hover:text-black'}">
                    <i class="fa-solid fa-table-cells mr-1"></i> Data Tables
                  </button>
                  <button onclick="window.setTrackDisplayMode('split')" class="px-3 py-1.5 rounded-lg transition-all cursor-pointer ${trackDisplayMode === 'split' ? 'bg-[#12355B] text-white font-bold shadow' : 'text-slate-700 hover:text-black'}">
                    <i class="fa-solid fa-columns mr-1"></i> Both
                  </button>
                </div>
              </div>
            </div>

            <!-- Predefined Trunk Corridors Selector Chips -->
            <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              <span class="font-bold text-slate-700 shrink-0">Trunk Corridors:</span>
              ${Object.keys(irCorridors).map(cKey => {
                const corr = irCorridors[cKey];
                const isSel = cKey === trackCorridorId;
                return `
                  <button onclick="window.selectTrackCorridor('${cKey}')" class="px-3 py-1.5 rounded-xl shrink-0 font-bold cursor-pointer transition-all ${isSel ? 'bg-[#12355B] text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'}">
                    ${corr.name.split("(")[0].trim()}
                  </button>
                `;
              }).join("")}
            </div>

            <!-- Custom Station-to-Station Search Across all 8,990 Stations -->
            <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div class="flex items-center gap-2 flex-wrap text-xs">
                <span class="font-bold text-[#12355B] flex items-center gap-1">
                  <i class="fa-solid fa-magnifying-glass-location text-blue-600"></i> Station-to-Station Connected Track Search:
                </span>
                <input id="customStationAInput" type="text" placeholder="From (e.g. NDLS)" value="${customStationA}" class="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold uppercase text-xs" />
                <span class="text-slate-400">➔</span>
                <input id="customStationBInput" type="text" placeholder="To (e.g. MTJ)" value="${customStationB}" class="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono font-bold uppercase text-xs" />
                <button onclick="window.searchCustomStationPair()" class="px-3 py-1.5 rounded-lg bg-[#12355B] hover:bg-[#1D4877] text-white font-bold text-xs cursor-pointer shadow">
                  Inspect Inter-Station Track
                </button>
              </div>

              <div class="text-xs font-mono text-slate-600 shrink-0">
                Coverage: <strong class="text-emerald-700">68,000+ Route Km (100% Interconnected)</strong>
              </div>
            </div>
          </div>

          <!-- Visual Graphs & Chart Panel -->
          ${(trackDisplayMode === "graphs" || trackDisplayMode === "split") ? `
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <!-- TQI Elevation & Quality Chart -->
              <div class="lg:col-span-8 glass-card p-4 sm:p-5 space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold text-[#12355B] uppercase tracking-wider flex items-center gap-1.5">
                    <i class="fa-solid fa-chart-line text-blue-600"></i> Continuous Track Quality Index (TQI) along ${activeCorridor.name.split("(")[0]}
                  </h4>
                  <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                    Avg TQI: ${activeCorridor.overallHealth} (SUPERIOR)
                  </span>
                </div>
                <div class="h-56 relative">
                  <canvas id="corridorTqiChart"></canvas>
                </div>
              </div>

              <!-- Degradation & Rail Wear Chart -->
              <div class="lg:col-span-4 glass-card p-4 sm:p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <h4 class="text-xs font-bold text-[#12355B] uppercase tracking-wider flex items-center gap-1.5">
                    <i class="fa-solid fa-chart-pie text-amber-600"></i> Track Health vs Degradation
                  </h4>
                  <div class="h-44 relative flex items-center justify-center mt-2">
                    <canvas id="trackHealthDonut"></canvas>
                  </div>
                </div>

                <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono space-y-1">
                  <div class="flex justify-between">
                    <span class="text-slate-500">Corridor Route Distance:</span>
                    <strong class="text-[#12355B]">${activeCorridor.distanceKm} km</strong>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-500">Permissible Speed:</span>
                    <strong class="text-emerald-700">${activeCorridor.mps}</strong>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-500">Railway Zones:</span>
                    <strong class="text-slate-700">${activeCorridor.zone}</strong>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Structured Station-to-Station Track Data Table -->
          ${(trackDisplayMode === "table" || trackDisplayMode === "split") ? `
            <div class="glass-card p-4 sm:p-5 space-y-3">
              <div class="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 class="text-xs font-bold text-[#12355B] uppercase tracking-wider flex items-center gap-1.5">
                  <i class="fa-solid fa-table text-emerald-600"></i> Connected Station-to-Station Track Section Registry
                </h4>
                <span class="text-xs font-mono text-slate-500">${activeCorridor.sections.length} Interconnected Sections</span>
              </div>

              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs font-mono">
                  <thead class="text-[10px] font-black text-slate-600 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th class="py-2.5 px-3">Station Pair (Section)</th>
                      <th class="py-2.5 px-3">Distance</th>
                      <th class="py-2.5 px-3">Rail & Sleeper Specs</th>
                      <th class="py-2.5 px-3">Health Index</th>
                      <th class="py-2.5 px-3">Degradation</th>
                      <th class="py-2.5 px-3">Track Gauge</th>
                      <th class="py-2.5 px-3">Cant / Twist</th>
                      <th class="py-2.5 px-3">TQI Index</th>
                      <th class="py-2.5 px-3">Defects & Notes</th>
                      <th class="py-2.5 px-3 text-right">Sensors</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100 font-medium text-slate-800">
                    ${activeCorridor.sections.map(sec => `
                      <tr class="hover:bg-blue-50/70 transition-colors">
                        <td class="py-2.5 px-3 font-bold text-[#12355B]">
                          ${sec.from} ➔ ${sec.to}
                        </td>
                        <td class="py-2.5 px-3">${sec.dist} km</td>
                        <td class="py-2.5 px-3 font-sans text-slate-600">
                          <strong>${sec.rail}</strong>
                          <span class="block text-[10px] text-slate-400 font-mono">${sec.sleeper}</span>
                        </td>
                        <td class="py-2.5 px-3 text-emerald-700 font-bold">${sec.health}%</td>
                        <td class="py-2.5 px-3 text-amber-700 font-bold">-${sec.deg}%</td>
                        <td class="py-2.5 px-3 font-bold ${sec.gauge.includes('-') ? 'text-blue-700' : 'text-[#12355B]'}">${sec.gauge}</td>
                        <td class="py-2.5 px-3 text-slate-700">${sec.cant} / ${sec.twist}</td>
                        <td class="py-2.5 px-3 text-emerald-700 font-bold">${sec.tqi.split(" ")[0]}</td>
                        <td class="py-2.5 px-3 font-sans text-slate-600 text-[11px] max-w-[200px] truncate">
                          ${sec.issues[0] || 'Clear'}
                        </td>
                        <td class="py-2.5 px-3 text-right">
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${sec.sensorStatus === 'OPTIMAL' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                            ${sec.sensorStatus}
                          </span>
                        </td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Trackside Continuous Sensors Telemetry Matrix -->
            <div class="glass-card p-4 sm:p-5 space-y-3">
              <h4 class="text-xs font-bold text-[#12355B] uppercase tracking-wider flex items-center gap-1.5">
                <i class="fa-solid fa-satellite-dish text-blue-600"></i> Trackside Physical IoT Sensor Feeds Deployed on Inter-Station Network
              </h4>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
                <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div class="flex items-center justify-between font-bold">
                    <span class="text-[#12355B]">Distributed Acoustic Sensing (DAS)</span>
                    <span class="text-emerald-700 text-[10px]">ACTIVE</span>
                  </div>
                  <p class="text-[11px] font-sans text-slate-600">Fiber Optic Acoustic Continuous Broken Rail Monitor</p>
                  <div class="text-[11px] text-slate-700 pt-1 border-t border-slate-200">
                    <p>Optical Power: <strong class="text-emerald-700">-12.4 dBm (Normal)</strong></p>
                    <p>Acoustic Signature: <strong class="text-[#12355B]">No rail fracture echoes</strong></p>
                  </div>
                </div>

                <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div class="flex items-center justify-between font-bold">
                    <span class="text-[#12355B]">Continuous Optical Rail Profile (CORPS)</span>
                    <span class="text-emerald-700 text-[10px]">LASER ON</span>
                  </div>
                  <p class="text-[11px] font-sans text-slate-600">Laser Railhead Profile & Wear Scanner</p>
                  <div class="text-[11px] text-slate-700 pt-1 border-t border-slate-200">
                    <p>Vertical Railhead Wear: <strong class="text-emerald-700">1.8 mm (Limit 8.0mm)</strong></p>
                    <p>Gauge Face Angle: <strong class="text-[#12355B]">68° (Nominal)</strong></p>
                  </div>
                </div>

                <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div class="flex items-center justify-between font-bold">
                    <span class="text-[#12355B]">Track Rail Thermistors (RTD PT100)</span>
                    <span class="text-emerald-700 text-[10px]">ONLINE</span>
                  </div>
                  <p class="text-[11px] font-sans text-slate-600">Surface Welded Continuous Rail Temperature Transducer</p>
                  <div class="text-[11px] text-slate-700 pt-1 border-t border-slate-200">
                    <p>Live Rail Temp ($T_{rail}$): <strong class="text-amber-700 font-bold">47.8°C</strong></p>
                    <p>Thermal Buckling Risk: <strong class="text-emerald-700">SAFE ($T_{rail} &lt; 55^\circ\text{C}$)</strong></p>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    }

    // -----------------------------------------------------------------------
    // SUB-TAB 3: S&T SIGNAL & TELECOM DIAGNOSTICS
    // -----------------------------------------------------------------------
    else if (activeMaintSubTab === "s_and_t") {
      contentHtml = `
        <div class="space-y-4">
          <div class="glass-card p-5 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                  <i class="fa-solid fa-tower-cell text-cyan-600"></i> Signal & Telecommunication (S&T) Diagnostics Terminal
                </h3>
                <p class="text-xs text-slate-500">Point Machine throw currents, Dual Axle Counter (DAC) voltages, Track Circuits & Kavach RFID Tag Grid</p>
              </div>
              <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-bold">ALL S&T SYSTEMS 100% HEALTHY</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div class="flex items-center justify-between font-bold">
                  <span class="text-[#12355B]">Point Machine #102A</span>
                  <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">NORMAL</span>
                </div>
                <p class="text-slate-600 font-sans text-[11px]">NDLS 1:32 Turnout Point</p>
                <div class="space-y-1 text-[11px] pt-2 border-t border-slate-200">
                  <p>Throw Time: <strong class="text-[#12355B]">2.8s</strong></p>
                  <p>Peak Current: <strong class="text-emerald-700">2.6 A</strong> (Limit 3.5A)</p>
                  <p>Clutch Slipping: <strong class="text-emerald-700">NORMAL</strong></p>
                </div>
              </div>

              <div class="p-4 rounded-2xl border-2 border-amber-300 bg-amber-50/50 space-y-2">
                <div class="flex items-center justify-between font-bold">
                  <span class="text-amber-900">Point Machine #104B</span>
                  <span class="px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px]">OBSTRUCTION</span>
                </div>
                <p class="text-slate-600 font-sans text-[11px]">NZM Facing Point Turnout</p>
                <div class="space-y-1 text-[11px] pt-2 border-t border-amber-200">
                  <p>Throw Time: <strong class="text-red-600">4.2s (Slow)</strong></p>
                  <p>Peak Current: <strong class="text-red-600">4.8 A (High)</strong></p>
                  <p>Ballast Stone Obstruction Suspected</p>
                </div>
              </div>

              <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div class="flex items-center justify-between font-bold">
                  <span class="text-[#12355B]">Axle Counter #4B</span>
                  <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">SYNCHRONIZED</span>
                </div>
                <p class="text-slate-600 font-sans text-[11px]">NDLS - NZM Block In</p>
                <div class="space-y-1 text-[11px] pt-2 border-t border-slate-200">
                  <p>Transducer Tx/Rx: <strong class="text-emerald-700">1.45 V AC</strong></p>
                  <p>Wheel Count In: <strong class="text-[#12355B]">72</strong></p>
                  <p>Wheel Count Out: <strong class="text-[#12355B]">72 (Match)</strong></p>
                </div>
              </div>

              <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div class="flex items-center justify-between font-bold">
                  <span class="text-[#12355B]">IPS DC Bus System</span>
                  <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">FLOAT 100%</span>
                </div>
                <p class="text-slate-600 font-sans text-[11px]">NDLS Cabin Central Power</p>
                <div class="space-y-1 text-[11px] pt-2 border-t border-slate-200">
                  <p>Signal Bus: <strong class="text-[#12355B]">110V DC (112.4V)</strong></p>
                  <p>Relay Bus: <strong class="text-[#12355B]">24V DC (24.1V)</strong></p>
                  <p>Axle Counter Bus: <strong class="text-[#12355B]">12V DC (12.0V)</strong></p>
                </div>
              </div>
            </div>

            <!-- Kavach RFID Transponders Inventory -->
            <div class="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-[#12355B] text-xs flex items-center gap-2">
                  <i class="fa-solid fa-tags text-[#FF9933]"></i> Kavach Trackside RFID Transponder Balise Inventory (Delhi Division)
                </h4>
                <span class="text-[11px] font-mono text-slate-500">242 Tags Programmed (100% Active)</span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-[#12355B]">TAG-001 (Km 0/2)</span>
                    <span class="text-[10px] text-emerald-700">OK</span>
                  </div>
                  <p class="text-[10px] text-slate-500 font-sans">NDLS Starter Signal Link</p>
                </div>
                <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-[#12355B]">TAG-002 (Km 2/4)</span>
                    <span class="text-[10px] text-emerald-700">OK</span>
                  </div>
                  <p class="text-[10px] text-slate-500 font-sans">Shivaji Bridge Approach</p>
                </div>
                <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-[#12355B]">TAG-003 (Km 4/8)</span>
                    <span class="text-[10px] text-emerald-700">OK</span>
                  </div>
                  <p class="text-[10px] text-slate-500 font-sans">Tilak Bridge Auto Signal</p>
                </div>
                <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-[#12355B]">TAG-004 (Km 13/8)</span>
                    <span class="text-[10px] text-emerald-700">OK</span>
                  </div>
                  <p class="text-[10px] text-slate-500 font-sans">NZM Home Signal In</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // -----------------------------------------------------------------------
    // SUB-TAB 4: USFD OSCILLOSCOPE
    // -----------------------------------------------------------------------
    else if (activeMaintSubTab === "usfd") {
      contentHtml = `
        <div class="space-y-4">
          <div class="glass-card p-5 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                  <i class="fa-solid fa-wave-square text-[#FF9933]"></i> USFD Real-Time Digital Ultrasonic A-Scan Oscilloscope
                </h3>
                <p class="text-xs text-slate-500">Real-time flaw reflection telemetry with RDSO calibrated probe transducers (Head, Web & Foot)</p>
              </div>

              <div class="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span class="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                  <i class="fa-solid fa-satellite-dish mr-1"></i> Transducer Active
                </span>
                <span id="activeUsfdProbeLabel" class="px-3 py-1 rounded-lg bg-[#12355B] text-white font-bold">${usfdFreq}</span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="font-bold text-slate-700 text-xs">Probe Type:</span>
              <button onclick="window.setUsfdProbe('4.0 MHz (70° Head Flaw)')" class="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-800">
                70° Head Probe (Transverse Cracks)
              </button>
              <button onclick="window.setUsfdProbe('2.0 MHz (0° Web/Foot)')" class="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-800">
                0° Normal Probe (Web & Bolt Holes)
              </button>
              <button onclick="window.setUsfdProbe('2.5 MHz (45° Bolt Hole)')" class="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-bold text-slate-800">
                45° Angular Probe (Bolt Hole Star Cracks)
              </button>

              <div class="ml-auto flex items-center gap-2 font-mono">
                <span class="text-slate-600 font-bold">Gain:</span>
                <button onclick="window.adjustUsfdGain(-2)" class="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 font-bold">-</button>
                <span id="usfdGainLabel" class="px-2 py-0.5 rounded bg-slate-100 border font-bold text-[#12355B]">${usfdGain} dB</span>
                <button onclick="window.adjustUsfdGain(2)" class="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 font-bold">+</button>
              </div>
            </div>

            <!-- Oscilloscope Canvas Box -->
            <div class="h-64 w-full rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl relative">
              <canvas id="usfdOscilloscopeCanvas" class="w-full h-full block"></canvas>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <div class="flex items-center justify-between font-bold text-emerald-900">
                  <span>OBS (Observe & Monitor)</span>
                  <span class="font-mono">Flaw &lt; 20% FSH</span>
                </div>
                <p class="text-slate-600 text-[11px] mt-1">Flaw detected at Km 14/2 is non-critical fatigue flaw. Re-test in 15 days.</p>
              </div>

              <div class="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <div class="flex items-center justify-between font-bold text-amber-900">
                  <span>REM (Remove within 3 Days)</span>
                  <span class="font-mono">Flaw 20-50% FSH</span>
                </div>
                <p class="text-slate-600 text-[11px] mt-1">Jogged fishplate to be clamped immediately at 30 km/h restriction.</p>
              </div>

              <div class="p-3.5 rounded-xl bg-red-50 border border-red-200">
                <div class="flex items-center justify-between font-bold text-red-900">
                  <span>IMR (Immediate Rail Removal)</span>
                  <span class="font-mono">Flaw &gt; 50% FSH</span>
                </div>
                <p class="text-slate-600 text-[11px] mt-1">Impose emergency stop or 15 km/h pass until piece renewed.</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // -----------------------------------------------------------------------
    // SUB-TAB 5: 25 kV AC OHE SCADA
    // -----------------------------------------------------------------------
    else if (activeMaintSubTab === "ohe") {
      contentHtml = `
        <div class="space-y-4">
          <div class="glass-card p-5 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                  <i class="fa-solid fa-bolt text-[#FF9933]"></i> 25 kV AC 50 Hz Traction SCADA & Overhead Equipment (OHE)
                </h3>
                <p class="text-xs text-slate-500">Traction Substation (TSS), Sectioning Posts (SP), Catenary height, stagger & Power Block permits</p>
              </div>
              <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-bold">TRACTION GRID VOLTAGE 24.8 kV ACTIVE</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <span class="text-[10px] text-slate-500 font-sans font-bold uppercase">Traction Substation (TSS Nizamuddin)</span>
                <strong class="text-2xl text-[#12355B] block">24.8 kV AC</strong>
                <div class="text-[11px] text-slate-600 space-y-0.5 pt-2 border-t border-slate-200">
                  <p>Feeder Current: <strong class="text-emerald-700">420 A</strong></p>
                  <p>Frequency: <strong class="text-[#12355B]">50.02 Hz</strong></p>
                  <p>Circuit Breaker CB-101: <strong class="text-emerald-700">CLOSED</strong></p>
                </div>
              </div>

              <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <span class="text-[10px] text-slate-500 font-sans font-bold uppercase">Catenary Wire Geometry</span>
                <strong class="text-2xl text-[#12355B] block">5.55 m Height</strong>
                <div class="text-[11px] text-slate-600 space-y-0.5 pt-2 border-t border-slate-200">
                  <p>Contact Wire Stagger: <strong class="text-emerald-700">+180 mm (Limit ±200)</strong></p>
                  <p>Wire Tension: <strong class="text-[#12355B]">1000 kgf (Auto-Tensioned)</strong></p>
                  <p>Contact Wire Area: <strong class="text-emerald-700">98 mm² (Min 74 mm²)</strong></p>
                </div>
              </div>

              <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <span class="text-[10px] text-slate-500 font-sans font-bold uppercase">Neutral Section & Auto Power Cut</span>
                <strong class="text-2xl text-emerald-700 block">CLEAR & TESTED</strong>
                <div class="text-[11px] text-slate-600 space-y-0.5 pt-2 border-t border-slate-200">
                  <p>Location: <strong class="text-[#12355B]">Km 14/2 (NDLS-NZM)</strong></p>
                  <p>Insulator Condition: <strong class="text-emerald-700">CLEAN (No Flashover)</strong></p>
                  <p>Loco Auto DJ Cut-out: <strong class="text-emerald-700">PASS (Kavach Tagged)</strong></p>
                </div>
              </div>
            </div>

            <div class="p-4 rounded-2xl border-2 border-amber-300 bg-amber-50/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 class="font-bold text-[#12355B] text-xs flex items-center gap-2">
                  <i class="fa-solid fa-triangle-exclamation text-amber-600"></i> OHE Power Block Permit-to-Work (PTW-8812 Active)
                </h4>
                <p class="text-xs text-slate-600 mt-0.5">Section isolated: NDLS-NZM Up Main Km 14/2. Earth discharge rods clamped. Safe for maintenance crew.</p>
              </div>
              <button onclick="if(window.showToast) window.showToast('Verified OHE Earth Discharge Rod Placement at Mast 14/08', 'success')" class="px-4 py-2 rounded-xl bg-[#12355B] hover:bg-[#1D4877] text-white font-bold text-xs shadow transition-all shrink-0">
                Verify Earth Clamping
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // -----------------------------------------------------------------------
    // SUB-TAB 6: P-WAY WORK ORDERS
    // -----------------------------------------------------------------------
    else if (activeMaintSubTab === "work_orders") {
      contentHtml = `
        <div class="glass-card p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                <i class="fa-solid fa-clipboard-list text-amber-600"></i> P-Way Track Repair Work Order Dispatcher
              </h3>
              <p class="text-xs text-slate-500">Manage, assign and track status of track maintenance repair tasks across Delhi Division</p>
            </div>
            <button onclick="window.openNewMaintOrderModal()" class="px-3.5 py-2 rounded-xl bg-[#12355B] hover:bg-[#1D4877] text-white font-bold text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer">
              <i class="fa-solid fa-plus"></i> Dispatch New Repair Order
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-[10px] font-black text-slate-600 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="py-3 px-3">Order ID</th>
                  <th class="py-3 px-3">Track Location</th>
                  <th class="py-3 px-3">Defect Description</th>
                  <th class="py-3 px-3">Priority</th>
                  <th class="py-3 px-3">Safety Permit</th>
                  <th class="py-3 px-3">Assigned Crew</th>
                  <th class="py-3 px-3">Status</th>
                  <th class="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-semibold text-slate-800">
                ${maintWorkOrders.map((wo, idx) => `
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 px-3 font-mono font-bold text-[#12355B]">${wo.id}</td>
                    <td class="py-3 px-3 text-slate-700">${wo.location}</td>
                    <td class="py-3 px-3 font-medium text-slate-800">${wo.defect}</td>
                    <td class="py-3 px-3">
                      <span class="px-2 py-0.5 rounded text-[10px] font-extrabold border ${wo.priorityClass}">${wo.priority}</span>
                    </td>
                    <td class="py-3 px-3 font-mono text-blue-700">${wo.safetyPermit}</td>
                    <td class="py-3 px-3 text-slate-600 font-medium">${wo.crew}</td>
                    <td class="py-3 px-3">
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${wo.statusClass}">${wo.status}</span>
                    </td>
                    <td class="py-3 px-3 text-right">
                      <button onclick="window.toggleWorkOrderStatus(${idx})" class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[#12355B] font-bold text-[11px] border border-slate-300">
                        Update Status
                      </button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // Outer Shell Assembly
    container.innerHTML = `
      <div class="space-y-5">
        <!-- Top Action Header Banner -->
        <div class="glass-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-8 border-amber-500 shadow-md">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider font-mono">MAINTENANCE ENGINEERING DEPARTMENT HUB</span>
              <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">PAN-INDIA 68,000 KM NETWORK</span>
            </div>
            <h2 class="text-2xl font-black text-[#12355B] font-['Outfit'] mt-1 flex items-center gap-2">
              🛠️ Rolling Stock Health, 68,000 km Track & S&T Engineering Terminal
            </h2>
            <p class="text-xs text-slate-600 font-medium">Full fleet health dashboards, coach-by-coach telemetry, physical sensors feeds, inter-station connected track network & USFD oscilloscope</p>
            <div id="maintWeatherPill" class="mt-2 flex items-center gap-2 flex-wrap text-[11px] font-mono">
              <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1.5 font-bold">
                <i class="fa-solid fa-spinner fa-spin text-amber-500"></i>
                <span>Track Sensor Weather Telemetry: Polling Open-Meteo Satellite...</span>
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 text-xs shrink-0">
            <button onclick="window.openNewMaintOrderModal()" class="px-4 py-2.5 rounded-xl bg-[#12355B] hover:bg-[#1D4877] text-white font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer">
              <i class="fa-solid fa-plus"></i> Dispatch Repair Order
            </button>
            <button onclick="if(window.showToast) window.showToast('Calibrated All USFD Dual Probes against Standard Steel Rail Block', 'success')" class="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer">
              <i class="fa-solid fa-wave-square"></i> Calibrate USFD Probes
            </button>
          </div>
        </div>

        <!-- Sub-Tabs Navigation Bar -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button type="button" onclick="switchMaintSubTab('train_fleet')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeMaintSubTab === 'train_fleet' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-train text-[#FF9933] mr-1.5"></i> Train & Rolling Stock Health
          </button>
          <button type="button" onclick="switchMaintSubTab('pway_network')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeMaintSubTab === 'pway_network' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-route text-[#FF9933] mr-1.5"></i> 68,000 km Track & Inter-Station Health
          </button>
          <button type="button" onclick="switchMaintSubTab('s_and_t')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeMaintSubTab === 's_and_t' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-tower-cell text-[#FF9933] mr-1.5"></i> Signals & S&T Diagnostics
          </button>
          <button type="button" onclick="switchMaintSubTab('usfd')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeMaintSubTab === 'usfd' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-wave-square text-[#FF9933] mr-1.5"></i> USFD A-Scan Oscilloscope
          </button>
          <button type="button" onclick="switchMaintSubTab('ohe')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeMaintSubTab === 'ohe' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-bolt text-[#FF9933] mr-1.5"></i> 25kV OHE Electrical SCADA
          </button>
          <button type="button" onclick="switchMaintSubTab('work_orders')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeMaintSubTab === 'work_orders' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-clipboard-list text-[#FF9933] mr-1.5"></i> P-Way Repair Work Orders
          </button>
        </div>

        <div>
          ${contentHtml}
        </div>
      </div>
    `;

    // Initialize Canvas for USFD if active
    if (activeMaintSubTab === "usfd") {
      setTimeout(initUsfdOscilloscope, 60);
    }

    // Initialize Chart.js Graphs for 68,000 km Track Network Tab
    if (activeMaintSubTab === "pway_network" && (trackDisplayMode === "graphs" || trackDisplayMode === "split")) {
      setTimeout(() => {
        const corr = irCorridors[trackCorridorId] || irCorridors["ndls_bpl"];
        const tqiCanvas = document.getElementById("corridorTqiChart");
        if (tqiCanvas && window.Chart) {
          const labels = corr.sections.map(s => `${s.from}-${s.to}`);
          const tqiData = corr.sections.map(s => parseFloat(s.tqi.split(" ")[0]));
          const degData = corr.sections.map(s => s.deg);

          new window.Chart(tqiCanvas, {
            type: "line",
            data: {
              labels: labels,
              datasets: [
                {
                  label: "Track Quality Index (TQI)",
                  data: tqiData,
                  borderColor: "#10b981",
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  borderWidth: 2.5,
                  fill: true,
                  tension: 0.3
                },
                {
                  label: "Track Degradation % (Down from 100)",
                  data: degData,
                  borderColor: "#f59e0b",
                  backgroundColor: "rgba(245, 158, 11, 0.1)",
                  borderWidth: 2,
                  fill: true,
                  tension: 0.3,
                  yAxisID: "yDeg"
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: "top", labels: { font: { size: 10 } } } },
              scales: {
                y: { min: 80, max: 100, title: { display: true, text: "TQI (80-100)", font: { size: 10 } } },
                yDeg: { position: "right", min: 0, max: 15, title: { display: true, text: "Degradation %", font: { size: 10 } }, grid: { display: false } },
                x: { grid: { display: false } }
              }
            }
          });
        }

        const donutCanvas = document.getElementById("trackHealthDonut");
        if (donutCanvas && window.Chart) {
          new window.Chart(donutCanvas, {
            type: "doughnut",
            data: {
              labels: ["Healthy Track", "Degradation Wear"],
              datasets: [{
                data: [corr.overallHealth, corr.degradationPct],
                backgroundColor: ["#10b981", "#f59e0b"],
                borderWidth: 0
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              cutout: "75%"
            }
          });
        }
      }, 50);
    }

    // Asynchronously fetch live track weather telemetry
    setTimeout(async () => {
      const pill = document.getElementById("maintWeatherPill");
      if (pill && window.WeatherEngine) {
        try {
          const w = await window.WeatherEngine.getStationWeather("NDLS");
          pill.innerHTML = `
            <span class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 font-bold">
              <i class="fa-solid fa-temperature-half text-emerald-600"></i>
              <span>Ambient Temp: <strong>${w.temp}°C</strong> (${w.condition})</span>
            </span>
            <span class="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5 font-bold">
              <i class="fa-solid fa-ruler-horizontal text-amber-600"></i>
              <span>Live Rail Temp ($T_{rail}$): <strong>${w.safety.railTemp}°C</strong></span>
            </span>
            <span class="px-2.5 py-1 rounded-lg ${w.safety.railStatusColor} font-bold">
              ${w.safety.railStatus}
            </span>
            <span class="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
              <i class="fa-solid fa-wind text-blue-500"></i>
              <span>Wind: <strong>${w.windSpeed} km/h</strong></span>
            </span>
            <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
              <i class="fa-solid fa-droplet text-blue-400"></i>
              <span>Humidity: <strong>${w.humidity}%</strong> (Rain: ${w.precipitation}mm)</span>
            </span>
          `;
        } catch (e) {
          console.warn("Could not load maint weather:", e);
        }
      }
    }, 15);
  };

  // Toggle Work Order Status
  window.toggleWorkOrderStatus = function (index) {
    const wo = maintWorkOrders[index];
    if (!wo) return;
    if (wo.status === "DISPATCHED") {
      wo.status = "SITE BLOCK ACTIVE";
      wo.statusClass = "bg-amber-100 text-amber-800";
    } else if (wo.status === "SITE BLOCK ACTIVE") {
      wo.status = "COMPLETED & CERTIFIED";
      wo.statusClass = "bg-emerald-100 text-emerald-800";
    } else {
      wo.status = "DISPATCHED";
      wo.statusClass = "bg-blue-100 text-blue-800";
    }
    if (window.showToast) {
      window.showToast(`Updated Work Order ${wo.id} status to: ${wo.status}`, "info");
    }
    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderMaintenanceEngineerWorkspace) {
      window.renderMaintenanceEngineerWorkspace(container);
    }
  };

  // Open New Work Order Modal
  window.openNewMaintOrderModal = function () {
    const newWo = {
      id: `WO-2026-${Math.floor(100 + Math.random() * 900)}`,
      location: "FDB - TKD Section (Km 34/2)",
      defect: "Ballast Shoulder Packing & SEJ Gap Adjustment",
      priority: "HIGH",
      priorityClass: "bg-amber-100 text-amber-800 border-amber-300",
      status: "DISPATCHED",
      statusClass: "bg-blue-100 text-blue-800",
      crew: "SSE P-Way Unit Faridabad",
      estHrs: "2.5 hrs",
      safetyPermit: `PTW-${Math.floor(8000 + Math.random() * 1000)}`
    };

    maintWorkOrders.unshift(newWo);
    if (window.showToast) {
      window.showToast(`✅ Dispatched New Work Order: ${newWo.id} (${newWo.location})`, "success");
    }
    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderMaintenanceEngineerWorkspace) {
      window.renderMaintenanceEngineerWorkspace(container);
    }
  };
})();
