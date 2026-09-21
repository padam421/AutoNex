// =========================================================================
// CONTROL ROOM OFFICER CONSOLE (SECTION CONTROLLER TERMINAL)
// Module: controlRoom.js
// Systems: COA Train Charting (String Graph), Division TSR & PSR Bulletin,
//          AI Train Precedence Engine, FOIS Freight Operations, Disaster ART
// =========================================================================

(function () {
  let activeCtrlSubTab = "ctrl_string_graph";
  let stringGraphAnimId = null;
  let chartTimeMinutes = 990; // 16:30 IST

  // Division TSR Bulletin Records
  let tsrBulletin = [
    { id: "TSR-NDLS-091", sector: "NDLS – NZM Up Main", chainage: "Km 12/4 to 15/8", imposed: "30 km/h", normal: "110 km/h", reason: "Deep Screening & Ballast Packing by 3X Machine", issuedBy: "SSE P-Way NZM", validTill: "20:00 IST", status: "ACTIVE (KAVACH BROADCAST)" },
    { id: "TSR-NZM-044", sector: "NZM – FDB Dn Main", chainage: "Km 22/1 to 28/4", imposed: "45 km/h", normal: "130 km/h", reason: "Catenary Wire Dropper Renewal & OHE Tensioning", issuedBy: "SSE OHE FDB", validTill: "18:30 IST", status: "ACTIVE (KAVACH BROADCAST)" },
    { id: "TSR-TKD-018", sector: "TKD – MTJ Trunk", chainage: "Km 45/0 to 52/2", imposed: "60 km/h", normal: "130 km/h", reason: "Major Bridge Girder Ultrasonic Inspection", issuedBy: "AEN / Bridge HQ", validTill: "Tomorrow 06:00", status: "ACTIVE (KAVACH BROADCAST)" },
    { id: "PSR-PWL-002", sector: "Palwal Junction Yard", chainage: "Km 68/0 to 71/5", imposed: "50 km/h", normal: "50 km/h", reason: "Permanent Speed Restriction: 1:12 Diamond Crossing", issuedBy: "Chief Engineer SWR", validTill: "Permanent", status: "PERMANENT (PSR)" }
  ];

  // FOIS Freight Rakes
  let freightRakes = [
    { id: "RAKE-BOXN-58102", type: "BOXN Open Hopper", commodity: "Thermal Coal (4,150 MT)", origin: "Dadri NTPC Power Plant", dest: "Panipat Thermal Power", loco: "Twin WAG9 #31154", wagons: "58 BOXN + 1 BVZC", status: "IN-TRANSIT (GREEN CORRIDOR)", speed: "65 km/h", delay: "ON TIME", loopLine: "Palwal Loop Line 2 (Hold 12m for Rajdhani)" },
    { id: "RAKE-BTPN-99201", type: "BTPN Petroleum Tanker", commodity: "Aviation Turbine Fuel (ATF) (2,600 KLD)", origin: "Mathura Refinery", dest: "Palam Airport Depot", loco: "WAG12B #60012", wagons: "50 BTPN + 1 BVZC", status: "IN-TRANSIT", speed: "55 km/h", delay: "+8 min", loopLine: "Through Run via Goods Chord" },
    { id: "RAKE-BCNHL-20412", type: "BCNHL Covered Wagons", commodity: "Food Corporation of India Wheat (2,800 MT)", origin: "FCI Tughlakabad", dest: "Kolkata Goods Terminal", loco: "WAG9 #31088", wagons: "42 BCNHL + 1 BVZC", status: "UNLOADING AT YARD", speed: "0 km/h", delay: "STABLED", loopLine: "Tughlakabad Yard Line 4" },
    { id: "RAKE-CONCOR-77190", type: "BLCA/BLCB Container Rake", commodity: "Export Cargo Containers (90 TEUs)", origin: "ICD Dadri", dest: "JNPT Port Mumbai", loco: "WAG9 #31240", wagons: "45 BLC + 1 BVZC", status: "READY FOR DEPARTURE", speed: "0 km/h", delay: "ON TIME", loopLine: "Dadri Departure Yard" }
  ];

  // COA Section Stations Chainage Map (Y-Axis on String Graph)
  const coaStations = [
    { name: "New Delhi (NDLS)", code: "NDLS", km: 0 },
    { name: "Shivaji Bridge (CSB)", code: "CSB", km: 2 },
    { name: "Tilak Bridge (TKJ)", code: "TKJ", km: 4 },
    { name: "H. Nizamuddin (NZM)", code: "NZM", km: 14 },
    { name: "Okhla (OKA)", code: "OKA", km: 18 },
    { name: "Tughlakabad (TKD)", code: "TKD", km: 28 },
    { name: "Faridabad (FDB)", code: "FDB", km: 38 },
    { name: "Ballabgarh (BVH)", code: "BVH", km: 48 },
    { name: "Palwal (PWL)", code: "PWL", km: 70 },
    { name: "Kosi Kalan (KSV)", code: "KSV", km: 105 },
    { name: "Mathura Jn (MTJ)", code: "MTJ", km: 140 }
  ];

  // Train Movement Trajectories for the String Graph
  const stringGraphTrains = [
    {
      no: "12951",
      name: "Mumbai Rajdhani",
      type: "Rajdhani",
      color: "#dc2626", // Crimson Red
      dir: "DOWN",
      points: [
        { km: 0, time: "16:55" },
        { km: 14, time: "17:06" },
        { km: 28, time: "17:15" },
        { km: 48, time: "17:28" },
        { km: 70, time: "17:42" },
        { km: 140, time: "18:25" }
      ]
    },
    {
      no: "22436",
      name: "Kashi Vande Bharat",
      type: "Vande Bharat",
      color: "#0284c7", // Sky Blue
      dir: "DOWN",
      points: [
        { km: 0, time: "17:15" },
        { km: 14, time: "17:25" },
        { km: 38, time: "17:39" },
        { km: 70, time: "17:58" },
        { km: 140, time: "18:40" }
      ]
    },
    {
      no: "12012",
      name: "Kalka Vande Bharat",
      type: "Vande Bharat",
      color: "#0284c7",
      dir: "UP",
      points: [
        { km: 140, time: "15:00" },
        { km: 70, time: "15:45" },
        { km: 28, time: "16:08" },
        { km: 14, time: "16:18" },
        { km: 0, time: "16:30" }
      ]
    },
    {
      no: "12059",
      name: "Kota Jan Shatabdi",
      type: "Shatabdi",
      color: "#059669", // Emerald Green
      dir: "DOWN",
      points: [
        { km: 0, time: "17:50" },
        { km: 14, time: "18:04" },
        { km: 38, time: "18:22" },
        { km: 70, time: "18:45" },
        { km: 140, time: "19:45" }
      ]
    },
    {
      no: "BOXN-58102",
      name: "Coal Freight Rake",
      type: "Freight",
      color: "#d97706", // Amber
      dir: "DOWN",
      points: [
        { km: 0, time: "16:00" },
        { km: 14, time: "16:22" },
        { km: 38, time: "16:55" },
        { km: 70, time: "17:35" }, // Held at Palwal for Rajdhani overtake
        { km: 70, time: "17:50" },
        { km: 140, time: "19:10" }
      ]
    },
    {
      no: "64091",
      name: "Shakurbasti EMU",
      type: "Suburban",
      color: "#9333ea", // Purple
      dir: "UP",
      points: [
        { km: 70, time: "16:15" },
        { km: 48, time: "16:38" },
        { km: 38, time: "16:50" },
        { km: 28, time: "17:02" },
        { km: 14, time: "17:15" },
        { km: 0, time: "17:30" }
      ]
    }
  ];

  // Helper: parse HH:MM to minutes from midnight
  function timeToMinutes(tStr) {
    const [h, m] = tStr.split(":").map(Number);
    return h * 60 + m;
  }

  // Draw Authentic COA Train String Graph on Canvas
  function initCoaStringGraph() {
    const canvas = document.getElementById("coaStringGraphCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (stringGraphAnimId) cancelAnimationFrame(stringGraphAnimId);

    function drawChart() {
      if (!document.getElementById("coaStringGraphCanvas")) return;
      const w = canvas.width = canvas.parentElement.clientWidth;
      const h = canvas.height = canvas.parentElement.clientHeight;

      // Dark Control Room Canvas Background
      ctx.fillStyle = "#0c1322";
      ctx.fillRect(0, 0, w, h);

      const marginL = 130;
      const marginR = 30;
      const marginT = 40;
      const marginB = 40;

      const chartW = w - marginL - marginR;
      const chartH = h - marginT - marginB;

      // Time Range: 15:00 to 20:00 (300 mins)
      const minTime = 15 * 60; // 900
      const maxTime = 20 * 60; // 1200
      const timeSpan = maxTime - minTime;

      // 1. Draw Horizontal Station Chainage Lines (Y-Axis)
      ctx.lineWidth = 1;
      coaStations.forEach((stn, idx) => {
        const y = marginT + (stn.km / 140) * chartH;

        // Line
        ctx.strokeStyle = idx === 0 || idx === coaStations.length - 1 ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.08)";
        ctx.beginPath();
        ctx.moveTo(marginL, y);
        ctx.lineTo(w - marginR, y);
        ctx.stroke();

        // Label
        ctx.font = "bold 10px Plus Jakarta Sans, sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.textAlign = "right";
        ctx.fillText(stn.name, marginL - 10, y + 3);

        ctx.font = "bold 9px JetBrains Mono, monospace";
        ctx.fillStyle = "#64748b";
        ctx.fillText(`${stn.km} Km`, marginL - 10, y + 14);
      });

      // 2. Draw Vertical Time Grid Lines (10-minute intervals)
      ctx.textAlign = "center";
      for (let t = minTime; t <= maxTime; t += 10) {
        const x = marginL + ((t - minTime) / timeSpan) * chartW;
        const isHour = t % 60 === 0;

        ctx.strokeStyle = isHour ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.05)";
        ctx.beginPath();
        ctx.moveTo(x, marginT);
        ctx.lineTo(x, marginT + chartH);
        ctx.stroke();

        if (isHour) {
          const hours = Math.floor(t / 60);
          const timeLabel = `${hours.toString().padStart(2, '0')}:00`;
          ctx.font = "bold 10px JetBrains Mono, monospace";
          ctx.fillStyle = "#cbd5e1";
          ctx.fillText(timeLabel, x, marginT - 10);
          ctx.fillText(timeLabel, x, marginT + chartH + 20);
        }
      }

      // 3. Draw Train Strings (Paths)
      stringGraphTrains.forEach(trn => {
        ctx.strokeStyle = trn.color;
        ctx.lineWidth = trn.type === "Rajdhani" || trn.type === "Vande Bharat" ? 3 : 2;
        ctx.shadowBlur = 6;
        ctx.shadowColor = trn.color;
        ctx.beginPath();

        trn.points.forEach((pt, idx) => {
          const tMin = timeToMinutes(pt.time);
          const x = marginL + ((tMin - minTime) / timeSpan) * chartW;
          const y = marginT + (pt.km / 140) * chartH;

          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.stroke();
        ctx.shadowBlur = 0;

        // Train Label along String
        const midPt = trn.points[Math.floor(trn.points.length / 2)];
        const midT = timeToMinutes(midPt.time);
        const lx = marginL + ((midT - minTime) / timeSpan) * chartW;
        const ly = marginT + (midPt.km / 140) * chartH;

        ctx.fillStyle = trn.color;
        ctx.font = "bold 10px JetBrains Mono, monospace";
        ctx.fillText(`${trn.no} ${trn.name}`, lx + 15, ly - 6);
      });

      // 4. Draw Current Simulation Time Scrubber (Vertical Red Line)
      chartTimeMinutes = (chartTimeMinutes + 0.04);
      if (chartTimeMinutes > maxTime) chartTimeMinutes = minTime;

      const scrubberX = marginL + ((chartTimeMinutes - minTime) / timeSpan) * chartW;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(scrubberX, marginT);
      ctx.lineTo(scrubberX, marginT + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current Time Header Tag
      const curHours = Math.floor(chartTimeMinutes / 60);
      const curMins = Math.floor(chartTimeMinutes % 60);
      const curStr = `${curHours.toString().padStart(2, '0')}:${curMins.toString().padStart(2, '0')} IST`;

      ctx.fillStyle = "#ef4444";
      ctx.fillRect(scrubberX - 35, marginT - 22, 70, 18);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px JetBrains Mono, monospace";
      ctx.fillText(curStr, scrubberX, marginT - 9);

      stringGraphAnimId = requestAnimationFrame(drawChart);
    }

    drawChart();
  }

  // Switch Sub-Tabs
  window.switchCtrlSubTab = function (tabKey) {
    activeCtrlSubTab = tabKey;
    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderControlRoomWorkspace) {
      window.renderControlRoomWorkspace(container);
    }
  };

  // Main Render
  window.renderControlRoomWorkspace = function (container) {
    if (!container) return;

    let contentHtml = "";

    if (activeCtrlSubTab === "ctrl_string_graph") {
      contentHtml = `
        <!-- SUB-TAB 1: COA TIME-DISTANCE TRAIN STRING GRAPH -->
        <div class="space-y-4">
          <div class="glass-card p-5 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                  <i class="fa-solid fa-chart-line text-[#FF9933]"></i> Control Office Application (COA) Time-Distance Section Master Chart
                </h3>
                <p class="text-xs text-slate-500">Live graphical plotting of train paths, speed trajectories (slope = speed) & overtake crossings (NDLS - MTJ)</p>
              </div>

              <!-- Legend -->
              <div class="flex flex-wrap items-center gap-3 text-xs font-mono">
                <span class="flex items-center gap-1.5"><span class="w-3 h-1 bg-red-600 rounded"></span> Rajdhani</span>
                <span class="flex items-center gap-1.5"><span class="w-3 h-1 bg-sky-600 rounded"></span> Vande Bharat</span>
                <span class="flex items-center gap-1.5"><span class="w-3 h-1 bg-emerald-600 rounded"></span> Shatabdi/Mail</span>
                <span class="flex items-center gap-1.5"><span class="w-3 h-1 bg-amber-600 rounded"></span> Freight Rakes</span>
                <span class="flex items-center gap-1.5"><span class="w-3 h-1 bg-purple-600 rounded"></span> EMU Suburban</span>
              </div>
            </div>

            <!-- Canvas Container -->
            <div class="h-96 w-full rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl relative">
              <canvas id="coaStringGraphCanvas" class="w-full h-full block"></canvas>
            </div>

            <!-- Active Conflict / Precedence Notice -->
            <div class="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span class="font-bold text-amber-900 flex items-center gap-2">
                  <i class="fa-solid fa-triangle-exclamation text-amber-600"></i> AI Conflict Resolution at Palwal (Km 70/0)
                </span>
                <p class="text-slate-600 mt-0.5">Freight BOXN #58102 held in Palwal Loop Line 2 for 12 mins. 12951 Mumbai Rajdhani granted 110 km/h clear run on Up Main.</p>
              </div>
              <button onclick="window.switchCtrlSubTab('ctrl_precedence')" class="px-4 py-2 rounded-xl bg-[#12355B] hover:bg-[#1D4877] text-white font-bold text-xs shrink-0 shadow">
                View AI Precedence Details ➔
              </button>
            </div>
          </div>
        </div>
      `;
    } else if (activeCtrlSubTab === "ctrl_tsr") {
      contentHtml = `
        <!-- SUB-TAB 2: TSR & SPEED RESTRICTION CONTROLLER -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <!-- TSR Imposition Form (5 cols) -->
          <div class="lg:col-span-5 glass-card p-5 space-y-4">
            <div class="border-b border-slate-200 pb-2.5">
              <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                <i class="fa-solid fa-gauge-simple-high text-emerald-600"></i> Impose Temporary Speed Restriction (TSR)
              </h3>
              <p class="text-xs text-slate-500">Instantly broadcasted digitally to Loco OBCs over 160.225 MHz Kavach RF</p>
            </div>

            <form onsubmit="window.submitTsrRestriction(event)" class="space-y-3 text-xs">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Target Sector / Track Block</label>
                <select id="tsrSector" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold">
                  <option value="NDLS – NZM Up Main (Km 12/4 to 15/8)">NDLS – NZM Up Main (Km 12/4 to 15/8)</option>
                  <option value="NZM – FDB Main (Km 22/1 to 28/4)">NZM – FDB Main (Km 22/1 to 28/4)</option>
                  <option value="FDB – TKD Section (Km 35/0 to 41/2)">FDB – TKD Section (Km 35/0 to 41/2)</option>
                  <option value="TKD – MTJ Trunk (Km 45/0 to 52/2)">TKD – MTJ Trunk (Km 45/0 to 52/2)</option>
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Enforced Max Speed Limit (km/h)</label>
                <div class="grid grid-cols-4 gap-2">
                  <button type="button" onclick="window.setTsrSpeed('30 km/h')" class="py-2.5 rounded-xl border-2 border-red-400 bg-red-50 text-red-700 font-bold text-xs">30 km/h</button>
                  <button type="button" onclick="window.setTsrSpeed('45 km/h')" class="py-2.5 rounded-xl border-2 border-amber-400 bg-amber-50 text-amber-700 font-bold text-xs">45 km/h</button>
                  <button type="button" onclick="window.setTsrSpeed('60 km/h')" class="py-2.5 rounded-xl border-2 border-blue-400 bg-blue-50 text-blue-700 font-bold text-xs">60 km/h</button>
                  <button type="button" onclick="window.setTsrSpeed('Normal 130 km/h')" class="py-2.5 rounded-xl border-2 border-emerald-400 bg-emerald-50 text-emerald-700 font-bold text-xs">Normal</button>
                </div>
                <input type="hidden" id="tsrSpeedSelected" value="30 km/h" />
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Reason for Restriction</label>
                <input type="text" id="tsrReason" placeholder="e.g. Deep Screening / Monsoon Patrolling / Signal Testing" value="Dense Fog & Rail Thermal Stress Monitoring" required class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900" />
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Valid Until (IST Time)</label>
                <input type="text" id="tsrValidTill" value="22:00 IST" required class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono" />
              </div>

              <button type="submit" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2">
                <i class="fa-solid fa-satellite-dish text-[#FF9933]"></i> Broadcast TSR via Kavach RF (Packet 0x14)
              </button>
            </form>
          </div>

          <!-- Active Division TSR Bulletin (7 cols) -->
          <div class="lg:col-span-7 glass-card p-5 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                  <i class="fa-solid fa-list-ol text-blue-600"></i> Division TSR & PSR Master Bulletin
                </h3>
                <p class="text-xs text-slate-500">Live speed restrictions enforced on Delhi Division track sections</p>
              </div>
              <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-mono font-bold">${tsrBulletin.length} Enforced Limits</span>
            </div>

            <div class="space-y-3">
              ${tsrBulletin.map(tsr => `
                <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#12355B] text-white">${tsr.id}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">${tsr.status}</span>
                  </div>

                  <div class="flex items-center justify-between text-xs">
                    <p class="font-bold text-[#12355B]">${tsr.sector}</p>
                    <p class="font-mono text-slate-700">Enforced: <strong class="text-red-600">${tsr.imposed}</strong> (Normal: ${tsr.normal})</p>
                  </div>

                  <p class="text-[11px] text-slate-600 font-mono"><i class="fa-solid fa-location-dot text-[#FF9933] mr-1"></i> Chainage: ${tsr.chainage}</p>
                  <p class="text-[11px] text-slate-500">Cause: ${tsr.reason} • Authority: <strong>${tsr.issuedBy}</strong></p>

                  <div class="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Valid Till: ${tsr.validTill}</span>
                    <button onclick="window.revokeTsr('${tsr.id}')" class="text-red-600 hover:text-red-800 font-bold font-sans">
                      <i class="fa-solid fa-ban mr-0.5"></i> Revoke TSR
                    </button>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      `;
    } else if (activeCtrlSubTab === "ctrl_precedence") {
      contentHtml = `
        <!-- SUB-TAB 3: AI PRECEDENCE & LOOP LINE ALLOCATION ENGINE -->
        <div class="glass-card p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                <i class="fa-solid fa-code-fork text-blue-600"></i> AI Train Precedence & Crossing Optimizer (COA Decision Engine)
              </h3>
              <p class="text-xs text-slate-500">Algorithmic simulation minimizing total divisional delay and cascading punctuality loss</p>
            </div>
            <button onclick="if(window.showToast) window.showToast('Re-simulated AI Precedence Matrix for all 48 Active Trains', 'success')" class="px-3.5 py-1.5 rounded-lg bg-[#12355B] hover:bg-[#1D4877] text-white font-bold text-xs shadow transition-all">
              <i class="fa-solid fa-arrows-rotate mr-1"></i> Re-Calculate Precedence
            </button>
          </div>

          <!-- Scenario Comparison Matrix (Strategy A vs B vs C) -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <!-- Strategy A (Recommended) -->
            <div class="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 space-y-3 relative shadow-md">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px] uppercase">STRATEGY A (RECOMMENDED)</span>
                <span class="text-emerald-800 font-bold font-mono">Net Delay: +11m</span>
              </div>
              <h4 class="font-bold text-[#12355B] text-sm">Hold Freight at Palwal Loop 2</h4>
              <p class="text-slate-600 text-[11px]">Freight BOXN #58102 put into loop line for 11 mins. 12951 Mumbai Rajdhani overtakes uninterrupted at 110 km/h.</p>
              <div class="p-2.5 rounded-xl bg-white border border-emerald-200 font-mono text-[10px] space-y-1">
                <p>12951 Rajdhani: <strong class="text-emerald-700">0 min delay</strong></p>
                <p>Freight BOXN: <strong class="text-amber-700">+11 min delay</strong></p>
                <p>Section Punctuality: <strong class="text-emerald-700">99.2%</strong></p>
              </div>
              <button onclick="if(window.showToast) window.showToast('Transmitted Loop Line Order to Station Master Palwal (PWL)', 'success')" class="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition-all">
                Execute Strategy A
              </button>
            </div>

            <!-- Strategy B -->
            <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] uppercase">STRATEGY B</span>
                <span class="text-red-700 font-bold font-mono">Net Delay: +26m</span>
              </div>
              <h4 class="font-bold text-[#12355B] text-sm">Run Freight Ahead of Rajdhani</h4>
              <p class="text-slate-600 text-[11px]">Rajdhani trapped behind freight rake at 55 km/h through Faridabad-Palwal section.</p>
              <div class="p-2.5 rounded-xl bg-white border border-slate-200 font-mono text-[10px] space-y-1">
                <p>12951 Rajdhani: <strong class="text-red-600">+26 min delay (Severe)</strong></p>
                <p>Freight BOXN: <strong class="text-emerald-700">0 min delay</strong></p>
                <p>Section Punctuality: <strong class="text-red-600">88.4%</strong></p>
              </div>
              <button onclick="if(window.showToast) window.showToast('Strategy B Not Recommended due to severe delay penalty', 'error')" class="w-full py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs">
                Select Strategy B
              </button>
            </div>

            <!-- Strategy C -->
            <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] uppercase">STRATEGY C</span>
                <span class="text-blue-700 font-bold font-mono">Net Delay: 0m</span>
              </div>
              <h4 class="font-bold text-[#12355B] text-sm">Divert Freight to 3rd Goods Line</h4>
              <p class="text-slate-600 text-[11px]">Freight diverted to separate dedicated freight chord via Tughlakabad Goods Yard.</p>
              <div class="p-2.5 rounded-xl bg-white border border-slate-200 font-mono text-[10px] space-y-1">
                <p>12951 Rajdhani: <strong class="text-emerald-700">0 min delay</strong></p>
                <p>Freight BOXN: <strong class="text-emerald-700">0 min delay</strong></p>
                <p>Condition: <strong class="text-blue-700">Needs DFC Yard Line Clear</strong></p>
              </div>
              <button onclick="if(window.showToast) window.showToast('Requested Line Clear on 3rd Goods Chord from TKD Yard Master', 'info')" class="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                Request Goods Clear
              </button>
            </div>
          </div>
        </div>
      `;
    } else if (activeCtrlSubTab === "ctrl_freight") {
      contentHtml = `
        <!-- SUB-TAB 4: FOIS FREIGHT OPERATIONS & GOODS SHEDS -->
        <div class="glass-card p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                <i class="fa-solid fa-boxes-stacked text-amber-600"></i> Freight Operations Information System (FOIS) Division Manager
              </h3>
              <p class="text-xs text-slate-500">Live goods rake movements, tonnage dispatch, terminal detention & demurrage monitoring</p>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-mono font-bold">${freightRakes.length} ACTIVE FREIGHT RAKES</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            ${freightRakes.map(rake => `
              <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white transition-all space-y-2.5">
                <div class="flex items-center justify-between">
                  <span class="font-mono font-bold text-[#12355B] text-sm">${rake.id}</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">${rake.status}</span>
                </div>

                <div class="flex items-center justify-between text-xs">
                  <p class="font-bold text-slate-800">${rake.commodity}</p>
                  <p class="font-mono text-slate-600">Speed: <strong class="text-[#12355B]">${rake.speed}</strong></p>
                </div>

                <div class="text-[11px] text-slate-600 space-y-0.5 font-mono">
                  <p>Origin: <strong>${rake.origin}</strong></p>
                  <p>Destination: <strong>${rake.dest}</strong></p>
                  <p>Composition: ${rake.wagons} • Loco: ${rake.loco}</p>
                  <p class="text-amber-800 font-bold font-sans">Dispatcher: ${rake.loopLine}</p>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    } else if (activeCtrlSubTab === "ctrl_disaster") {
      contentHtml = `
        <!-- SUB-TAB 5: DISASTER MANAGEMENT ART / ARME DISPATCHER -->
        <div class="glass-card p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                <i class="fa-solid fa-truck-medical text-red-600"></i> Disaster Management ART & 140-Ton Breakdown Crane Terminal
              </h3>
              <p class="text-xs text-slate-500">Accident Relief Trains (ART), Medical Relief Vans (ARME), and emergency turnout readiness</p>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-bold">DISASTER FLEET STANDBY (READY)</span>
          </div>

          <!-- Turn-Out Countdown Standard Bar -->
          <div class="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">Official Indian Railways Turn-Out Mandate:</span>
              <p class="text-sm font-bold mt-0.5">Day Turn-Out: 30 Mins • Night Turn-Out: 45 Mins</p>
            </div>
            <div class="flex items-center gap-3">
              <button onclick="if(window.showToast) window.showToast('Initiated Surprise Mock Siren Drill for ART NDLS Unit', 'info')" class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-white/20">
                <i class="fa-solid fa-bell mr-1"></i> Test Siren Drill
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-[#12355B]">Class-A ART (NDLS Yard)</h4>
                <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">STANDBY</span>
              </div>
              <p class="text-slate-600 text-[11px]">140T Gottwald Heavy Crane + Hydraulic Lucas Re-Railing Jacks.</p>
              <div class="pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-500">
                <p>Crew on duty: 18 Specialists</p>
                <p>Readiness: Under 15 minutes</p>
              </div>
            </div>

            <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-[#12355B]">ARME Medical Van (NZM)</h4>
                <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">OPERATIONAL</span>
              </div>
              <p class="text-slate-600 text-[11px]">2-Coach Self-Propelled Medical Unit with Operation Theater & Triage.</p>
              <div class="pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-500">
                <p>Medical Team: 4 Doctors + 8 Staff</p>
                <p>Oxygen & Trauma Kits: 100%</p>
              </div>
            </div>

            <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-[#12355B]">140T Crane (TKD Yard)</h4>
                <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">STANDBY</span>
              </div>
              <p class="text-slate-600 text-[11px]">Heavy Breakdown Crane Team for heavy rolling stock lifting.</p>
              <div class="pt-2 border-t border-slate-200 text-[10px] font-mono text-slate-500">
                <p>Loco: Dedicated WDM3D #11422</p>
                <p>Fuel & Aux Generator: Tested</p>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Outer Shell
    container.innerHTML = `
      <div class="space-y-5">
        <!-- Top Action Header Banner -->
        <div class="glass-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-8 border-emerald-600 shadow-md">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black uppercase tracking-wider font-mono">CONTROL ROOM OFFICER CONSOLE</span>
              <span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold font-mono">CHIEF CONTROLLER: V. P. SINGH</span>
            </div>
            <h2 class="text-2xl font-black text-[#12355B] font-['Outfit'] mt-1 flex items-center gap-2">
              🎛️ Section Train Control & Division Dispatch Terminal
            </h2>
            <p class="text-xs text-slate-600 font-medium">COA train charting string graph, TSR speed restriction broadcast, AI precedence optimizer, FOIS & disaster management ART</p>
            <div id="ctrlWeatherPill" class="mt-2 flex items-center gap-2 flex-wrap text-[11px] font-mono">
              <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1.5 font-bold">
                <i class="fa-solid fa-spinner fa-spin text-amber-500"></i>
                <span>Division Section Weather Telemetry: Polling Open-Meteo Satellite...</span>
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 text-xs shrink-0">
            <button onclick="window.emergencyDivisionHalt()" class="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer">
              <i class="fa-solid fa-power-off"></i> Division Emergency Stop (RF SOS)
            </button>
          </div>
        </div>

        <!-- Sub-Tabs Navigation Bar -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button type="button" onclick="switchCtrlSubTab('ctrl_string_graph')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeCtrlSubTab === 'ctrl_string_graph' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-chart-line text-[#FF9933] mr-1.5"></i> COA Master String Graph (Time-Distance)
          </button>
          <button type="button" onclick="switchCtrlSubTab('ctrl_tsr')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeCtrlSubTab === 'ctrl_tsr' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-gauge-simple-high text-[#FF9933] mr-1.5"></i> TSR Speed Restrictions (Kavach RF)
          </button>
          <button type="button" onclick="switchCtrlSubTab('ctrl_precedence')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeCtrlSubTab === 'ctrl_precedence' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-code-fork text-[#FF9933] mr-1.5"></i> AI Precedence & Crossing Optimizer
          </button>
          <button type="button" onclick="switchCtrlSubTab('ctrl_freight')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeCtrlSubTab === 'ctrl_freight' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-boxes-stacked text-[#FF9933] mr-1.5"></i> FOIS Freight Operations
          </button>
          <button type="button" onclick="switchCtrlSubTab('ctrl_disaster')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeCtrlSubTab === 'ctrl_disaster' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-truck-medical text-[#FF9933] mr-1.5"></i> Disaster Management ART & Cranes
          </button>
        </div>

        <div>
          ${contentHtml}
        </div>
      </div>
    `;

    if (activeCtrlSubTab === "ctrl_string_graph") {
      setTimeout(initCoaStringGraph, 60);
    }

    // Asynchronously fetch live section weather & Fog TSR status
    setTimeout(async () => {
      const pill = document.getElementById("ctrlWeatherPill");
      if (pill && window.WeatherEngine) {
        try {
          const [wNdls, wNzm, wMtj] = await Promise.all([
            window.WeatherEngine.getStationWeather("NDLS"),
            window.WeatherEngine.getStationWeather("NZM"),
            window.WeatherEngine.getStationWeather("MTJ"),
          ]);
          const minVis = Math.min(
            parseFloat(wNdls.visibilityKm),
            parseFloat(wNzm.visibilityKm),
            parseFloat(wMtj.visibilityKm)
          );
          const hasFog = minVis < 1.0;

          pill.innerHTML = `
            <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1.5 font-bold">
              <i class="fa-solid fa-cloud-sun text-amber-500"></i>
              <span>NDLS-MTJ Section: <strong>${wNdls.temp}°C → ${wMtj.temp}°C</strong></span>
            </span>
            <span class="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1 font-bold">
              <i class="fa-solid fa-eye text-blue-500"></i>
              <span>Min Section Visibility: <strong>${minVis} km</strong></span>
            </span>
            ${
              hasFog
                ? `<span class="px-2.5 py-1 rounded-lg bg-red-100 text-red-800 border border-red-300 font-bold flex items-center gap-1 animate-pulse">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <span>AUTOMATIC FOG TSR 60 km/h ACTIVE</span>
                  </span>`
                : `<span class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold flex items-center gap-1">
                    <i class="fa-solid fa-circle-check text-emerald-600"></i>
                    <span>VISIBILITY CLEAR (FULL MPS PERMITTED)</span>
                  </span>`
            }
            <span class="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
              <i class="fa-solid fa-temperature-arrow-up text-amber-600"></i>
              <span>Max Rail Temp: <strong>${Math.max(wNdls.safety.railTemp, wMtj.safety.railTemp)}°C</strong></span>
            </span>
          `;
        } catch (e) {
          console.warn("Could not load control room weather:", e);
        }
      }
    }, 15);
  };

  // Set TSR Speed Helper
  window.setTsrSpeed = function (speedStr) {
    const el = document.getElementById("tsrSpeedSelected");
    if (el) el.value = speedStr;
    if (window.showToast) {
      window.showToast(`Selected TSR Enforced Limit: ${speedStr}`, "info");
    }
  };

  // Submit TSR
  window.submitTsrRestriction = function (e) {
    e.preventDefault();
    const sector = document.getElementById("tsrSector").value;
    const speed = document.getElementById("tsrSpeedSelected").value;
    const reason = document.getElementById("tsrReason").value;
    const validTill = document.getElementById("tsrValidTill").value;

    const newTsr = {
      id: `TSR-SEC-${Math.floor(100 + Math.random() * 900)}`,
      sector: sector,
      chainage: "Km 18/4 to 22/0",
      imposed: speed,
      normal: "130 km/h",
      reason: reason,
      issuedBy: "Chief Section Controller",
      validTill: validTill,
      status: "ACTIVE (KAVACH BROADCAST)"
    };

    tsrBulletin.unshift(newTsr);
    if (window.showToast) {
      window.showToast(`📡 Broadcasted TSR: ${speed} on ${sector} via 160.225 MHz Kavach RF link!`, "success");
    }

    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderControlRoomWorkspace) {
      window.renderControlRoomWorkspace(container);
    }
  };

  // Revoke TSR
  window.revokeTsr = function (tsrId) {
    tsrBulletin = tsrBulletin.filter(t => t.id !== tsrId);
    if (window.showToast) {
      window.showToast(`✅ Revoked TSR ${tsrId}. Normal Track Speed Restored!`, "success");
    }
    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderControlRoomWorkspace) {
      window.renderControlRoomWorkspace(container);
    }
  };

  // Emergency Division Halt
  window.emergencyDivisionHalt = function () {
    if (window.showToast) {
      window.showToast(`🚨 DIVISION RF SOS TRANSMITTED! Emergency Halt Command Broadcast to All Locos on 160.225 MHz!`, "error");
    }
  };
})();
