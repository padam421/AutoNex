// =========================================================================
// STATION MASTER OPERATIONS CONSOLE (NDLS - NEW DELHI COMMAND TERMINAL)
// Module: stationMaster.js
// Systems: Electronic Interlocking (EI), T/1425 E-TRB, T/409 Caution Orders,
//          IPIS & PA Audio Synthesizer, UFSBI Block Instrument
// =========================================================================

(function () {
  let activeSmSubTab = "sm_platforms";
  let smDirectionFilter = "ALL";
  let smShiftFilter = "SHIFT_A";

  // Mock State for Platform Lines (16 Platforms of NDLS)
  const platformData = [
    { pf: "Platform 1 (Main Up)", train: "12951 Mumbai Rajdhani Express", loco: "WAP7 #30211 (GZB)", status: "OCCUPIED (BOARDING)", statusClass: "bg-emerald-100 text-emerald-800 border-emerald-300", aspect: "GREEN (CLEAR)", aspectColor: "#10b981", locked: true, speed: "110 km/h", eta: "Dep: 16:55", route: "Up Main ➔ NZM" },
    { pf: "Platform 2 (Main Dn)", train: "12012 Vande Bharat Express", loco: "Trainset #08 (NDLS)", status: "OCCUPIED (ARRIVED)", statusClass: "bg-emerald-100 text-emerald-800 border-emerald-300", aspect: "YELLOW (CAUTION)", aspectColor: "#f59e0b", locked: true, speed: "30 km/h", eta: "Arrived", route: "Dn Main ➔ Yard" },
    { pf: "Platform 3 (Loop Up 1)", train: "12059 Kota Jan Shatabdi", loco: "WAP5 #30004 (BRC)", status: "RESERVED (+12m)", statusClass: "bg-amber-100 text-amber-800 border-amber-300", aspect: "RED (STOP)", aspectColor: "#ef4444", locked: false, speed: "0 km/h", eta: "ETA: 17:10", route: "Loop 1 ➔ Reversible" },
    { pf: "Platform 4 (Yard Line)", train: "Freight WAG9 #31088 (TKD)", loco: "WAG9 #31088 (TKD)", status: "SHUNTCAR MOVEMENT", statusClass: "bg-blue-100 text-blue-800 border-blue-300", aspect: "SHUNT PERMIT", aspectColor: "#3b82f6", locked: true, speed: "15 km/h", eta: "Active Shunt", route: "Yard Line ➔ Wash Pit" },
    { pf: "Platform 5 (Main Line 2)", train: "12424 Dibrugarh Rajdhani", loco: "WAP7 #30255 (SGUJ)", status: "BERTH CLEAR", statusClass: "bg-slate-100 text-slate-700 border-slate-300", aspect: "RED (STOP)", aspectColor: "#ef4444", locked: false, speed: "0 km/h", eta: "ETA: 18:20", route: "Main Line 2" },
    { pf: "Platform 6 (Loop Dn 1)", train: "12626 Kerala Superfast", loco: "WAP7 #30412 (ED)", status: "BERTH CLEAR", statusClass: "bg-slate-100 text-slate-700 border-slate-300", aspect: "RED (STOP)", aspectColor: "#ef4444", locked: false, speed: "0 km/h", eta: "ETA: 18:50", route: "Loop Dn 1" },
    { pf: "Platform 7 (Dn Express)", train: "12015 Ajmer Shatabdi", loco: "WAP7 #30319 (TKD)", status: "OCCUPIED (CLEANING)", statusClass: "bg-purple-100 text-purple-800 border-purple-300", aspect: "RED (STOP)", aspectColor: "#ef4444", locked: true, speed: "0 km/h", eta: "Dep: 06:15", route: "Dn Express Line" },
    { pf: "Platform 8 (Up Express)", train: "12302 Howrah Rajdhani", loco: "WAP7 #30219 (HWH)", status: "OCCUPIED (PARKED)", statusClass: "bg-amber-100 text-amber-800 border-amber-300", aspect: "YELLOW (CAUTION)", aspectColor: "#f59e0b", locked: true, speed: "0 km/h", eta: "Dep: 16:50", route: "Up Express Line" },
    { pf: "Platform 9 (Suburban Line 1)", train: "64091 Shakurbasti EMU Local", loco: "EMU Rake #401 (NDLS)", status: "BOARDING (SUBURBAN)", statusClass: "bg-emerald-100 text-emerald-800 border-emerald-300", aspect: "GREEN (CLEAR)", aspectColor: "#10b981", locked: true, speed: "60 km/h", eta: "Dep: 17:05", route: "Suburban 1 ➔ SSB" },
    { pf: "Platform 10 (Suburban Line 2)", train: "64414 Ghaziabad EMU Local", loco: "EMU Rake #408 (GZB)", status: "BERTH CLEAR", statusClass: "bg-slate-100 text-slate-700 border-slate-300", aspect: "RED (STOP)", aspectColor: "#ef4444", locked: false, speed: "0 km/h", eta: "ETA: 17:30", route: "Suburban 2 ➔ GZB" },
    { pf: "Platform 11 (Loop Up 2)", train: "12431 Trivandrum Rajdhani", loco: "WAP7 #30302 (BRC)", status: "BERTH CLEAR", statusClass: "bg-slate-100 text-slate-700 border-slate-300", aspect: "RED (STOP)", aspectColor: "#ef4444", locked: false, speed: "0 km/h", eta: "ETA: 19:15", route: "Loop Up 2" },
    { pf: "Platform 12 (Ajmeri Gate Side)", train: "12958 Swarna Jayanti Rajdhani", loco: "WAP7 #30288 (ADI)", status: "RESERVED (+25m)", statusClass: "bg-amber-100 text-amber-800 border-amber-300", aspect: "RED (STOP)", aspectColor: "#ef4444", locked: false, speed: "0 km/h", eta: "Dep: 19:55", route: "Ajmeri Gate Exit" },
    { pf: "Platform 13 (Fast Corridor)", train: "12622 Tamil Nadu Express", loco: "WAP7 #30261 (RPM)", status: "BERTH CLEAR", statusClass: "bg-slate-100 text-slate-700 border-slate-300", aspect: "RED (STOP)", aspectColor: "#ef4444", locked: false, speed: "0 km/h", eta: "ETA: 21:00", route: "Fast Corridor Up" },
    { pf: "Platform 14 (Pahar Ganj Side)", train: "12417 Prayagraj Express", loco: "WAP7 #30200 (CNB)", status: "OCCUPIED (MAINTENANCE)", statusClass: "bg-purple-100 text-purple-800 border-purple-300", aspect: "RED (STOP)", aspectColor: "#ef4444", locked: true, speed: "0 km/h", eta: "Dep: 22:10", route: "Pahar Ganj Yard" },
    { pf: "Platform 15 (Goods Bypass)", train: "Freight BOXN #58102 (Coal)", loco: "Twin WAG9 #31154", status: "THROUGH PASS-BY", statusClass: "bg-blue-100 text-blue-800 border-blue-300", aspect: "GREEN (CLEAR)", aspectColor: "#10b981", locked: true, speed: "65 km/h", eta: "Pass: 17:00", route: "Goods Chord Line" },
    { pf: "Platform 16 (East Express Bay)", train: "22436 Kashi Vande Bharat", loco: "Trainset #02 (BSB)", status: "READY FOR DEPARTURE", statusClass: "bg-emerald-100 text-emerald-800 border-emerald-300", aspect: "GREEN (CLEAR)", aspectColor: "#10b981", locked: true, speed: "130 km/h", eta: "Dep: 17:15", route: "East Main ➔ ALJN" },
  ];

  // Mock State for T/1425 Electronic Train Register Book (E-TRB)
  let trbEntries = [
    { id: "TRB-9412", train: "12951 Mumbai Rajdhani", loco: "WAP7 #30211", dir: "DOWN", blockIn: "16:10:05", lineClearPn: "PN-4819", arr: "16:22:15", pf: "PF 1", dep: "16:55:00", outPn: "PN-4822", kavachSpeed: "28 km/h", status: "OPEN (AT BERTH)", remarks: "On time, Kavach SIL-4 healthy" },
    { id: "TRB-9411", train: "12012 Vande Bharat Express", loco: "Trainset #08", dir: "UP", blockIn: "15:45:00", lineClearPn: "PN-4815", arr: "15:52:10", pf: "PF 2", dep: "16:15:00", outPn: "PN-4818", kavachSpeed: "0 km/h", status: "CLOSED (DEPARTED)", remarks: "Departed on Schedule" },
    { id: "TRB-9410", train: "12059 Kota Jan Shatabdi", loco: "WAP5 #30004", dir: "DOWN", blockIn: "15:15:30", lineClearPn: "PN-4811", arr: "15:24:00", pf: "PF 3", dep: "15:35:00", outPn: "PN-4814", kavachSpeed: "0 km/h", status: "CLOSED (DEPARTED)", remarks: "Caution order T/409 issued for Km 14/2" },
    { id: "TRB-9409", train: "Freight WAG9 #31088", loco: "WAG9 #31088", dir: "DOWN", blockIn: "14:40:12", lineClearPn: "PN-4806", arr: "14:55:20", pf: "PF 4", dep: "15:10:00", outPn: "PN-4809", kavachSpeed: "14 km/h", status: "CLOSED (YARD CLEAR)", remarks: "Shunting to Wash Line 2 completed" },
    { id: "TRB-9408", train: "12302 Howrah Rajdhani", loco: "WAP7 #30219", dir: "UP", blockIn: "14:10:00", lineClearPn: "PN-4801", arr: "14:21:45", pf: "PF 8", dep: "16:50:00", outPn: "PN-4804", kavachSpeed: "22 km/h", status: "OPEN (AT BERTH)", remarks: "Primary maintenance certified" },
    { id: "TRB-9407", train: "22436 Kashi Vande Bharat", loco: "Trainset #02", dir: "DOWN", blockIn: "13:30:10", lineClearPn: "PN-4796", arr: "13:42:00", pf: "PF 16", dep: "17:15:00", outPn: "PN-4799", kavachSpeed: "30 km/h", status: "OPEN (BOARDING)", remarks: "Kavach Radio transponder synced" },
    { id: "TRB-9406", train: "64091 Shakurbasti EMU", loco: "EMU #401", dir: "UP", blockIn: "13:05:00", lineClearPn: "PN-4792", arr: "13:12:30", pf: "PF 9", dep: "13:20:00", outPn: "PN-4795", kavachSpeed: "18 km/h", status: "CLOSED (DEPARTED)", remarks: "Normal suburban run" },
    { id: "TRB-9405", train: "BOXN Coal Rake #58102", loco: "WAG9 #31154", dir: "DOWN", blockIn: "12:35:14", lineClearPn: "PN-4788", arr: "12:45:00", pf: "PF 15", dep: "12:50:00", outPn: "PN-4790", kavachSpeed: "45 km/h", status: "CLOSED (THROUGH)", remarks: "Green corridor through pass-by" }
  ];

  // Mock State for Caution Orders (T/409, T/369-3b, T/806)
  let cautionOrders = [
    { id: "CO-2026-0881", form: "T/409 (TSR)", train: "12951 Mumbai Rajdhani", section: "NDLS - NZM Up Main (Km 14/2 - 15/4)", speed: "30 km/h", normalSpeed: "110 km/h", cause: "Manual Track Deep Screening & Ballast Packing", issuedAt: "10:15 AM", validTill: "18:00 IST", issuer: "SSE P-Way / NZM", status: "TRANSMITTED TO KAVACH" },
    { id: "CO-2026-0880", form: "T/409 (TSR)", train: "All Down Trains", section: "NZM - FDB Dn Main (Km 24/8 - 25/2)", speed: "45 km/h", normalSpeed: "130 km/h", cause: "OHE Catenary Wire Dropper Replacement", issuedAt: "09:30 AM", validTill: "16:30 IST", issuer: "SSE OHE / FDB", status: "ACTIVE IN SYSTEM" },
    { id: "CO-2026-0879", form: "T/806 (Shunt)", train: "WAG9 Freight #31088", section: "NDLS Yard Line 4 to Washing Line 2", speed: "15 km/h", normalSpeed: "15 km/h", cause: "Rake Stabling and Watering Movement", issuedAt: "09:12 AM", validTill: "10:45 IST", issuer: "Station Master / NDLS", status: "COMPLETED & ARCHIVED" },
    { id: "CO-2026-0878", form: "T/369(3b)", train: "12059 Jan Shatabdi", section: "Starter Signal S-12 (NDLS Yard)", speed: "15 km/h", normalSpeed: "60 km/h", cause: "Signal Lamp Circuit Transient Glitch - Authority to Pass", issuedAt: "08:45 AM", validTill: "09:00 IST", issuer: "Station Master / NDLS", status: "EXECUTED SAFELY" }
  ];

  // Public Announcement Chime & Speech Simulator
  window.triggerStationAnnouncement = function (trainNo, pfNo, type) {
    const train = platformData.find(p => p.train.includes(trainNo)) || platformData[0];
    const msgHindi = `यात्रीगण कृपया ध्यान दें, गाड़ी संख्या ${trainNo} ${train.train.split(' ')[1] || 'एक्सप्रेस'} प्लेटफॉर्म संख्या ${pfNo} पर ${type === 'arr' ? 'आ रही है' : 'खड़ी है तथा शीघ्र प्रस्थान करेगी'}।`;
    const msgEng = `May I have your attention please, Train number ${trainNo}, is ${type === 'arr' ? 'arriving on' : 'ready for departure from'} Platform number ${pfNo}.`;

    // Visual Toast & Audio Chime
    if (window.showToast) {
      window.showToast(`📢 Announcement Broadcasted on PF ${pfNo} (Hindi & English)`, "success");
    }

    const logBox = document.getElementById("paLiveBroadcastLog");
    if (logBox) {
      const timeNow = new Date().toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      logBox.innerHTML = `
        <div class="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-1 mb-2">
          <div class="flex items-center justify-between text-[#12355B] font-bold">
            <span><i class="fa-solid fa-volume-high text-[#FF9933] mr-1"></i> PF ${pfNo} Broadcast Active</span>
            <span class="font-mono text-[10px] text-slate-500">${timeNow}</span>
          </div>
          <p class="text-slate-800 font-semibold">🇮🇳 ${msgHindi}</p>
          <p class="text-slate-600 font-medium">🇬🇧 ${msgEng}</p>
        </div>
      ` + logBox.innerHTML;
    }
  };

  // Toggle Signal Aspect
  window.smToggleSignal = function (pfIndex) {
    const pf = platformData[pfIndex];
    if (!pf) return;
    if (pf.aspect.includes("GREEN")) {
      pf.aspect = "YELLOW (CAUTION)";
      pf.aspectColor = "#f59e0b";
    } else if (pf.aspect.includes("YELLOW")) {
      pf.aspect = "RED (STOP)";
      pf.aspectColor = "#ef4444";
    } else {
      pf.aspect = "GREEN (CLEAR)";
      pf.aspectColor = "#10b981";
    }
    if (window.showToast) {
      window.showToast(`🚦 Changed Signal Aspect on ${pf.pf} to ${pf.aspect}`, "info");
    }
    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderStationMasterWorkspace) {
      window.renderStationMasterWorkspace(container);
    }
  };

  // Toggle Route Lock
  window.smToggleRouteLock = function (pfIndex) {
    const pf = platformData[pfIndex];
    if (!pf) return;
    pf.locked = !pf.locked;
    if (window.showToast) {
      window.showToast(pf.locked ? `🔒 Route Locked for ${pf.pf} (Interlocking Engaged)` : `🔓 Route Released for ${pf.pf}`, pf.locked ? "success" : "info");
    }
    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderStationMasterWorkspace) {
      window.renderStationMasterWorkspace(container);
    }
  };

  // Switch Sub-Tabs
  window.switchSmSubTab = function (tabKey) {
    activeSmSubTab = tabKey;
    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderStationMasterWorkspace) {
      window.renderStationMasterWorkspace(container);
    }
  };

  // Main Renderer for Station Master
  window.renderStationMasterWorkspace = function (container) {
    if (!container) return;

    let contentHtml = "";

    if (activeSmSubTab === "sm_platforms") {
      contentHtml = `
        <!-- SUB-TAB 1: ELECTRONIC INTERLOCKING (EI) & 16-PLATFORM MATRIX -->
        <div class="space-y-4">
          <!-- Yard Interlocking Summary Bar -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div class="glass-card p-3.5 border-l-4 border-emerald-500 flex items-center justify-between">
              <div>
                <p class="text-[11px] text-slate-500 font-bold uppercase">Active Platform Lines</p>
                <p class="text-xl font-black text-[#12355B] font-mono">16 / 16</p>
              </div>
              <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-train-subway"></i>
              </div>
            </div>

            <div class="glass-card p-3.5 border-l-4 border-blue-500 flex items-center justify-between">
              <div>
                <p class="text-[11px] text-slate-500 font-bold uppercase">Routes Locked</p>
                <p class="text-xl font-black text-blue-700 font-mono">11 Routes</p>
              </div>
              <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-lock"></i>
              </div>
            </div>

            <div class="glass-card p-3.5 border-l-4 border-amber-500 flex items-center justify-between">
              <div>
                <p class="text-[11px] text-slate-500 font-bold uppercase">Point Machines Active</p>
                <p class="text-xl font-black text-amber-700 font-mono">48 Points (OK)</p>
              </div>
              <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-code-branch"></i>
              </div>
            </div>

            <div class="glass-card p-3.5 border-l-4 border-purple-500 flex items-center justify-between">
              <div>
                <p class="text-[11px] text-slate-500 font-bold uppercase">Kavach SIL-4 Yard SRU</p>
                <p class="text-xl font-black text-purple-700 font-mono">ARMED 160.225</p>
              </div>
              <div class="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-shield-halved"></i>
              </div>
            </div>
          </div>

          <!-- Platform Lines Table -->
          <div class="glass-card p-5 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                  <i class="fa-solid fa-diagram-project text-[#FF9933]"></i> New Delhi (NDLS) Station Yard Electronic Interlocking Matrix
                </h3>
                <p class="text-xs text-slate-500">Live interlocking detection, axle counter occupancy, signal aspects & route locking</p>
              </div>
              <div class="flex items-center gap-2 text-xs">
                <span class="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span> EI PANEL NORMAL
                </span>
                <button onclick="if(window.showToast) window.showToast('Synchronized all 48 Point Machines with Interlocking Core', 'info')" class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#12355B] font-bold border border-slate-300 transition-all">
                  <i class="fa-solid fa-arrows-rotate mr-1"></i> Sync Points
                </button>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="text-[11px] font-black text-slate-600 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th class="py-3 px-3">Platform Line</th>
                    <th class="py-3 px-3">Assigned Train / Loco</th>
                    <th class="py-3 px-3">Line Status</th>
                    <th class="py-3 px-3">Kavach Signal Aspect</th>
                    <th class="py-3 px-3">Route Interlocking</th>
                    <th class="py-3 px-3">Speed Limit</th>
                    <th class="py-3 px-3">ETA / Departure</th>
                    <th class="py-3 px-3 text-right">Operational Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-semibold text-slate-800">
                  ${platformData.map((pf, idx) => `
                    <tr class="hover:bg-slate-50/80 transition-colors">
                      <td class="py-3 px-3 font-mono font-bold text-[#12355B]">
                        ${pf.pf}
                        <div class="text-[10px] text-slate-400 font-sans">${pf.route}</div>
                      </td>
                      <td class="py-3 px-3">
                        <span class="font-bold text-[#12355B]">${pf.train}</span>
                        <div class="text-[10px] text-slate-500 font-mono">${pf.loco}</div>
                      </td>
                      <td class="py-3 px-3">
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${pf.statusClass}">${pf.status}</span>
                      </td>
                      <td class="py-3 px-3">
                        <span class="inline-flex items-center gap-1.5 font-bold" style="color: ${pf.aspectColor};">
                          <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${pf.aspectColor};"></span>
                          ${pf.aspect}
                        </span>
                      </td>
                      <td class="py-3 px-3">
                        ${pf.locked 
                          ? '<span class="text-emerald-700 font-bold flex items-center gap-1"><i class="fa-solid fa-lock text-emerald-600"></i> Locked</span>' 
                          : '<span class="text-amber-600 font-bold flex items-center gap-1"><i class="fa-solid fa-lock-open text-amber-500"></i> Unlocked</span>'}
                      </td>
                      <td class="py-3 px-3 font-mono text-slate-700">${pf.speed}</td>
                      <td class="py-3 px-3 font-mono text-slate-600">${pf.eta}</td>
                      <td class="py-3 px-3 text-right space-x-1">
                        <button onclick="smToggleSignal(${idx})" title="Change Signal Aspect" class="px-2.5 py-1 rounded bg-[#12355B] hover:bg-[#1D4877] text-white text-[11px] font-bold shadow-sm transition-all">
                          <i class="fa-solid fa-traffic-light mr-1"></i> Signal
                        </button>
                        <button onclick="smToggleRouteLock(${idx})" title="Toggle Route Interlocking Lock" class="px-2.5 py-1 rounded ${pf.locked ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white text-[11px] font-bold shadow-sm transition-all">
                          ${pf.locked ? '<i class="fa-solid fa-unlock"></i> Release' : '<i class="fa-solid fa-lock"></i> Lock'}
                        </button>
                        <button onclick="triggerStationAnnouncement('${pf.train.split(' ')[0]}', '${idx + 1}', 'arr')" title="Trigger Public Announcement" class="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-bold transition-all">
                          <i class="fa-solid fa-bullhorn"></i>
                        </button>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } else if (activeSmSubTab === "sm_trb") {
      contentHtml = `
        <!-- SUB-TAB 2: ELECTRONIC TRAIN REGISTER BOOK (T/1425 TRB) -->
        <div class="glass-card p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                <i class="fa-solid fa-book-bookmark text-[#FF9933]"></i> Electronic Train Register Book (T/1425 E-TRB Live Register)
              </h3>
              <p class="text-xs text-slate-500">Official statutory register for train arrivals, departures, line clear private numbers & Kavach telemetry</p>
            </div>

            <div class="flex flex-wrap items-center gap-2 text-xs">
              <!-- Direction Filter -->
              <div class="flex items-center rounded-lg border border-slate-300 p-0.5 bg-slate-100 font-bold">
                <button onclick="window.setSmFilter('ALL')" class="px-2.5 py-1 rounded-md ${smDirectionFilter === 'ALL' ? 'bg-[#12355B] text-white' : 'text-slate-600 hover:text-slate-900'}">All Directions</button>
                <button onclick="window.setSmFilter('UP')" class="px-2.5 py-1 rounded-md ${smDirectionFilter === 'UP' ? 'bg-[#12355B] text-white' : 'text-slate-600 hover:text-slate-900'}">UP Main</button>
                <button onclick="window.setSmFilter('DOWN')" class="px-2.5 py-1 rounded-md ${smDirectionFilter === 'DOWN' ? 'bg-[#12355B] text-white' : 'text-slate-600 hover:text-slate-900'}">DOWN Main</button>
              </div>

              <!-- New TRB Entry Button -->
              <button onclick="window.openNewTrbModal()" class="px-3.5 py-1.5 rounded-lg bg-[#12355B] hover:bg-[#1D4877] text-white font-bold flex items-center gap-1.5 shadow transition-all">
                <i class="fa-solid fa-plus"></i> New Movement Log (PN)
              </button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs font-mono">
              <thead class="text-[10px] font-black text-slate-600 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="py-3 px-2.5">Entry ID</th>
                  <th class="py-3 px-2.5 font-sans">Train No. & Name</th>
                  <th class="py-3 px-2.5">Loco / Shed</th>
                  <th class="py-3 px-2.5">Dir</th>
                  <th class="py-3 px-2.5">Block In</th>
                  <th class="py-3 px-2.5">Line Clear PN</th>
                  <th class="py-3 px-2.5">Arrival</th>
                  <th class="py-3 px-2.5">PF</th>
                  <th class="py-3 px-2.5">Departure</th>
                  <th class="py-3 px-2.5">Out PN</th>
                  <th class="py-3 px-2.5">Kavach Speed</th>
                  <th class="py-3 px-2.5">Status</th>
                  <th class="py-3 px-2.5 font-sans">Remarks</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-semibold text-slate-800">
                ${trbEntries
                  .filter(e => smDirectionFilter === 'ALL' || e.dir === smDirectionFilter)
                  .map(entry => `
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 px-2.5 font-bold text-[#12355B]">${entry.id}</td>
                    <td class="py-3 px-2.5 font-sans font-bold text-[#12355B]">${entry.train}</td>
                    <td class="py-3 px-2.5 text-slate-600">${entry.loco}</td>
                    <td class="py-3 px-2.5"><span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${entry.dir === 'UP' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}">${entry.dir}</span></td>
                    <td class="py-3 px-2.5 text-slate-600">${entry.blockIn}</td>
                    <td class="py-3 px-2.5 text-emerald-700 font-bold">${entry.lineClearPn}</td>
                    <td class="py-3 px-2.5 text-slate-800 font-bold">${entry.arr}</td>
                    <td class="py-3 px-2.5 text-[#FF9933] font-bold font-sans">${entry.pf}</td>
                    <td class="py-3 px-2.5 text-slate-800 font-bold">${entry.dep}</td>
                    <td class="py-3 px-2.5 text-blue-700 font-bold">${entry.outPn}</td>
                    <td class="py-3 px-2.5 text-purple-700">${entry.kavachSpeed}</td>
                    <td class="py-3 px-2.5">
                      <span class="px-2 py-0.5 rounded text-[9px] font-extrabold ${entry.status.includes('OPEN') ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-200 text-slate-700'}">${entry.status}</span>
                    </td>
                    <td class="py-3 px-2.5 font-sans text-slate-500 text-[11px] truncate max-w-[150px]">${entry.remarks}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (activeSmSubTab === "sm_caution") {
      contentHtml = `
        <!-- SUB-TAB 3: CAUTION ORDERS (T/409, T/369-3b, T/806) & PERMITS -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <!-- Caution Order Creator Form (5 cols) -->
          <div class="lg:col-span-5 glass-card p-5 space-y-4">
            <div class="border-b border-slate-200 pb-2.5">
              <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                <i class="fa-solid fa-file-signature text-[#FF9933]"></i> Issue Caution Order / Authority (T-Series)
              </h3>
              <p class="text-xs text-slate-500">Official authority transmitted directly to Loco Pilot Cab DMI via Kavach RF</p>
            </div>

            <form onsubmit="window.submitCautionOrder(event)" class="space-y-3 text-xs">
              <div>
                <label class="block font-bold text-slate-700 mb-1">Select Authority Form Type</label>
                <select id="coFormType" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold focus:ring-2 focus:ring-blue-500">
                  <option value="T/409 (TSR)">T/409 — Caution Order (Temporary Speed Restriction)</option>
                  <option value="T/A 409 (NIL)">T/A 409 — Nil Caution Order (Clear Section)</option>
                  <option value="T/369(3b)">T/369(3b) — Authority to Pass Signal at Danger with Caution</option>
                  <option value="T/806 (Shunt)">T/806 — Shunting Authority Order (Yard Points Locked)</option>
                  <option value="T/511 (TOS)">T/511 — Authority for Train on Section Line Clear</option>
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Target Train / Locomotive ID</label>
                <select id="coTrain" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold">
                  <option value="12951 Mumbai Rajdhani">12951 Mumbai Rajdhani (WAP7 #30211)</option>
                  <option value="12012 Vande Bharat Express">12012 Vande Bharat Express (Trainset #08)</option>
                  <option value="12059 Kota Jan Shatabdi">12059 Kota Jan Shatabdi (WAP5 #30004)</option>
                  <option value="Freight WAG9 #31088">Freight WAG9 #31088 (Tughlakabad Yard)</option>
                  <option value="12302 Howrah Rajdhani">12302 Howrah Rajdhani (WAP7 #30219)</option>
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Track Section & Km Chainage</label>
                <input type="text" id="coSection" placeholder="e.g. NDLS - NZM Up Main (Km 14/2 - 15/4)" required value="NDLS - NZM Up Main (Km 14/2 - 15/4)" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Enforced Speed</label>
                  <select id="coSpeed" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold font-mono">
                    <option value="15 km/h">15 km/h (Dead Slow)</option>
                    <option value="30 km/h" selected>30 km/h (Track Work)</option>
                    <option value="45 km/h">45 km/h (Point Testing)</option>
                    <option value="60 km/h">60 km/h (Bridge Repair)</option>
                  </select>
                </div>
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Valid Until Time</label>
                  <input type="text" id="coValidTill" value="18:30 IST" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold font-mono" />
                </div>
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">Cause / Engineering Reason</label>
                <input type="text" id="coCause" placeholder="e.g. Deep Screening & Tamping Work" value="Deep Screening & Packing under Track Machine 3X" required class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900" />
              </div>

              <button type="submit" class="w-full py-2.5 rounded-xl bg-[#12355B] hover:bg-[#1D4877] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2">
                <i class="fa-solid fa-satellite-dish text-[#FF9933]"></i> Transmit Authority via Kavach RF Link
              </button>
            </form>
          </div>

          <!-- Active Caution Orders Register (7 cols) -->
          <div class="lg:col-span-7 glass-card p-5 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                  <i class="fa-solid fa-list-check text-emerald-600"></i> Active Caution Orders & Permits Register
                </h3>
                <p class="text-xs text-slate-500">Live bulletin synchronized with Section Controller & Kavach Base Station</p>
              </div>
              <span class="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-mono font-bold">${cautionOrders.length} Active Orders</span>
            </div>

            <div class="space-y-3">
              ${cautionOrders.map(co => `
                <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="px-2 py-0.5 rounded text-[10px] font-black bg-[#12355B] text-white font-mono">${co.id}</span>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 font-mono">${co.form}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">${co.status}</span>
                  </div>

                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <p class="font-bold text-[#12355B]">${co.train}</p>
                    <p class="font-mono text-slate-700">Enforced: <strong class="text-red-600">${co.speed}</strong> (Normal: ${co.normalSpeed})</p>
                  </div>

                  <p class="text-[11px] text-slate-600"><i class="fa-solid fa-location-dot text-[#FF9933] mr-1"></i> ${co.section}</p>
                  <p class="text-[11px] text-slate-500">Reason: ${co.cause} • Authority: <strong>${co.issuer}</strong></p>

                  <div class="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Issued: ${co.issuedAt}</span>
                    <span>Valid Till: ${co.validTill}</span>
                    <button onclick="window.printCautionOrder('${co.id}')" class="text-blue-600 hover:text-blue-800 font-bold font-sans flex items-center gap-1">
                      <i class="fa-solid fa-print"></i> Print Memo
                    </button>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      `;
    } else if (activeSmSubTab === "sm_pa") {
      contentHtml = `
        <!-- SUB-TAB 4: IPIS & PASSENGER DISPLAY / ANNOUNCEMENT TERMINAL -->
        <div class="space-y-4">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <!-- PA Audio Synthesizer Trigger (5 cols) -->
            <div class="lg:col-span-5 glass-card p-5 space-y-4">
              <div class="border-b border-slate-200 pb-2.5">
                <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                  <i class="fa-solid fa-bullhorn text-[#FF9933]"></i> Station Public Address (PA) Audio Terminal
                </h3>
                <p class="text-xs text-slate-500">Automated multi-lingual audio announcements conforming to IRCTC & CRIS format</p>
              </div>

              <div class="space-y-3 text-xs">
                <div>
                  <label class="block font-bold text-slate-700 mb-1">Select Train for Broadcast</label>
                  <select id="paTrainSelect" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold">
                    <option value="12951|1">12951 Mumbai Rajdhani Express (Platform 1)</option>
                    <option value="12012|2">12012 Vande Bharat Express (Platform 2)</option>
                    <option value="12059|3">12059 Kota Jan Shatabdi (Platform 3)</option>
                    <option value="12302|8">12302 Howrah Rajdhani Express (Platform 8)</option>
                    <option value="22436|16">22436 Kashi Vande Bharat Express (Platform 16)</option>
                  </select>
                </div>

                <div>
                  <label class="block font-bold text-slate-700 mb-1">Announcement Event Type</label>
                  <select id="paEventType" class="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 font-bold">
                    <option value="arr">Train Arriving at Platform (आगमन घोषणा)</option>
                    <option value="dep">Train Departing Shortly (प्रस्थान घोषणा)</option>
                    <option value="delay">Train Running Late / Delayed (विलंब सूचना)</option>
                    <option value="plat_change">Platform Change Emergency Announcement</option>
                  </select>
                </div>

                <div class="flex items-center gap-2 pt-2">
                  <button onclick="window.triggerPaCustom()" class="flex-1 py-2.5 rounded-xl bg-[#12355B] hover:bg-[#1D4877] text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2">
                    <i class="fa-solid fa-volume-high text-[#FF9933]"></i> Broadcast Announcement
                  </button>
                  <button onclick="if(window.showToast) window.showToast('Testing Station Audio Chime across All 16 Platforms', 'info')" class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-300">
                    <i class="fa-solid fa-bell"></i> Chime
                  </button>
                </div>

                <!-- Live Broadcast Activity Log -->
                <div class="pt-3 border-t border-slate-200">
                  <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Recent Station PA Broadcasts:</span>
                  <div id="paLiveBroadcastLog" class="max-h-48 overflow-y-auto space-y-2 text-xs">
                    <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div class="flex items-center justify-between text-[#12355B] font-bold">
                        <span><i class="fa-solid fa-volume-high text-[#FF9933] mr-1"></i> PF 1 Announcement Complete</span>
                        <span class="font-mono text-[10px] text-slate-400">16:25 IST</span>
                      </div>
                      <p class="text-slate-600 text-[11px] mt-1">12951 Mumbai Rajdhani arrived at Platform 1.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Platform Dynamic LED Coach Guidance Boards (7 cols) -->
            <div class="lg:col-span-7 glass-card p-5 space-y-4">
              <div class="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div>
                  <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                    <i class="fa-solid fa-tv text-blue-600"></i> Platform LED Coach Guidance Display Sync (IPIS)
                  </h3>
                  <p class="text-xs text-slate-500">Live electronic display boards situated above platform sheds</p>
                </div>
                <button onclick="if(window.showToast) window.showToast('Synced all 16 Platform LED Boards with Central Server', 'success')" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                  <i class="fa-solid fa-rotate mr-1"></i> Force Board Sync
                </button>
              </div>

              <!-- Platform 1 Simulation Display -->
              <div class="p-4 rounded-2xl bg-slate-950 text-white font-mono space-y-3 border-2 border-amber-500/50 shadow-xl">
                <div class="flex flex-wrap items-center justify-between text-xs text-amber-400 border-b border-amber-500/30 pb-2">
                  <span class="font-bold flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span> PLATFORM 1 (NEW DELHI)</span>
                  <span>12951 MUMBAI TEJAS RAJDHANI</span>
                  <span class="text-emerald-400">EXP: 16:55 (ON TIME)</span>
                </div>

                <!-- Coach Sequence Preview -->
                <div class="text-[11px] text-slate-300">Coach Guidance Layout (Engine to Rear Guard):</div>
                <div class="flex items-center gap-1 overflow-x-auto pb-2 text-[10px]">
                  <span class="px-2 py-1 rounded bg-red-700 text-white font-bold shrink-0">LOCO</span>
                  <span class="px-2 py-1 rounded bg-slate-800 text-slate-300 font-bold shrink-0">EOG</span>
                  <span class="px-2 py-1 rounded bg-blue-900 text-cyan-300 font-bold shrink-0">H1</span>
                  <span class="px-2 py-1 rounded bg-blue-900 text-cyan-300 font-bold shrink-0">A1</span>
                  <span class="px-2 py-1 rounded bg-blue-900 text-cyan-300 font-bold shrink-0">A2</span>
                  <span class="px-2 py-1 rounded bg-blue-900 text-cyan-300 font-bold shrink-0">A3</span>
                  <span class="px-2 py-1 rounded bg-amber-900 text-amber-200 font-bold shrink-0">PC (Pantry)</span>
                  <span class="px-2 py-1 rounded bg-blue-800 text-blue-200 font-bold shrink-0">B1</span>
                  <span class="px-2 py-1 rounded bg-blue-800 text-blue-200 font-bold shrink-0">B2</span>
                  <span class="px-2 py-1 rounded bg-blue-800 text-blue-200 font-bold shrink-0">B3</span>
                  <span class="px-2 py-1 rounded bg-blue-800 text-blue-200 font-bold shrink-0">B4</span>
                  <span class="px-2 py-1 rounded bg-blue-800 text-blue-200 font-bold shrink-0">B5</span>
                  <span class="px-2 py-1 rounded bg-slate-800 text-slate-300 font-bold shrink-0">EOG</span>
                </div>
              </div>

              <!-- Platform 16 Simulation Display (Vande Bharat) -->
              <div class="p-4 rounded-2xl bg-slate-950 text-white font-mono space-y-3 border-2 border-blue-500/50 shadow-xl">
                <div class="flex flex-wrap items-center justify-between text-xs text-cyan-400 border-b border-blue-500/30 pb-2">
                  <span class="font-bold flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span> PLATFORM 16 (NEW DELHI)</span>
                  <span>22436 KASHI VANDE BHARAT EXPRESS</span>
                  <span class="text-emerald-400">EXP: 17:15 (ON TIME)</span>
                </div>

                <div class="text-[11px] text-slate-300">Coach Guidance Layout (Vande Bharat 16-Car Trainset):</div>
                <div class="flex items-center gap-1 overflow-x-auto pb-2 text-[10px]">
                  <span class="px-2 py-1 rounded bg-cyan-700 text-white font-bold shrink-0">DTC 1</span>
                  <span class="px-2 py-1 rounded bg-blue-900 text-cyan-300 font-bold shrink-0">MC 1</span>
                  <span class="px-2 py-1 rounded bg-blue-900 text-cyan-300 font-bold shrink-0">TC 1</span>
                  <span class="px-2 py-1 rounded bg-purple-900 text-purple-200 font-bold shrink-0">EC 1 (Executive)</span>
                  <span class="px-2 py-1 rounded bg-purple-900 text-purple-200 font-bold shrink-0">EC 2</span>
                  <span class="px-2 py-1 rounded bg-blue-900 text-cyan-300 font-bold shrink-0">CC 1</span>
                  <span class="px-2 py-1 rounded bg-blue-900 text-cyan-300 font-bold shrink-0">CC 2</span>
                  <span class="px-2 py-1 rounded bg-blue-900 text-cyan-300 font-bold shrink-0">CC 3</span>
                  <span class="px-2 py-1 rounded bg-blue-900 text-cyan-300 font-bold shrink-0">CC 4</span>
                  <span class="px-2 py-1 rounded bg-cyan-700 text-white font-bold shrink-0">DTC 2</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (activeSmSubTab === "sm_block") {
      contentHtml = `
        <!-- SUB-TAB 5: UNIVERSAL FAIL-SAFE BLOCK INTERFACE (UFSBI) SIMULATOR -->
        <div class="glass-card p-5 space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                <i class="fa-solid fa-satellite-dish text-[#FF9933]"></i> Universal Fail-Safe Block Interface (UFSBI Block Instrument)
              </h3>
              <p class="text-xs text-slate-500">Tokenless block section management with adjacent block stations: Hazrat Nizamuddin (NZM) & Subzi Mandi (SZM)</p>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-bold">BLOCK SYSTEM FAIL-SAFE NORMAL</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- Section 1: NDLS to NZM (South Bound) -->
            <div class="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50 space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-bold text-[#12355B] text-sm">Block Section: NDLS ➔ Hazrat Nizamuddin (NZM)</h4>
                  <p class="text-xs text-slate-500 font-mono">Double Line Automatic Block (Chainage Km 0/0 to 14/0)</p>
                </div>
                <span class="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold font-mono">LINE CLEAR</span>
              </div>

              <!-- Visual Tokenless Instrument Status -->
              <div class="grid grid-cols-3 gap-3 text-center text-xs font-mono">
                <div class="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span class="text-[10px] text-slate-500 block">Block Indicator</span>
                  <strong class="text-emerald-700 text-sm">LINE CLEAR</strong>
                </div>
                <div class="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span class="text-[10px] text-slate-500 block">Axle Counter</span>
                  <strong class="text-emerald-700 text-sm">CLEAR (0)</strong>
                </div>
                <div class="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span class="text-[10px] text-slate-500 block">Last Exchanged PN</span>
                  <strong class="text-[#12355B] text-sm">PN-4822</strong>
                </div>
              </div>

              <div class="flex items-center gap-2 pt-2">
                <button onclick="window.sendBlockBellCode('NZM', 1)" class="flex-1 py-2 rounded-xl bg-[#12355B] hover:bg-[#1D4877] text-white font-bold text-xs shadow transition-all">
                  <i class="fa-solid fa-bell mr-1"></i> Bell (1 Beat: Attention)
                </button>
                <button onclick="window.sendBlockBellCode('NZM', 2)" class="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition-all">
                  <i class="fa-solid fa-circle-check mr-1"></i> Line Clear (2 Beats)
                </button>
              </div>
            </div>

            <!-- Section 2: NDLS to Subzi Mandi (North Bound) -->
            <div class="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50 space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="font-bold text-[#12355B] text-sm">Block Section: NDLS ➔ Subzi Mandi (SZM)</h4>
                  <p class="text-xs text-slate-500 font-mono">Double Line Block Section (Chainage Km 0/0 to 6/4)</p>
                </div>
                <span class="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold font-mono">TRAIN ON SECTION (TOS)</span>
              </div>

              <!-- Visual Tokenless Instrument Status -->
              <div class="grid grid-cols-3 gap-3 text-center text-xs font-mono">
                <div class="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span class="text-[10px] text-slate-500 block">Block Indicator</span>
                  <strong class="text-blue-700 text-sm">TOS (64091)</strong>
                </div>
                <div class="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span class="text-[10px] text-slate-500 block">Axle Counter</span>
                  <strong class="text-amber-600 text-sm">OCCUPIED</strong>
                </div>
                <div class="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                  <span class="text-[10px] text-slate-500 block">Last Exchanged PN</span>
                  <strong class="text-[#12355B] text-sm">PN-4795</strong>
                </div>
              </div>

              <div class="flex items-center gap-2 pt-2">
                <button onclick="window.sendBlockBellCode('SZM', 1)" class="flex-1 py-2 rounded-xl bg-[#12355B] hover:bg-[#1D4877] text-white font-bold text-xs shadow transition-all">
                  <i class="fa-solid fa-bell mr-1"></i> Bell (1 Beat: Attention)
                </button>
                <button onclick="window.sendBlockBellCode('SZM', 4)" class="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition-all">
                  <i class="fa-solid fa-flag-checkered mr-1"></i> Train Out (4 Beats)
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (activeSmSubTab === "sm_eta_planning") {
      contentHtml = `
        <!-- SUB-TAB 6: DYNAMIC ML ETA, PLATFORM REALLOCATION & RESOURCE PLANNING (SIH 2026) -->
        <div class="space-y-4">

          <!-- Platform Clash Warning Banner (If conflict detected) -->
          <div id="smPlatformConflictAlert" class="p-4 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-2 border-red-300 animate-pulse">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
                <i class="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded bg-black/40 text-[10px] font-mono font-black uppercase">CRITICAL PLATFORM CLASH DETECTED</span>
                  <span class="text-xs font-mono">Platform 2 at 11:35 AM</span>
                </div>
                <p class="text-sm font-black mt-0.5">Train 12304 (Poorva Express) ETA overlaps with Train 12951 (Mumbai Rajdhani) on Platform 2!</p>
                <p class="text-[11px] text-white/90">Outer home signal hold risk: 14 min cascade delay if not reallocated immediately.</p>
              </div>
            </div>
            <button onclick="window.smAutoReassignPlatform('12304', 'Platform 4')" class="px-4 py-2 rounded-xl bg-white text-slate-900 font-black text-xs hover:bg-slate-100 shadow-lg flex items-center gap-1.5 shrink-0 cursor-pointer">
              <i class="fa-solid fa-wand-magic-sparkles text-amber-600"></i> 1-Click Reallocate to Platform 4
            </button>
          </div>

          <!-- Summary KPI Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div class="glass-card p-3.5 border-l-4 border-blue-600 flex items-center justify-between">
              <div>
                <p class="text-[11px] text-slate-500 font-bold uppercase">ML Forecast Confidence</p>
                <p class="text-xl font-black text-[#12355B] font-mono">96.5% (±1.9m)</p>
              </div>
              <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-brain"></i>
              </div>
            </div>

            <div class="glass-card p-3.5 border-l-4 border-emerald-500 flex items-center justify-between">
              <div>
                <p class="text-[11px] text-slate-500 font-bold uppercase">Average NDLS Delay</p>
                <p class="text-xl font-black text-emerald-700 font-mono">+12.4 min</p>
              </div>
              <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-hourglass-half"></i>
              </div>
            </div>

            <div class="glass-card p-3.5 border-l-4 border-purple-500 flex items-center justify-between">
              <div>
                <p class="text-[11px] text-slate-500 font-bold uppercase">Cleaning Pit Lines Ready</p>
                <p class="text-xl font-black text-purple-700 font-mono">4 Rakes Active</p>
              </div>
              <div class="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-broom"></i>
              </div>
            </div>

            <div class="glass-card p-3.5 border-l-4 border-amber-500 flex items-center justify-between">
              <div>
                <p class="text-[11px] text-slate-500 font-bold uppercase">Feeder Fleet Synced</p>
                <p class="text-xl font-black text-amber-700 font-mono">18 DTC Buses</p>
              </div>
              <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-base">
                <i class="fa-solid fa-bus"></i>
              </div>
            </div>
          </div>

          <!-- Dynamic ETA Arrival Schedule & Operations Coordination Table -->
          <div class="glass-card p-5 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                  <i class="fa-solid fa-clock-rotate-left text-blue-600"></i> Dynamic ML Arrival Forecasts & Operational Handover
                </h3>
                <p class="text-xs text-slate-500">Live AI Expected Time of Arrival (ETA) adapting to ground speed restrictions, fog, and cascade headway</p>
              </div>
              <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold self-start sm:self-auto">
                <span class="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping mr-1"></span> GRADIENT BOOSTING v4.0 ACTIVE
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs font-sans">
                <thead>
                  <tr class="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th class="py-2 px-3">Train # & Name</th>
                    <th class="py-2 px-3">Priority</th>
                    <th class="py-2 px-3">Scheduled Arr</th>
                    <th class="py-2 px-3">Dynamic ML ETA</th>
                    <th class="py-2 px-3">Live Delay Factors</th>
                    <th class="py-2 px-3">Platform</th>
                    <th class="py-2 px-3">Cleaning Window</th>
                    <th class="py-2 px-3">Crew Lobby</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  <tr class="hover:bg-slate-50">
                    <td class="py-3 px-3 font-bold text-[#12355B]">
                      <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>22436 Kashi Vande Bharat</span>
                      </div>
                      <span class="text-[10px] text-slate-400 font-mono">WAP-7 / Trainset #02</span>
                    </td>
                    <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">PREMIUM (1)</span></td>
                    <td class="py-3 px-3 font-mono">10:08 AM</td>
                    <td class="py-3 px-3 font-mono font-bold text-emerald-700">10:14 AM <span class="text-[10px] text-amber-600">(+6m)</span></td>
                    <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">Dense Fog 0.8km / Double Yellow</span></td>
                    <td class="py-3 px-3 font-mono font-bold text-blue-700">Platform 1</td>
                    <td class="py-3 px-3"><span class="text-slate-700 font-mono">30 mins (10:20–10:50)</span></td>
                    <td class="py-3 px-3"><span class="text-emerald-700 font-mono font-bold">LP-2436 (Ready)</span></td>
                  </tr>

                  <tr class="hover:bg-slate-50">
                    <td class="py-3 px-3 font-bold text-[#12355B]">
                      <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>12951 Mumbai Rajdhani</span>
                      </div>
                      <span class="text-[10px] text-slate-400 font-mono">WAP-7 #30211</span>
                    </td>
                    <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">SUPERFAST (2)</span></td>
                    <td class="py-3 px-3 font-mono">10:35 AM</td>
                    <td class="py-3 px-3 font-mono font-bold text-amber-700">10:48 AM <span class="text-[10px] text-red-600">(+13m)</span></td>
                    <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px]">TSR 30km/h Caution at Km 14</span></td>
                    <td class="py-3 px-3 font-mono font-bold text-blue-700">Platform 2</td>
                    <td class="py-3 px-3"><span class="text-slate-700 font-mono">35 mins (10:55–11:30)</span></td>
                    <td class="py-3 px-3"><span class="text-emerald-700 font-mono font-bold">LP-2951 (Ready)</span></td>
                  </tr>

                  <tr class="hover:bg-slate-50">
                    <td class="py-3 px-3 font-bold text-[#12355B]">
                      <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>12007 Chennai Shatabdi</span>
                      </div>
                      <span class="text-[10px] text-slate-400 font-mono">WAP-7 #30412</span>
                    </td>
                    <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">PREMIUM (1)</span></td>
                    <td class="py-3 px-3 font-mono">11:10 AM</td>
                    <td class="py-3 px-3 font-mono font-bold text-emerald-700">11:10 AM <span class="text-[10px] text-emerald-600">(Right Time)</span></td>
                    <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px]">Nominal Line Clear Aspect</span></td>
                    <td class="py-3 px-3 font-mono font-bold text-blue-700">Platform 3</td>
                    <td class="py-3 px-3"><span class="text-slate-700 font-mono">Turnaround Pit 1</span></td>
                    <td class="py-3 px-3"><span class="text-emerald-700 font-mono font-bold">LP-2007 (Signed On)</span></td>
                  </tr>

                  <tr class="hover:bg-slate-50 bg-amber-50/40">
                    <td class="py-3 px-3 font-bold text-[#12355B]">
                      <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-red-500"></span>
                        <span>12304 Poorva Express</span>
                      </div>
                      <span class="text-[10px] text-slate-400 font-mono">WAP-7 #30219</span>
                    </td>
                    <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-bold">EXPRESS (3)</span></td>
                    <td class="py-3 px-3 font-mono">11:15 AM</td>
                    <td class="py-3 px-3 font-mono font-bold text-red-600">11:35 AM <span class="text-[10px] font-black">(+20m)</span></td>
                    <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 text-[10px]">Preceding Freight Cascade (+12m)</span></td>
                    <td class="py-3 px-3 font-mono font-bold text-purple-700" id="poorvaPlatformCell">Platform 2 <span class="text-[9px] text-red-600 block">(Clash Alert)</span></td>
                    <td class="py-3 px-3"><span class="text-slate-700 font-mono">40 mins (11:45–12:25)</span></td>
                    <td class="py-3 px-3"><span class="text-amber-700 font-mono font-bold">LP-2304 (En Route)</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Bottom Operational Panels: Turnaround Cleaning & Feeder Transport -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            <div class="glass-card p-4 space-y-3">
              <h4 class="font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                <i class="fa-solid fa-broom text-purple-600"></i> Rake Turnaround Cleaning & Water Maintenance
              </h4>
              <p class="text-slate-500 text-[11px]">Dynamic cleaning crew coordination calculated from predicted arrival timestamps</p>
              
              <div class="space-y-2 font-mono">
                <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span class="font-bold text-[#12355B] block">Washing Pit Line 2 (Vande Bharat Rake)</span>
                    <span class="text-[10px] text-slate-500">Scheduled: 10:20 AM – 10:50 AM (30 min window)</span>
                  </div>
                  <span class="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">CREW READY</span>
                </div>

                <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span class="font-bold text-[#12355B] block">Washing Pit Line 4 (Rajdhani Express)</span>
                    <span class="text-[10px] text-slate-500">Rescheduled ETA: 10:55 AM (Turnaround Adjusted)</span>
                  </div>
                  <span class="px-2 py-1 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">TIME SHIFTED</span>
                </div>
              </div>
            </div>

            <div class="glass-card p-4 space-y-3">
              <h4 class="font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                <i class="fa-solid fa-bus text-amber-600"></i> City Feeder Bus & Downstream Logistics Dispatch
              </h4>
              <p class="text-slate-500 text-[11px]">Automated passenger connectivity broadcast to DTC & Metro feeder fleets</p>
              
              <div class="space-y-2">
                <div class="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <div>
                    <span class="font-bold text-[#12355B] block">DTC Route 419 (NDLS to Central Secretariat)</span>
                    <span class="text-[10px] text-slate-600">Departure synchronized with Rajdhani 12951 (+13m push)</span>
                  </div>
                  <span class="px-2 py-1 rounded bg-blue-600 text-white font-mono font-bold text-[10px]">FLEET SYNCED</span>
                </div>

                <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span class="font-bold text-[#12355B] block">NDLS Metro Airport Express Link</span>
                    <span class="text-[10px] text-slate-600">Peak interval running at 10-minute frequency</span>
                  </div>
                  <span class="px-2 py-1 rounded bg-emerald-600 text-white font-mono font-bold text-[10px]">NOMINAL</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      `;
    }

    // Wrap in Master Station Master Container
    container.innerHTML = `
      <div class="space-y-5">
        <!-- Top Action Header Banner (Official Indian Railways Theme) -->
        <div class="glass-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-8 border-[#FF9933] shadow-md">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-[#12355B] text-xs font-black uppercase tracking-wider font-mono">STATION MASTER OPERATIONS CONSOLE</span>
              <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">DUTY SM: R. K. SHARMA (SHIFT A)</span>
            </div>
            <h2 class="text-2xl font-black text-[#12355B] font-['Outfit'] mt-1 flex items-center gap-2">
              🚉 New Delhi (NDLS) Station Command & Interlocking Center
            </h2>
            <p class="text-xs text-slate-600 font-medium">Platform allotment, Electronic Interlocking (EI), E-TRB (T/1425), Caution Orders (T/409), IPIS PA announcements & UFSBI block</p>
            <div id="smWeatherTelemetryPill" class="mt-2 flex items-center gap-2 flex-wrap text-[11px] font-mono">
              <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1.5 font-bold">
                <i class="fa-solid fa-spinner fa-spin text-amber-500"></i>
                <span>NDLS Live Weather: Polling Open-Meteo Satellite...</span>
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 text-xs shrink-0">
            <button onclick="window.grantStationLineClear()" class="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer">
              <i class="fa-solid fa-circle-check"></i> Grant Line Clear (PN)
            </button>
            <button onclick="window.emergencyStationBlock()" class="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer">
              <i class="fa-solid fa-triangle-exclamation"></i> Emergency All-Red Block
            </button>
          </div>
        </div>

        <!-- Sub-Tabs Navigation Bar -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button type="button" onclick="switchSmSubTab('sm_eta_planning')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeSmSubTab === 'sm_eta_planning' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-clock-rotate-left text-[#FF9933] mr-1.5"></i> Dynamic ML ETA & Platform Reallocation
          </button>
          <button type="button" onclick="switchSmSubTab('sm_platforms')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeSmSubTab === 'sm_platforms' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-diagram-project text-[#FF9933] mr-1.5"></i> Platform Lines & Interlocking (16 Lines)
          </button>
          <button type="button" onclick="switchSmSubTab('sm_trb')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeSmSubTab === 'sm_trb' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-book-bookmark text-[#FF9933] mr-1.5"></i> Train Register Book (T/1425 E-TRB)
          </button>
          <button type="button" onclick="switchSmSubTab('sm_caution')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeSmSubTab === 'sm_caution' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-file-signature text-[#FF9933] mr-1.5"></i> Caution Orders (T/409) & Authorities
          </button>
          <button type="button" onclick="switchSmSubTab('sm_pa')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeSmSubTab === 'sm_pa' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-bullhorn text-[#FF9933] mr-1.5"></i> PA System & Passenger Guidance (IPIS)
          </button>
          <button type="button" onclick="switchSmSubTab('sm_block')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeSmSubTab === 'sm_block' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-satellite-dish text-[#FF9933] mr-1.5"></i> UFSBI Block Instrument
          </button>
        </div>

        <!-- Rendered Sub-Tab Content -->
        <div>
          ${contentHtml}
        </div>
      </div>
    `;

    // Asynchronously fetch live weather for Station Master console
    setTimeout(async () => {
      const pill = document.getElementById("smWeatherTelemetryPill");
      if (pill && window.WeatherEngine) {
        try {
          const w = await window.WeatherEngine.getStationWeather("NDLS");
          pill.innerHTML = `
            <span class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 font-bold">
              <i class="fa-solid ${w.icon}"></i>
              <span>NDLS: <strong>${w.temp}°C</strong> (${w.condition})</span>
            </span>
            <span class="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
              <i class="fa-solid fa-wind text-blue-500"></i>
              <span>Wind: <strong>${w.windSpeed} km/h</strong></span>
            </span>
            <span class="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
              <i class="fa-solid fa-eye text-purple-500"></i>
              <span>Visibility: <strong>${w.visibilityKm} km</strong></span>
            </span>
            <span class="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
              <i class="fa-solid fa-temperature-arrow-up text-amber-600"></i>
              <span>Rail Temp ($T_{rail}$): <strong>${w.safety.railTemp}°C</strong></span>
            </span>
            <span class="px-2.5 py-1 rounded-lg ${w.safety.fogColor} font-bold">
              ${w.safety.fogTsr}
            </span>
          `;
        } catch (e) {
          console.warn("Could not load SM weather:", e);
        }
      }
    }, 15);
  };

  // Filter Helper
  window.setSmFilter = function (filter) {
    smDirectionFilter = filter;
    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderStationMasterWorkspace) {
      window.renderStationMasterWorkspace(container);
    }
  };

  // Submit Caution Order
  window.submitCautionOrder = function (e) {
    e.preventDefault();
    const formType = document.getElementById("coFormType").value;
    const train = document.getElementById("coTrain").value;
    const section = document.getElementById("coSection").value;
    const speed = document.getElementById("coSpeed").value;
    const cause = document.getElementById("coCause").value;
    const validTill = document.getElementById("coValidTill").value;

    const newCo = {
      id: `CO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      form: formType,
      train: train,
      section: section,
      speed: speed,
      normalSpeed: "110 km/h",
      cause: cause,
      issuedAt: new Date().toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true }),
      validTill: validTill,
      issuer: "Station Master / NDLS",
      status: "TRANSMITTED TO KAVACH"
    };

    cautionOrders.unshift(newCo);
    if (window.showToast) {
      window.showToast(`✅ Issued ${formType} for ${train} (${speed}) transmitted via Kavach RF!`, "success");
    }

    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderStationMasterWorkspace) {
      window.renderStationMasterWorkspace(container);
    }
  };

  // Custom PA Trigger
  window.triggerPaCustom = function () {
    const rawVal = document.getElementById("paTrainSelect").value;
    const [trainNo, pfNo] = rawVal.split("|");
    const eventType = document.getElementById("paEventType").value;
    window.triggerStationAnnouncement(trainNo, pfNo, eventType);
  };

  // Print Caution Order Memo
  window.printCautionOrder = function (coId) {
    const co = cautionOrders.find(c => c.id === coId);
    if (!co) return;
    if (window.showToast) {
      window.showToast(`🖨️ Printing Statutory Form ${co.form} Memo for ${co.train}`, "info");
    }
  };

  // Block Instrument Bell Code
  window.sendBlockBellCode = function (station, beats) {
    const beatNames = {
      1: "1 Beat: Call Attention",
      2: "2 Beats: Is Line Clear Inquiry",
      3: "3 Beats: Train Entering Block Section (TOS)",
      4: "4 Beats: Train Out of Block Section"
    };
    if (window.showToast) {
      window.showToast(`🔔 Transmitted ${beatNames[beats]} to Station ${station}`, "success");
    }
  };

  // Grant Line Clear
  window.grantStationLineClear = function () {
    const randomPn = `PN-${Math.floor(1000 + Math.random() * 9000)}`;
    if (window.showToast) {
      window.showToast(`✅ Line Clear Granted! Generated Private Number: ${randomPn} (Logged in E-TRB)`, "success");
    }
  };

  // Emergency Station All-Red Block
  window.emergencyStationBlock = function () {
    platformData.forEach(p => {
      p.aspect = "RED (STOP)";
      p.aspectColor = "#ef4444";
    });
    if (window.showToast) {
      window.showToast(`🚨 STATION EMERGENCY BLOCK ACTIVATED: All 16 Platform Signals Set to RED (STOP)!`, "error");
    }
    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderStationMasterWorkspace) {
      window.renderStationMasterWorkspace(container);
    }
  };

  // Open New TRB Modal
  window.openNewTrbModal = function () {
    const randomPn = `PN-${Math.floor(1000 + Math.random() * 9000)}`;
    const timeNow = new Date().toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    const newEntry = {
      id: `TRB-${Math.floor(8000 + Math.random() * 1900)}`,
      train: "12431 Trivandrum Rajdhani",
      loco: "WAP7 #30302",
      dir: "DOWN",
      blockIn: timeNow,
      lineClearPn: randomPn,
      arr: "--",
      pf: "PF 11",
      dep: "--",
      outPn: "--",
      kavachSpeed: "42 km/h",
      status: "OPEN (INCOMING)",
      remarks: "Approaching Outer Home Signal"
    };

    trbEntries.unshift(newEntry);
    if (window.showToast) {
      window.showToast(`📝 New Train Movement Logged: Entry ${newEntry.id} with ${randomPn}`, "success");
    }
    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderStationMasterWorkspace) {
      window.renderStationMasterWorkspace(container);
    }
  };

  // SIH 2026: 1-Click Platform Reallocation Handler
  window.smAutoReassignPlatform = function (trainNo, newPf) {
    const alertEl = document.getElementById("smPlatformConflictAlert");
    if (alertEl) {
      alertEl.classList.remove("from-red-600", "to-amber-600", "animate-pulse", "border-red-300");
      alertEl.classList.add("from-emerald-700", "to-teal-800", "border-emerald-400");
      alertEl.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
            <i class="fa-solid fa-circle-check text-emerald-300"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-black/30 text-[10px] font-mono font-black uppercase text-emerald-200">PLATFORM CONFLICT RESOLVED</span>
              <span class="text-xs font-mono text-emerald-100">Diverted via Route 4-Up</span>
            </div>
            <p class="text-sm font-black mt-0.5">Train ${trainNo} successfully reallocated to ${newPf}!</p>
            <p class="text-[11px] text-emerald-100">Outer home delay avoided: 0 min cascade hold. Feeder and cleaning crews notified automatically.</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-3 py-1.5 rounded-xl bg-emerald-900/60 text-emerald-200 text-xs font-mono font-bold">
            <i class="fa-solid fa-satellite-dish mr-1 text-[#FF9933]"></i> Route Set & Locked
          </span>
        </div>
      `;
    }

    const cell = document.getElementById("poorvaPlatformCell");
    if (cell) {
      cell.className = "py-3 px-3 font-mono font-bold text-emerald-700";
      cell.innerHTML = `${newPf} <span class="text-[9px] text-emerald-600 font-bold block">(Reallocated • Clear)</span>`;
    }

    if (window.showToast) {
      window.showToast(`✅ Reallocated Train ${trainNo} to ${newPf}! Platform clash avoided and IPIS boards updated.`, "success");
    }

    // Trigger PA announcement for platform reallocation
    if (window.triggerStationAnnouncement) {
      window.triggerStationAnnouncement(trainNo, newPf.replace(/\D/g, ''), "plat_change");
    }
  };
})();

