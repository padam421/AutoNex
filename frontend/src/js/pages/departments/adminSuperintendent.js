// =========================================================================
// ADMIN & SAFETY SUPERINTENDENT CONSOLE (SR. DSO & DRM COMMAND TERMINAL)
// Module: adminSuperintendent.js
// Systems: Zero SPAD Investigation & Black Box Viewer, Crew Management (CMS)
//          Breath Analyzer Sobriety, Kavach AES-256 Key Rotation, 7-Tower RF Mesh,
//          Divisional RBAC Personnel Access Directory
// =========================================================================

(function () {
  let activeAdminSubTab = "admin_safety";
  let aesKeyVersion = "IR-KAV-2026-KEY-09";
  let aesKeyGeneratedAt = "20 Sept 2026 06:00 IST";
  let aesKeyExpiry = "42 Hours Remaining";
  let blackBoxAnimId = null;

  // 15+ Crew Breath Analyzer (CMS) Roster
  let crewRoster = [
    { id: "LP-9012", name: "Rajesh Kumar Sharma", role: "Loco Pilot (Mail/Exp)", train: "12951 Mumbai Rajdhani", shed: "HQ MMCT", testTime: "15:45 IST", bac: "0.000 mg/100ml", status: "FIT & CLEARED", statusClass: "bg-emerald-100 text-emerald-800 border-emerald-300", restHrs: "16 hrs (Adequate)", tenHourRule: "OK (0 hrs active)" },
    { id: "ALP-4410", name: "Amitabh Singh", role: "Asst. Loco Pilot", train: "12012 Vande Bharat", shed: "HQ NDLS", testTime: "15:10 IST", bac: "0.000 mg/100ml", status: "FIT & CLEARED", statusClass: "bg-emerald-100 text-emerald-800 border-emerald-300", restHrs: "18 hrs", tenHourRule: "OK" },
    { id: "GD-7811", name: "Dharmendra Verma", role: "Senior Passenger Guard", train: "12951 Mumbai Rajdhani", shed: "HQ NDLS", testTime: "15:50 IST", bac: "0.000 mg/100ml", status: "FIT & CLEARED", statusClass: "bg-emerald-100 text-emerald-800 border-emerald-300", restHrs: "22 hrs", tenHourRule: "OK" },
    { id: "LP-8834", name: "M. K. Deshmukh", role: "Loco Pilot (Mail/Exp)", train: "12302 Howrah Rajdhani", shed: "HQ HWH", testTime: "15:30 IST", bac: "0.000 mg/100ml", status: "FIT & CLEARED", statusClass: "bg-emerald-100 text-emerald-800 border-emerald-300", restHrs: "14 hrs", tenHourRule: "OK" },
    { id: "ALP-6102", name: "Sanjay Bhattacharya", role: "Asst. Loco Pilot", train: "12302 Howrah Rajdhani", shed: "HQ HWH", testTime: "15:32 IST", bac: "0.000 mg/100ml", status: "FIT & CLEARED", statusClass: "bg-emerald-100 text-emerald-800 border-emerald-300", restHrs: "16 hrs", tenHourRule: "OK" },
    { id: "LP-7741", name: "Govind Meena", role: "Loco Pilot (Goods)", train: "BOXN Coal Rake #58102", shed: "HQ TKD", testTime: "14:20 IST", bac: "0.000 mg/100ml", status: "FIT & CLEARED", statusClass: "bg-emerald-100 text-emerald-800 border-emerald-300", restHrs: "12 hrs", tenHourRule: "Running: 2.5 hrs" },
    { id: "LP-5201", name: "R. Ramanathan", role: "Loco Pilot (Superfast)", train: "12622 Tamil Nadu Express", shed: "HQ MAS", testTime: "16:00 IST", bac: "0.000 mg/100ml", status: "FIT & CLEARED", statusClass: "bg-emerald-100 text-emerald-800 border-emerald-300", restHrs: "20 hrs", tenHourRule: "OK" },
    { id: "ALP-3390", name: "K. Venkatesh", role: "Asst. Loco Pilot", train: "12622 Tamil Nadu Express", shed: "HQ MAS", testTime: "16:02 IST", bac: "0.000 mg/100ml", status: "FIT & CLEARED", statusClass: "bg-emerald-100 text-emerald-800 border-emerald-300", restHrs: "20 hrs", tenHourRule: "OK" },
    { id: "LP-9981", name: "Sunil Wankhede", role: "Loco Pilot (High Speed)", train: "22436 Vande Bharat", shed: "HQ BSB", testTime: "16:15 IST", bac: "0.000 mg/100ml", status: "FIT & CLEARED", statusClass: "bg-emerald-100 text-emerald-800 border-emerald-300", restHrs: "24 hrs", tenHourRule: "OK" },
    { id: "GD-8820", name: "Praveen Tiwari", role: "Mail Train Guard", train: "12059 Kota Jan Shatabdi", shed: "HQ AGC", testTime: "16:10 IST", bac: "0.000 mg/100ml", status: "FIT & CLEARED", statusClass: "bg-emerald-100 text-emerald-800 border-emerald-300", restHrs: "15 hrs", tenHourRule: "OK" }
  ];

  // 7 Kavach Optical Mesh Towers across Delhi Division
  const kavachTowers = [
    { id: "TWR-01", name: "NDLS Central Terminal Yard", height: "75m Lattice Mast", chainage: "Km 0/0", freq: "406.8 MHz / 160.225 MHz", signal: "-38 dBm", vswr: "1.12", fiber: "REDUNDANT RING ACTIVE", battery: "48.6V DC (100%)", pps: "±1.1 ns (NavIC Locked)", status: "ONLINE", statusClass: "bg-emerald-100 text-emerald-800" },
    { id: "TWR-02", name: "Hazrat Nizamuddin Station", height: "60m Mast", chainage: "Km 14/0", freq: "160.225 MHz UHF", signal: "-42 dBm", vswr: "1.15", fiber: "FIBER MESH OK", battery: "48.2V DC (98%)", pps: "±1.3 ns (NavIC Locked)", status: "ONLINE", statusClass: "bg-emerald-100 text-emerald-800" },
    { id: "TWR-03", name: "Faridabad Optical Repeater", height: "60m Mast", chainage: "Km 38/2", freq: "160.200 MHz UHF", signal: "-45 dBm", vswr: "1.18", fiber: "FIBER MESH OK", battery: "48.0V DC (96%)", pps: "±1.2 ns (NavIC Locked)", status: "ONLINE", statusClass: "bg-emerald-100 text-emerald-800" },
    { id: "TWR-04", name: "Ballabgarh Repeater Station", height: "60m Mast", chainage: "Km 48/5", freq: "160.225 MHz UHF", signal: "-47 dBm", vswr: "1.16", fiber: "FIBER MESH OK", battery: "47.9V DC (95%)", pps: "±1.4 ns (NavIC Locked)", status: "ONLINE", statusClass: "bg-emerald-100 text-emerald-800" },
    { id: "TWR-05", name: "Palwal Junction Hub", height: "75m Lattice Mast", chainage: "Km 70/0", freq: "160.225 MHz UHF", signal: "-41 dBm", vswr: "1.14", fiber: "REDUNDANT RING OK", battery: "48.5V DC (100%)", pps: "±1.0 ns (NavIC Locked)", status: "ONLINE", statusClass: "bg-emerald-100 text-emerald-800" },
    { id: "TWR-06", name: "Kosi Kalan Repeater Tower", height: "60m Mast", chainage: "Km 105/0", freq: "160.200 MHz UHF", signal: "-46 dBm", vswr: "1.19", fiber: "FIBER MESH OK", battery: "48.1V DC (97%)", pps: "±1.5 ns (NavIC Locked)", status: "ONLINE", statusClass: "bg-emerald-100 text-emerald-800" },
    { id: "TWR-07", name: "Mathura Junction Central Base", height: "75m Lattice Mast", chainage: "Km 140/0", freq: "160.225 MHz UHF", signal: "-39 dBm", vswr: "1.11", fiber: "REDUNDANT RING ACTIVE", battery: "48.8V DC (100%)", pps: "±0.9 ns (NavIC Locked)", status: "ONLINE", statusClass: "bg-emerald-100 text-emerald-800" }
  ];

  // Authorized Divisional Officers & RBAC Directory
  let personnelDirectory = [
    { id: "IR_SM_NDLS_01", name: "R. K. Sharma", role: "Station Master", dept: "Operating", level: "Level 3 (Station Command)", status: "ONLINE (PF 1 CABIN)", lastLogin: "Today 05:45 IST", ip: "10.12.4.101" },
    { id: "IR_ENG_PWAY_04", name: "V. K. Yadav", role: "Senior Section Engineer (P-Way)", dept: "Civil Engineering", level: "Level 4 (P-Way/S&T Override)", status: "ONLINE (FIELD)", lastLogin: "Today 06:12 IST", ip: "10.12.8.52" },
    { id: "IR_CTRL_CHIEF_01", name: "V. P. Singh", role: "Chief Section Controller", dept: "Control Office (COA)", level: "Level 4 (Section Dispatch)", status: "ONLINE (DIV HQ)", lastLogin: "Today 05:30 IST", ip: "10.12.1.15" },
    { id: "IR_DRM_SAFETY_01", name: "Dr. Alok Srivastava", role: "Senior Divisional Safety Officer", dept: "Safety Directorate", level: "Level 5 (DRM Full Audit)", status: "ONLINE (TERMINAL)", lastLogin: "Today 08:00 IST", ip: "10.12.1.2" },
    { id: "IR_SSE_SIGNAL_02", name: "P. K. Mukherjee", role: "SSE Signal & Telecom", dept: "S&T Engineering", level: "Level 4 (EI / Kavach Master)", status: "ONLINE (S&T LAB)", lastLogin: "Today 07:15 IST", ip: "10.12.14.88" },
    { id: "IR_SSE_OHE_03", name: "Harish Chandra", role: "SSE Traction / OHE", dept: "Electrical Traction", level: "Level 4 (Power Block Authority)", status: "ONLINE (TSS NZM)", lastLogin: "Today 06:50 IST", ip: "10.12.22.14" }
  ];

  // Black Box / Event Recorder Canvas Engine
  function initBlackBoxCanvas() {
    const canvas = document.getElementById("blackBoxCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (blackBoxAnimId) cancelAnimationFrame(blackBoxAnimId);

    function drawBlackBox() {
      if (!document.getElementById("blackBoxCanvas")) return;
      const w = canvas.width = canvas.parentElement.clientWidth;
      const h = canvas.height = canvas.parentElement.clientHeight;

      // Dark Event Recorder Background
      ctx.fillStyle = "#0a0f1d";
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Graph 1: Train Speed (Green curve dropping on Kavach Auto-Brake)
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        let speedY = h * 0.35; // 130 km/h
        if (x > w * 0.55 && x < w * 0.85) {
          // Braking curve
          const progress = (x - w * 0.55) / (w * 0.3);
          speedY = (h * 0.35) + progress * (h * 0.4); // drops to 30 km/h
        } else if (x >= w * 0.85) {
          speedY = h * 0.75; // 30 km/h
        }
        if (x === 0) ctx.moveTo(x, speedY);
        else ctx.lineTo(x, speedY);
      }
      ctx.stroke();

      // Graph 2: Brake Cylinder Pressure (Red stepped pulse)
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        let bpY = h * 0.85; // 0 kg/cm2
        if (x >= w * 0.55 && x <= w * 0.85) {
          bpY = h * 0.55; // 2.5 kg/cm2 application
        }
        if (x === 0) ctx.moveTo(x, bpY);
        else ctx.lineTo(x, bpY);
      }
      ctx.stroke();

      // Labels
      ctx.font = "bold 10px JetBrains Mono, monospace";
      ctx.fillStyle = "#10b981";
      ctx.fillText("TRAIN SPEED: 130 km/h ➔ 30 km/h (KAVACH BRAKE PROFILE)", 20, 25);
      ctx.fillStyle = "#ef4444";
      ctx.fillText("BRAKE CYLINDER PRESSURE: 2.5 kg/cm² APPLIED", 20, 42);
      ctx.fillStyle = "#f59e0b";
      ctx.fillText("KAVACH TARGET DISTANCE MARKER: 1,450m", w * 0.55, 60);

      // Vertical Marker for Intervention Point
      ctx.strokeStyle = "#f59e0b";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(w * 0.55, 0);
      ctx.lineTo(w * 0.55, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    drawBlackBox();
  }

  // Switch Sub-Tabs
  window.switchAdminSubTab = function (tabKey) {
    activeAdminSubTab = tabKey;
    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderAdminSuperintendentWorkspace) {
      window.renderAdminSuperintendentWorkspace(container);
    }
  };

  // Main Render
  window.renderAdminSuperintendentWorkspace = function (container) {
    if (!container) return;

    let contentHtml = "";

    if (activeAdminSubTab === "admin_safety") {
      contentHtml = `
        <!-- SUB-TAB 1: SAFETY AUDIT, ZERO SPAD & BLACK BOX VIEWER -->
        <div class="space-y-4">
          <!-- 4 Safety Metric KPI Cards -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div class="glass-card p-4 border-l-4 border-emerald-500 flex items-center justify-between">
              <div>
                <p class="text-[11px] text-slate-500 font-bold uppercase">Division SPAD Count</p>
                <p class="text-2xl font-black text-emerald-700 font-mono">ZERO (0)</p>
                <span class="text-[10px] text-slate-400">365 Days Incident Free</span>
              </div>
              <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
                <i class="fa-solid fa-shield-check"></i>
              </div>
            </div>

            <div class="glass-card p-4 border-l-4 border-blue-500 flex items-center justify-between">
              <div>
                <p class="text-[11px] text-slate-500 font-bold uppercase">Kavach Interventions</p>
                <p class="text-2xl font-black text-blue-700 font-mono">3 Today</p>
                <span class="text-[10px] text-slate-400">Automatic Speed Regulation</span>
              </div>
              <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
                <i class="fa-solid fa-microchip"></i>
              </div>
            </div>

            <div class="glass-card p-4 border-l-4 border-purple-500 flex items-center justify-between">
              <div>
                <p class="text-[11px] text-slate-500 font-bold uppercase">VCD Compliance</p>
                <p class="text-2xl font-black text-purple-700 font-mono">99.9%</p>
                <span class="text-[10px] text-slate-400">Vigilance Control Device</span>
              </div>
              <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg">
                <i class="fa-solid fa-hand-holding-heart"></i>
              </div>
            </div>

            <div class="glass-card p-4 border-l-4 border-amber-500 flex items-center justify-between">
              <div>
                <p class="text-[11px] text-slate-500 font-bold uppercase">CRS Safety Rating</p>
                <p class="text-2xl font-black text-amber-700 font-mono">GRADE A+</p>
                <span class="text-[10px] text-slate-400">Northern Railway Audit</span>
              </div>
              <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
                <i class="fa-solid fa-award"></i>
              </div>
            </div>
          </div>

          <!-- Black Box / Event Recorder Graph -->
          <div class="glass-card p-5 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                  <i class="fa-solid fa-box text-purple-600"></i> Locomotive Black Box Event Recorder (SPAD Prevention Telemetry)
                </h3>
                <p class="text-xs text-slate-500">Loco WAP-7 #30211: Kavach SIL-4 automated deceleration curve preventing signal overrun at Caution Aspect</p>
              </div>

              <div class="flex items-center gap-2 text-xs font-mono">
                <span class="px-3 py-1 rounded-lg bg-[#12355B] text-white font-bold">EVENT ID: KAV-AUD-041</span>
                <button onclick="if(window.showToast) window.showToast('Downloaded Full Event Recorder Log (CSV/PDF) for Safety Commission', 'info')" class="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#12355B] font-bold border border-slate-300">
                  <i class="fa-solid fa-download mr-1"></i> Export Telemetry
                </button>
              </div>
            </div>

            <div class="h-64 w-full rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl relative">
              <canvas id="blackBoxCanvas" class="w-full h-full block"></canvas>
            </div>

            <div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
              <span><i class="fa-solid fa-circle-check text-emerald-600 mr-1.5"></i> <strong>SIL-4 Verification:</strong> Target distance curve computed correctly by On-Board Computer. Zero driver overshoot observed.</span>
              <span class="font-mono text-[10px] text-slate-500">Audited by: Sr. DSO / DLI</span>
            </div>
          </div>
        </div>
      `;
    } else if (activeAdminSubTab === "admin_sobriety") {
      contentHtml = `
        <!-- SUB-TAB 2: CREW MANAGEMENT SYSTEM (CMS) BREATH ANALYZER SOBRIETY LOG -->
        <div class="glass-card p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                <i class="fa-solid fa-heart-pulse text-purple-600"></i> Crew Management System (CMS) Pre-Run Breath Analyzer (BA) Sobriety Log
              </h3>
              <p class="text-xs text-slate-500">Statutory pre-departure alcohol breathalyzer testing with biometric verification & 10-Hour duty monitoring</p>
            </div>

            <div class="flex items-center gap-2 text-xs">
              <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">100% SOBRIETY COMPLIANCE</span>
              <button onclick="window.simulateCrewBaTest()" class="px-3.5 py-1.5 rounded-lg bg-[#12355B] hover:bg-[#1D4877] text-white font-bold shadow flex items-center gap-1.5">
                <i class="fa-solid fa-id-card-clip"></i> Test Crew Member
              </button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs font-mono">
              <thead class="text-[10px] font-black text-slate-600 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="py-3 px-3">Crew ID</th>
                  <th class="py-3 px-3 font-sans">Loco Pilot / Guard Name</th>
                  <th class="py-3 px-3 font-sans">Role</th>
                  <th class="py-3 px-3 font-sans">Assigned Train</th>
                  <th class="py-3 px-3 font-sans">Loco Shed</th>
                  <th class="py-3 px-3">Test Time</th>
                  <th class="py-3 px-3">BA Reading</th>
                  <th class="py-3 px-3">Rest Hours</th>
                  <th class="py-3 px-3">10-Hr Rule</th>
                  <th class="py-3 px-3 font-sans">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-semibold text-slate-800">
                ${crewRoster.map(crew => `
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 px-3 font-bold text-[#12355B]">${crew.id}</td>
                    <td class="py-3 px-3 font-sans font-bold text-slate-900">${crew.name}</td>
                    <td class="py-3 px-3 font-sans text-slate-600">${crew.role}</td>
                    <td class="py-3 px-3 font-sans text-[#12355B] font-bold">${crew.train}</td>
                    <td class="py-3 px-3 font-sans text-slate-500">${crew.shed}</td>
                    <td class="py-3 px-3 text-slate-600">${crew.testTime}</td>
                    <td class="py-3 px-3 font-bold text-emerald-700">${crew.bac}</td>
                    <td class="py-3 px-3 text-slate-600">${crew.restHrs}</td>
                    <td class="py-3 px-3 text-emerald-700 font-bold">${crew.tenHourRule}</td>
                    <td class="py-3 px-3 font-sans">
                      <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${crew.statusClass}">${crew.status}</span>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (activeAdminSubTab === "admin_keys") {
      contentHtml = `
        <!-- SUB-TAB 3: KAVACH SIL-4 CRYPTOGRAPHIC KEY MANAGEMENT (KMC) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <!-- Key Lifecycle Controller (6 cols) -->
          <div class="lg:col-span-6 glass-card p-5 space-y-4">
            <div class="border-b border-slate-200 pb-2.5">
              <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                <i class="fa-solid fa-key text-purple-600"></i> Kavach SIL-4 Cryptographic Key Management (KMC)
              </h3>
              <p class="text-xs text-slate-500">AES-256 GCM authenticated session key distribution between Station SRUs and Loco OBCs</p>
            </div>

            <div class="space-y-3 text-xs font-mono">
              <div class="p-3.5 rounded-xl bg-purple-50 border border-purple-200 space-y-1">
                <span class="text-[10px] text-purple-800 font-sans font-bold uppercase">Active Master Session Key ID:</span>
                <p class="text-base font-bold text-purple-950">${aesKeyVersion}</p>
                <p class="text-[11px] text-slate-600 font-sans">Algorithm: AES-256-GCM (Hardware Security Module HSM Certified)</p>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span class="text-[10px] text-slate-500 font-sans block">Generated At</span>
                  <strong class="text-slate-800 text-xs">${aesKeyGeneratedAt}</strong>
                </div>
                <div class="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span class="text-[10px] text-slate-500 font-sans block">Rotation Schedule</span>
                  <strong class="text-emerald-700 text-xs">${aesKeyExpiry}</strong>
                </div>
              </div>

              <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-sans space-y-1">
                <p class="font-bold text-[#12355B]">Key Distribution Status:</p>
                <p class="text-xs">Distributed to 48 Active Locos & 16 Station Radio Units (SRU) over secure optical fiber backbone.</p>
              </div>

              <button onclick="window.rotateAesKeysNow()" class="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2">
                <i class="fa-solid fa-arrows-rotate"></i> Rotate Division AES-256 Keys Now
              </button>
            </div>
          </div>

          <!-- RF Noise & Jamming Detection (6 cols) -->
          <div class="lg:col-span-6 glass-card p-5 space-y-4">
            <div class="border-b border-slate-200 pb-2.5">
              <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                <i class="fa-solid fa-wave-square text-emerald-600"></i> 160MHz UHF RF Jamming & Noise Sensor Telemetry
              </h3>
              <p class="text-xs text-slate-500">Continuous radio frequency spectrum monitoring against jamming or unauthorized transmitters</p>
            </div>

            <div class="space-y-3 text-xs font-mono">
              <div class="grid grid-cols-2 gap-3">
                <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span class="text-[10px] text-emerald-800 font-sans block font-bold">Signal-to-Noise Ratio (SNR)</span>
                  <strong class="text-2xl text-emerald-900">+34 dB</strong>
                  <span class="text-[9px] text-slate-500 block mt-0.5">Threshold: &gt; +18 dB (Clear)</span>
                </div>
                <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <span class="text-[10px] text-emerald-800 font-sans block font-bold">Packet Error Rate (PER)</span>
                  <strong class="text-2xl text-emerald-900">0.001%</strong>
                  <span class="text-[9px] text-slate-500 block mt-0.5">SIL-4 Standard: &lt; 0.1%</span>
                </div>
              </div>

              <div class="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-emerald-400 font-bold flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span> RF Spectrum 160.200 - 160.250 MHz
                  </span>
                  <span class="text-slate-400">TDMA Synchronized</span>
                </div>
                <p class="text-[11px] text-slate-300 font-sans">Zero rogue interference detected across Delhi Division track blocks in the last 24 hours.</p>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (activeAdminSubTab === "admin_towers") {
      contentHtml = `
        <!-- SUB-TAB 4: DIVISIONAL RF REPEATER TOWER NETWORK (7 TOWERS) -->
        <div class="glass-card p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                <i class="fa-solid fa-tower-broadcast text-blue-600"></i> Division Kavach RF Repeater Tower Network (Delhi - Mathura Trunk)
              </h3>
              <p class="text-xs text-slate-500">7 Optical mesh towers delivering seamless line-of-sight UHF Kavach coverage across 140 Km</p>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-mono font-bold">ALL 7 TOWERS 100% ONLINE</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
            ${kavachTowers.map(twr => `
              <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white transition-all space-y-2.5">
                <div class="flex items-center justify-between">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-[#12355B] text-white">${twr.id}</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${twr.statusClass}">${twr.status}</span>
                </div>

                <div>
                  <h4 class="font-bold text-[#12355B] font-sans text-xs">${twr.name}</h4>
                  <p class="text-[10px] text-slate-500">${twr.height} • ${twr.chainage}</p>
                </div>

                <div class="space-y-1 text-[11px] pt-2 border-t border-slate-200 text-slate-700">
                  <p>Signal Strength: <strong class="text-emerald-700">${twr.signal}</strong></p>
                  <p>Antenna VSWR: <strong class="text-[#12355B]">${twr.vswr}</strong> (Optimal &lt; 1.3)</p>
                  <p>Time Sync (NavIC): <strong class="text-purple-700">${twr.pps}</strong></p>
                  <p>Battery Backup: <strong class="text-[#12355B]">${twr.battery}</strong></p>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    } else if (activeAdminSubTab === "admin_roster") {
      contentHtml = `
        <!-- SUB-TAB 5: DIVISIONAL PERSONNEL ROSTER & RBAC ACCESS DIRECTORY -->
        <div class="glass-card p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 class="text-base font-black text-[#12355B] font-['Outfit'] flex items-center gap-2">
                <i class="fa-solid fa-users-gear text-purple-600"></i> Divisional Personnel Directory & RBAC Security Permissions
              </h3>
              <p class="text-xs text-slate-500">Multi-tier role based access control for Station Masters, Section Controllers, SSEs & Safety Auditors</p>
            </div>
            <button onclick="if(window.showToast) window.showToast('Synchronized Security Access Tokens across All Division Terminals', 'success')" class="px-3.5 py-1.5 rounded-lg bg-[#12355B] hover:bg-[#1D4877] text-white font-bold text-xs shadow transition-all">
              <i class="fa-solid fa-shield mr-1"></i> Sync Access Tokens
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-[10px] font-black text-slate-600 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="py-3 px-3">Officer Name</th>
                  <th class="py-3 px-3 font-mono">Officer ID</th>
                  <th class="py-3 px-3">Official Role</th>
                  <th class="py-3 px-3">Department</th>
                  <th class="py-3 px-3 font-mono">Access Level</th>
                  <th class="py-3 px-3 font-mono">Last Login</th>
                  <th class="py-3 px-3">Status</th>
                  <th class="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-semibold text-slate-800">
                ${personnelDirectory.map((officer, idx) => `
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-3 px-3 font-bold text-[#12355B]">${officer.name}</td>
                    <td class="py-3 px-3 font-mono text-slate-600">${officer.id}</td>
                    <td class="py-3 px-3 text-slate-800">${officer.role}</td>
                    <td class="py-3 px-3 text-slate-600">${officer.dept}</td>
                    <td class="py-3 px-3 font-mono text-purple-800 font-bold">${officer.level}</td>
                    <td class="py-3 px-3 font-mono text-slate-500 text-[11px]">${officer.lastLogin}</td>
                    <td class="py-3 px-3">
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">${officer.status}</span>
                    </td>
                    <td class="py-3 px-3 text-right">
                      <button onclick="if(window.showToast) window.showToast('Audited Session Permissions for ${officer.name}', 'info')" class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[#12355B] font-bold text-[11px] border border-slate-300">
                        Audit Perms
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

    // Outer Shell
    container.innerHTML = `
      <div class="space-y-5">
        <!-- Top Action Header Banner -->
        <div class="glass-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-8 border-purple-600 shadow-md">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-xs font-black uppercase tracking-wider font-mono">ADMIN & SUPERINTENDENT CONSOLE</span>
              <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">SR. DSO & DRM COMMAND</span>
            </div>
            <h2 class="text-2xl font-black text-[#12355B] font-['Outfit'] mt-1 flex items-center gap-2">
              🛡️ Divisional Safety Directorate, Cryptographic Key & Access Hub
            </h2>
            <p class="text-xs text-slate-600 font-medium">Zero SPAD investigation, CMS crew breath analyzer logs, Kavach AES-256 cryptographic keys, 7-tower RF mesh & personnel RBAC</p>
          </div>

          <div class="flex items-center gap-2 text-xs shrink-0">
            <button onclick="window.rotateAesKeysNow()" class="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black flex items-center gap-1.5 shadow-md transition-all cursor-pointer">
              <i class="fa-solid fa-key"></i> Rotate AES-256 Keys
            </button>
          </div>
        </div>

        <!-- Sub-Tabs Navigation Bar -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button type="button" onclick="switchAdminSubTab('admin_safety')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeAdminSubTab === 'admin_safety' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-shield-virus text-[#FF9933] mr-1.5"></i> Safety Directorate & Zero SPAD
          </button>
          <button type="button" onclick="switchAdminSubTab('admin_sobriety')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeAdminSubTab === 'admin_sobriety' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-heart-pulse text-[#FF9933] mr-1.5"></i> CMS Crew Breath Analyzer (BA)
          </button>
          <button type="button" onclick="switchAdminSubTab('admin_keys')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeAdminSubTab === 'admin_keys' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-key text-[#FF9933] mr-1.5"></i> Kavach SIL-4 Cryptographic Keys
          </button>
          <button type="button" onclick="switchAdminSubTab('admin_towers')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeAdminSubTab === 'admin_towers' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-tower-broadcast text-[#FF9933] mr-1.5"></i> 7-Tower RF Mesh Telemetry
          </button>
          <button type="button" onclick="switchAdminSubTab('admin_roster')" class="px-4 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${activeAdminSubTab === 'admin_roster' ? 'bg-[#12355B] text-white font-black shadow-md border-[#12355B]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-bold'}">
            <i class="fa-solid fa-users-gear text-[#FF9933] mr-1.5"></i> Personnel Directory & RBAC
          </button>
        </div>

        <div>
          ${contentHtml}
        </div>
      </div>
    `;

    if (activeAdminSubTab === "admin_safety") {
      setTimeout(initBlackBoxCanvas, 60);
    }
  };

  // Simulate Crew BA Test
  window.simulateCrewBaTest = function () {
    const randomCrew = crewRoster[Math.floor(Math.random() * crewRoster.length)];
    const timeNow = new Date().toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true });

    if (window.showToast) {
      window.showToast(`🧪 Breath Analyzer Test: ${randomCrew.name} (${randomCrew.id}) Result: 0.000 mg/100ml. Verified FIT for duty at ${timeNow}!`, "success");
    }
  };

  // Rotate AES Keys
  window.rotateAesKeysNow = function () {
    const newVer = `IR-KAV-2026-KEY-${Math.floor(10 + Math.random() * 90)}`;
    const timeNow = new Date().toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    aesKeyVersion = newVer;
    aesKeyGeneratedAt = `Today at ${timeNow}`;
    aesKeyExpiry = "48 Hours Remaining";

    if (window.showToast) {
      window.showToast(`🔑 Division AES-256 GCM Cryptographic Keys Rotated! New Key: ${newVer}`, "success");
    }

    const container = document.getElementById("activeSubTabContainer");
    if (container && window.renderAdminSuperintendentWorkspace) {
      window.renderAdminSuperintendentWorkspace(container);
    }
  };
})();
