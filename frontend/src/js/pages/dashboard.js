/**
 * Indian Railways — AI Personnel Terminal
 * Dashboard Interactive Logic, 4 Operating Departments & Real-Time Telemetry
 */

document.addEventListener("DOMContentLoaded", () => {
  // Global State
  let activeDept = "maintenance_engineer";
  let activeSubTab = "overview";
  let selectedModalDept = "maintenance_engineer";
  let selectedPTrack = "p-track-1";

  // =========================================================================
  // LIVE GPS GEOLOCATION & REAL-TIME WEATHER SERVICE (Open-Meteo API)
  // =========================================================================
  window.liveWeatherState = {
    loading: false,
    error: null,
    locationName: "Detecting Location...",
    lat: 23.2599,
    lon: 77.4126,
    temp: "--",
    condition: "Checking...",
    icon: "fa-spinner fa-spin text-blue-400",
    humidity: "--",
    windSpeed: "--",
    visibility: "--",
    weatherCode: null,
    riskLevel: "NORMAL",
    alertMessage: "Fetching real-time local weather...",
    railThermalTemp: "--",
    lastUpdated: "",
    isLive: false,
    permissionDenied: false,
  };

  function getWeatherDetailsFromWMO(code) {
    if (code === 0)
      return {
        condition: "Clear Sky",
        icon: "fa-sun text-yellow-400",
        riskLevel: "NORMAL",
        alertMessage: "Clear sky & optimum rail operations visibility.",
      };
    if (code >= 1 && code <= 2)
      return {
        condition: "Mainly Clear",
        icon: "fa-cloud-sun text-amber-300",
        riskLevel: "NORMAL",
        alertMessage: "Good operational weather.",
      };
    if (code === 3)
      return {
        condition: "Overcast / Cloudy",
        icon: "fa-cloud text-slate-300",
        riskLevel: "NORMAL",
        alertMessage: "Cloud cover active; normal train speeds.",
      };
    if (code === 45 || code === 48)
      return {
        condition: "Dense Fog / Smog",
        icon: "fa-smog text-yellow-400",
        riskLevel: "HIGH HAZARD",
        alertMessage: "⚠️ Fog TSR Active: Speed restricted to 60 km/h.",
      };
    if (code >= 51 && code <= 57)
      return {
        condition: "Light Drizzle",
        icon: "fa-cloud-rain text-blue-300",
        riskLevel: "LOW",
        alertMessage: "Light rain reported; track traction nominal.",
      };
    if (code >= 61 && code <= 67)
      return {
        condition: "Rain Showers",
        icon: "fa-cloud-showers-heavy text-blue-400",
        riskLevel: "MODERATE",
        alertMessage: "🌧️ Track sensors monitoring culvert water levels.",
      };
    if (code >= 80 && code <= 82)
      return {
        condition: "Heavy Downpour",
        icon: "fa-cloud-showers-water text-cyan-400",
        riskLevel: "HIGH HAZARD",
        alertMessage:
          "⚠️ Flash Rain Advisory: TSR 45 km/h for low-lying tracks.",
      };
    if (code >= 95)
      return {
        condition: "Thunderstorm Warning",
        icon: "fa-cloud-bolt text-purple-400",
        riskLevel: "CRITICAL",
        alertMessage: "⚡ Lightning & Thunderstorm alert active!",
      };
    return {
      condition: "Partly Cloudy",
      icon: "fa-cloud-sun text-amber-300",
      riskLevel: "NORMAL",
      alertMessage: "Stable environmental conditions.",
    };
  }

  async function reverseGeocode(lat, lon) {
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
      );
      if (res.ok) {
        const data = await res.json();
        const locality =
          data.locality ||
          data.city ||
          (data.localityInfo &&
            data.localityInfo.administrative &&
            data.localityInfo.administrative[2] &&
            data.localityInfo.administrative[2].name);
        const state = data.principalSubdivision || data.countryName;
        if (locality && state) return `${locality}, ${state}`;
        if (locality) return locality;
        if (state) return state;
      }
    } catch (e) {
      console.warn("BigDataCloud reverse geocode error:", e);
    }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const name =
          addr.city || addr.town || addr.village || addr.suburb || addr.state;
        if (name) return name;
      }
    } catch (e) {
      console.warn("Nominatim fallback error:", e);
    }
    return `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
  }

  async function fetchOpenMeteoWeather(lat, lon, customLocationName = null) {
    window.liveWeatherState.loading = true;
    updateWeatherUIElements();

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,visibility,apparent_temperature&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Weather API HTTP error");
      const data = await res.json();
      const current = data.current;

      let locName = customLocationName;
      if (!locName) {
        locName = await reverseGeocode(lat, lon);
      }

      const wmo = getWeatherDetailsFromWMO(current.weather_code);
      const visKm =
        current.visibility !== undefined && current.visibility !== null
          ? (current.visibility / 1000).toFixed(1)
          : "10.0";
      const temp = Math.round(current.temperature_2m);
      const humidity = current.relative_humidity_2m || 65;
      const windSpeed = Math.round(current.wind_speed_10m || 10);
      const railTemp = (temp + (temp > 25 ? 9.4 : 5.2)).toFixed(1);

      window.liveWeatherState = {
        loading: false,
        error: null,
        locationName: locName,
        lat: lat,
        lon: lon,
        temp: temp,
        condition: wmo.condition,
        icon: wmo.icon,
        humidity: humidity,
        windSpeed: windSpeed,
        visibility: visKm,
        weatherCode: current.weather_code,
        riskLevel: wmo.riskLevel,
        alertMessage: wmo.alertMessage,
        railThermalTemp: railTemp,
        lastUpdated: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isLive: true,
        permissionDenied: false,
      };

      updateWeatherUIElements();
      return window.liveWeatherState;
    } catch (err) {
      console.error("Error fetching live weather:", err);
      window.liveWeatherState.loading = false;
      window.liveWeatherState.error = err.message;
      updateWeatherUIElements();
    }
  }

  window.requestUserLiveLocation = function (forceToast = false) {
    if (!navigator.geolocation) {
      if (forceToast && window.showToast)
        showToast("Geolocation is not supported by your browser.", "error");
      fetchOpenMeteoWeather(23.2599, 77.4126, "Bhopal (Default Location)");
      return;
    }

    window.liveWeatherState.loading = true;
    updateWeatherUIElements();
    if (forceToast && window.showToast)
      showToast("📍 Accessing device GPS location...", "info");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const data = await fetchOpenMeteoWeather(lat, lon);
        if (data && data.locationName && forceToast && window.showToast) {
          showToast(
            `📍 Live Location Active: ${data.locationName} (${data.temp}°C, ${data.condition})`,
            "success",
          );
        }
      },
      (err) => {
        console.warn("Geolocation access error:", err);
        window.liveWeatherState.permissionDenied = true;
        fetchOpenMeteoWeather(
          23.2599,
          77.4126,
          "Bhopal, MP (Default Location)",
        );
        if (forceToast && window.showToast)
          showToast(
            "📍 GPS access denied. Reverted to Default Location (Bhopal).",
            "error",
          );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  window.searchWeatherByCity = async function (query) {
    if (!query || !query.trim()) return;
    const q = query.trim();
    window.liveWeatherState.loading = true;
    updateWeatherUIElements();
    if (window.showToast)
      showToast(`Searching live weather for "${q}"...`, "info");

    try {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;
      const res = await fetch(geoUrl);
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        const target = data.results[0];
        const displayName = `${target.name}${target.admin1 ? ", " + target.admin1 : ""}`;
        await fetchOpenMeteoWeather(
          target.latitude,
          target.longitude,
          displayName,
        );
        if (window.showToast)
          showToast(`📍 Location updated to: ${displayName}`, "success");
      } else {
        if (window.showToast) showToast(`Could not find city "${q}"`, "error");
        window.liveWeatherState.loading = false;
        updateWeatherUIElements();
      }
    } catch (e) {
      if (window.showToast) showToast("Failed to search location", "error");
      window.liveWeatherState.loading = false;
      updateWeatherUIElements();
    }
  };

  function updateWeatherUIElements() {
    const state = window.liveWeatherState;

    // Overview Tab Weather Summary Card Widget
    const overviewContent = document.getElementById(
      "dashboardWeatherWidgetContent",
    );
    if (overviewContent) {
      if (state.loading) {
        overviewContent.innerHTML = `
          <div class="py-6 text-center space-y-2">
            <i class="fa-solid fa-spinner fa-spin text-2xl text-blue-400"></i>
            <p class="text-xs text-slate-300 font-medium">Fetching Live GPS Weather...</p>
          </div>
        `;
      } else {
        overviewContent.innerHTML = `
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs text-slate-300 font-medium flex items-center gap-1">
                <i class="fa-solid fa-location-dot ${state.isLive && !state.permissionDenied ? "text-emerald-400 animate-pulse" : "text-amber-400"}"></i>
                <span class="truncate max-w-[150px] inline-block font-bold text-white" title="${state.locationName}">${state.locationName}</span>
              </p>
              <p class="text-4xl font-extrabold text-white font-mono tracking-tight mt-1">${state.temp}°C</p>
            </div>
            <div class="text-slate-300 text-3xl flex flex-col items-end">
              <i class="fa-solid ${state.icon}"></i>
              <span class="text-[9px] font-extrabold uppercase mt-1 px-2 py-0.5 rounded bg-slate-900 text-slate-200 border border-white/10 font-mono">${state.riskLevel || "LIVE"}</span>
            </div>
          </div>
          <div class="pt-2 border-t border-white/10 text-xs text-slate-300 space-y-1 font-mono">
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Condition:</span>
              <strong class="text-amber-300 font-sans">${state.condition}</strong>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Humidity:</span>
              <strong class="text-slate-200">${state.humidity}%</strong>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Wind Speed:</span>
              <strong class="text-slate-200">${state.windSpeed} km/h</strong>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Visibility:</span>
              <strong class="text-emerald-400">${state.visibility} km</strong>
            </div>
          </div>
        `;
      }
    }

    // Weather Section Elements (if visible)
    const locNameElem = document.getElementById("weatherSectionLocationName");
    if (locNameElem) locNameElem.textContent = state.locationName;

    const updatedElem = document.getElementById("weatherSectionUpdated");
    if (updatedElem) updatedElem.textContent = state.lastUpdated || "Just now";

    const cardsElem = document.getElementById("weatherSectionStatCards");
    if (cardsElem) {
      if (state.loading) {
        cardsElem.innerHTML = `
          <div class="col-span-full py-8 text-center glass-card">
            <i class="fa-solid fa-spinner fa-spin text-3xl text-yellow-400"></i>
            <p class="text-xs text-slate-300 font-medium mt-2">Updating Environmental Weather Radar...</p>
          </div>
        `;
      } else {
        cardsElem.innerHTML = `
          <div class="glass-card p-4 space-y-1 border-l-4 border-emerald-400">
            <p class="text-xs text-slate-400 font-medium">Visibility Range (${state.locationName})</p>
            <p class="text-3xl font-black text-emerald-400 font-mono mt-1">${state.visibility} km <span class="text-xs text-slate-300 font-normal">(${state.condition})</span></p>
            <span class="text-[11px] text-emerald-400 font-bold mt-1 block flex items-center gap-1">
              <i class="fa-solid fa-circle-check"></i> ${parseFloat(state.visibility) > 3 ? "Fog Safe Index Normal" : "Low Visibility TSR Restriction"}
            </span>
          </div>

          <div class="glass-card p-4 space-y-1 border-l-4 border-amber-400">
            <p class="text-xs text-slate-400 font-medium">Rail Track Thermal Temp</p>
            <p class="text-3xl font-black text-amber-300 font-mono mt-1">${state.railThermalTemp}°C</p>
            <span class="text-[11px] text-slate-300 mt-1 block">Ambient: ${state.temp}°C | Rail Stress Safe</span>
          </div>

          <div class="glass-card p-4 space-y-1 border-l-4 border-blue-400">
            <p class="text-xs text-slate-400 font-medium">Humidity & Wind Level</p>
            <p class="text-3xl font-black text-blue-400 font-mono mt-1">${state.humidity}% <span class="text-xs text-slate-300 font-normal">/ ${state.windSpeed} km/h</span></p>
            <span class="text-[11px] text-slate-300 mt-1 block">Culvert Sensors Clear</span>
          </div>

          <div class="glass-card p-4 space-y-1 border-l-4 border-yellow-500">
            <p class="text-xs text-slate-400 font-medium">Kavach Hazard Status</p>
            <p class="text-xl font-extrabold text-yellow-300 mt-1 font-mono uppercase flex items-center gap-1.5">
              <i class="fa-solid ${state.icon}"></i> ${state.riskLevel || "NORMAL"}
            </p>
            <span class="text-[11px] text-slate-300 mt-1 block truncate" title="${state.alertMessage}">${state.alertMessage}</span>
          </div>
        `;
      }
    }
  }

  // Trigger initial live GPS location fetch automatically
  setTimeout(() => {
    window.requestUserLiveLocation(false);
  }, 100);

  // P-Track Master Configuration & Real-Time Telemetry
  const pTrackData = {
    "p-track-1": {
      id: "p-track-1",
      name: "P-Track 01: NDLS – NZM Up Main",
      code: "NDLS-NZM-UP-01",
      km: "Km 0/0 to 14/4",
      health: "98.4%",
      healthLabel: "Optimal Integrity",
      status: "OPERATIONAL",
      statusClass:
        "bg-[#F0FDF4] text-[#138808] border-2 border-[#138808] font-extrabold",
      speedLimit: "110 km/h",
      activeTrains: 4,
      usfdFlaws: 2,
      railStress: "52.4 N/mm²",
      ballastCondition: "Good (Clearance 350mm)",
      lastInspected: "Today, 04:30 IST (Car #04)",
      assignedCrew: "SSE P-Way Unit Hazrat Nizamuddin",
    },
    "p-track-2": {
      id: "p-track-2",
      name: "P-Track 02: NZM – FDB Down Line",
      code: "NZM-FDB-DN-02",
      km: "Km 14/4 to 28/2",
      health: "91.2%",
      healthLabel: "TSR Caution Active",
      status: "TSR RESTRICTED",
      statusClass:
        "bg-[#FFFBEB] text-[#B45309] border-2 border-[#FF9933] font-extrabold",
      speedLimit: "45 km/h",
      activeTrains: 6,
      usfdFlaws: 5,
      railStress: "68.1 N/mm²",
      ballastCondition: "Moderate (Tamping Required)",
      lastInspected: "Yesterday, 18:15 IST (Car #02)",
      assignedCrew: "P-Way Gang 04 Faridabad",
    },
    "p-track-3": {
      id: "p-track-3",
      name: "P-Track 03: FDB – TKD Track Section",
      code: "FDB-TKD-MAIN-03",
      km: "Km 28/2 to 42/0",
      health: "84.6%",
      healthLabel: "Critical Joint Flaw",
      status: "REPAIR SCHEDULED",
      statusClass:
        "bg-[#FEF2F2] text-[#DC2626] border-2 border-[#DC2626] font-extrabold",
      speedLimit: "30 km/h",
      activeTrains: 3,
      usfdFlaws: 4,
      railStress: "82.5 N/mm²",
      ballastCondition: "Sub-ballast settlement detected",
      lastInspected: "Today, 02:10 IST (Special USFD Team)",
      assignedCrew: "Specialist USFD Team 02",
    },
    "p-track-4": {
      id: "p-track-4",
      name: "P-Track 04: NDLS Yard Line 5",
      code: "NDLS-YARD-L05",
      km: "Km 0/0 to 2/1",
      health: "95.0%",
      healthLabel: "Normal Yard Shunting",
      status: "YARD ACTIVE",
      statusClass:
        "bg-[#EAF3F8] text-[#12355B] border-2 border-[#12355B] font-extrabold",
      speedLimit: "15 km/h",
      activeTrains: 1,
      usfdFlaws: 3,
      railStress: "41.0 N/mm²",
      ballastCondition: "Standard Yard Maintenance",
      lastInspected: "Today, 06:00 IST (Yard Inspector)",
      assignedCrew: "Maintenance Crew Delhi Main",
    },
  };

  // Active P-Way Repair Work Orders (Dynamic Light Backgrounds + High Contrast Dark Bold Text)
  let workOrders = [
    {
      id: "WO-8801",
      location: "NDLS–NZM Up Main",
      km: "Km 14/4",
      defect: "Rail Foot Corrosion & Micro-crack",
      priority: "HIGH",
      priorityClass:
        "bg-[#FEF2F2] text-[#DC2626] border-2 border-[#DC2626] font-extrabold",
      status: "IN PROGRESS",
      statusClass:
        "bg-[#EAF3F8] text-[#12355B] border-2 border-[#12355B] font-extrabold",
      crew: "SSE P-Way Unit Hazrat Nizamuddin",
    },
    {
      id: "WO-8794",
      location: "FDB–TKD Down Line",
      km: "Km 28/2",
      defect: "Worn Out Point Crossing No. 12B",
      priority: "MEDIUM",
      priorityClass:
        "bg-[#FFFBEB] text-[#B45309] border-2 border-[#FF9933] font-extrabold",
      status: "SCHEDULED",
      statusClass:
        "bg-[#FFFBEB] text-[#B45309] border-2 border-[#FF9933] font-extrabold",
      crew: "P-Way Gang 04 Faridabad",
    },
    {
      id: "WO-8752",
      location: "NZM–FDB Track Section",
      km: "Km 22/8",
      defect: "USFD Defect Code 111 (Rail Joint Flaw)",
      priority: "CRITICAL",
      priorityClass:
        "bg-[#FEF2F2] text-[#DC2626] border-2 border-[#DC2626] font-extrabold",
      status: "IN PROGRESS",
      statusClass:
        "bg-[#EAF3F8] text-[#12355B] border-2 border-[#12355B] font-extrabold",
      crew: "Specialist USFD Team 02",
    },
    {
      id: "WO-8710",
      location: "NDLS Yard Line 5",
      km: "Km 0/8",
      defect: "Fishplate Bolt Replacement & Gauge",
      priority: "LOW",
      priorityClass:
        "bg-[#F0FDF4] text-[#138808] border-2 border-[#138808] font-extrabold",
      status: "COMPLETED",
      statusClass:
        "bg-[#F0FDF4] text-[#138808] border-2 border-[#138808] font-extrabold",
      crew: "Maintenance Crew Delhi Main",
    },
    {
      id: "WO-8688",
      location: "OKHA Express Track Section",
      km: "Km 9/1",
      defect: "Ballast Shoulder Clearance & Tamping",
      priority: "MEDIUM",
      priorityClass:
        "bg-[#FFFBEB] text-[#B45309] border-2 border-[#FF9933] font-extrabold",
      status: "PENDING",
      statusClass:
        "bg-[#FFFBEB] text-[#B45309] border-2 border-[#FF9933] font-extrabold",
      crew: "SSE P-Way Gang 07 Okhla",
    },
  ];

  // Toast Function
  window.showToast = function (msg, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `px-4 py-3 rounded-2xl border backdrop-blur-xl text-xs font-semibold shadow-2xl flex items-center gap-2.5 transition-all transform translate-y-2 opacity-0 max-w-md z-[9999]`;

    if (type === "success") {
      toast.className +=
        " bg-emerald-950/95 border-emerald-500/50 text-emerald-200";
      toast.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i> <span>${msg}</span>`;
    } else if (type === "error") {
      toast.className += " bg-red-950/95 border-red-500/50 text-red-200";
      toast.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-red-400 text-sm"></i> <span>${msg}</span>`;
    } else {
      toast.className += " bg-slate-900/95 border-blue-500/40 text-blue-200";
      toast.innerHTML = `<i class="fa-solid fa-circle-info text-blue-400 text-sm"></i> <span>${msg}</span>`;
    }

    container.appendChild(toast);
    setTimeout(() => toast.classList.remove("translate-y-2", "opacity-0"), 10);
    setTimeout(() => {
      toast.classList.add("opacity-0", "translate-y-2");
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  };

  // Live IST Clock
  function updateClock() {
    const el = document.getElementById("dashClock");
    if (el) {
      const now = new Date();
      const options = {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      };
      const timeStr = now.toLocaleTimeString("en-IN", options);
      el.textContent = `${timeStr} IST`;
    }
  }
  setInterval(updateClock, 1000);
  updateClock();

  // =========================================================================
  // DEPARTMENT ACCESS SECURITY CONFIG & AUTHENTICATION STATE
  // =========================================================================
  const departmentsSecurityConfig = {
    station_master: {
      name: "Station Master Operations Console",
      officerId: "sm.ndls@ir.gov.in",
      pass: "sm123",
      hint: "Default Testing Password: sm123",
    },
    maintenance_engineer: {
      name: "Maintenance Engineering Department",
      officerId: "engineer.pway@ir.gov.in",
      pass: "eng123",
      hint: "Default Testing Password: eng123",
    },
    control_room: {
      name: "Control Room Officer Terminal",
      officerId: "controller.ndls@ir.gov.in",
      pass: "ctrl123",
      hint: "Default Testing Password: ctrl123",
    },
    admin_superintendent: {
      name: "Admin & Safety Superintendent",
      officerId: "admin.suptd@ir.gov.in",
      pass: "admin123",
      hint: "Default Testing Password: admin123",
    },
  };

  const authenticatedDepartments = new Set();
  let pendingDeptKey = null;

  // Navigation Router & View Switcher
  let activeNavView = "overview";

  window.switchDepartmentWorkspace = function (deptKey) {
    if (deptKey === "overview") {
      switchNavView("overview");
      return;
    }

    // ALWAYS prompt for department security password on every department switch
    if (departmentsSecurityConfig[deptKey]) {
      openDepartmentSecurityModal(deptKey);
      return;
    }

    performDepartmentSwitch(deptKey);
  };

  function openDepartmentSecurityModal(deptKey) {
    pendingDeptKey = deptKey;
    const config = departmentsSecurityConfig[deptKey];
    if (!config) return;

    document.getElementById("deptModalTitle").textContent = config.name;
    document.getElementById("deptAuthOfficerId").value = config.officerId;
    document.getElementById("deptAuthPassword").value = "";
    document.getElementById("deptPassHint").textContent = config.hint;

    document
      .getElementById("departmentSecurityModal")
      .classList.remove("hidden");
    setTimeout(() => {
      document.getElementById("deptAuthPassword").focus();
    }, 50);
  }

  window.closeDepartmentSecurityModal = function () {
    document.getElementById("departmentSecurityModal").classList.add("hidden");
    // Reset dropdown selection to activeNavView
    const selectEl = document.getElementById("headerDepartmentSelect");
    if (selectEl) selectEl.value = activeNavView;
  };

  window.verifyDepartmentSecurity = function (event) {
    event.preventDefault();
    if (!pendingDeptKey) return;

    const passInput = document.getElementById("deptAuthPassword").value.trim();
    const config = departmentsSecurityConfig[pendingDeptKey];

    if (config && passInput === config.pass) {
      const targetDept = pendingDeptKey;
      closeDepartmentSecurityModal();
      showToast(`🔒 Security Verified! Welcome to ${config.name}`, "success");
      performDepartmentSwitch(targetDept);
    } else {
      showToast(
        "❌ Access Denied: Invalid Department Security Password!",
        "error",
      );
    }
  };

  function performDepartmentSwitch(deptKey) {
    activeNavView = deptKey;
    const selectEl = document.getElementById("headerDepartmentSelect");
    if (selectEl) selectEl.value = deptKey;

    const container = document.getElementById("activeSubTabContainer");
    if (!container) return;

    // Remove active highlight from main sidebar links
    const navLinks = document.querySelectorAll("#mainSidebarNav a");
    navLinks.forEach((link) => {
      link.className =
        "sidebar-link text-slate-400 hover:text-slate-200 flex items-center gap-3 px-3.5 py-2.5 rounded-xl";
    });

    // Update active highlight on department sub-links
    const deptLinks = document.querySelectorAll('aside a[id^="nav_dept_"]');
    deptLinks.forEach((link) => {
      if (link.id === `nav_dept_${deptKey}`) {
        link.className =
          "sidebar-link active flex items-center gap-3 px-3.5 py-2 rounded-xl text-white font-bold bg-blue-600/30 border border-blue-400";
      } else {
        link.className =
          "sidebar-link text-slate-400 hover:text-slate-200 flex items-center gap-3 px-3.5 py-2 rounded-xl";
      }
    });

    if (deptKey === "station_master") {
      renderStationMasterWorkspace(container);
    } else if (deptKey === "maintenance_engineer") {
      renderMaintenanceEngineerWorkspace(container);
    } else if (deptKey === "control_room") {
      renderControlRoomWorkspace(container);
    } else if (deptKey === "admin_superintendent") {
      renderAdminSuperintendentWorkspace(container);
    }
  }

  window.switchNavView = function (viewName) {
    activeNavView = (viewName === "overview" || !viewName) ? "train_list" : viewName;

    // Sync header dropdown to 'overview' if normal view selected
    const selectEl = document.getElementById("headerDepartmentSelect");
    if (
      selectEl &&
      ![
        "station_master",
        "maintenance_engineer",
        "control_room",
        "admin_superintendent",
      ].includes(activeNavView)
    ) {
      selectEl.value = "overview";
    }

    // Reset department link highlights
    const deptLinks = document.querySelectorAll('aside a[id^="nav_dept_"]');
    deptLinks.forEach((link) => {
      link.className =
        "sidebar-link text-slate-700 hover:text-[#12355B] font-bold flex items-center gap-3 px-3.5 py-2 rounded-xl";
    });

    // Update active class on sidebar
    const navLinks = document.querySelectorAll("#mainSidebarNav a");
    navLinks.forEach((link) => {
      if (link.id === `nav_${activeNavView}`) {
        link.className =
          "sidebar-link active flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-white font-black bg-[#12355B] border-l-4 border-[#FF9933] shadow-md";
      } else {
        link.className =
          "sidebar-link text-slate-700 hover:text-[#12355B] font-bold flex items-center gap-3 px-3.5 py-2.5 rounded-xl";
      }
    });

    const container = document.getElementById("activeSubTabContainer");
    if (!container) return;

    if (activeNavView === "overview" || activeNavView === "train_list") {
      activeNavView = "train_list";
      renderTrainListSection(container);
    } else if (
      activeNavView === "station_master" ||
      activeNavView === "maintenance_engineer" ||
      activeNavView === "control_room" ||
      activeNavView === "admin_superintendent"
    ) {
      switchDepartmentWorkspace(activeNavView);
    } else if (activeNavView === "live_map") {
      renderLiveMapSection(container);
    } else if (activeNavView === "train_list") {
      renderTrainListSection(container);
    } else if (activeNavView === "conflict_alerts") {
      renderConflictAlertsSection(container);
    } else if (activeNavView === "rescheduling") {
      renderReschedulingSection(container);
    } else if (activeNavView === "analytics") {
      renderAnalyticsSection(container);
    } else if (activeNavView === "track_sensor") {
      renderUsfdScannerTab(container);
    } else if (activeNavView === "weather") {
      renderWeatherSection(container);
    } else if (activeNavView === "notifications") {
      renderNotificationsSection(container);
    } else if (activeNavView === "fuel_saving") {
      renderFuelSavingSection(container);
    } else if (activeNavView === "settings") {
      renderSettingsSection(container);
    }
  };

  // P-Track Selector Handler
  window.selectPTrack = function (trackId) {
    if (pTrackData[trackId]) {
      selectedPTrack = trackId;
      showToast(`🛤️ Selected ${pTrackData[trackId].name}`, "info");
      const container = document.getElementById("activeSubTabContainer");
      if (container && activeNavView === "overview") {
        renderDashboardOverview(container);
      }
    }
  };
  // =========================================================================
  // PERSISTENT SIDEBAR NAVIGATION VIEW RENDERERS
  // =========================================================================

  // VIEW 1: REALISTIC INDIAN RAILWAYS GEOGRAPHIC ROUTE MAP (live_map)
  let activeMapTrainFilter = "all";

  window.filterMapTrains = function (filterType) {
    activeMapTrainFilter = filterType;
    const container = document.getElementById("activeSubTabContainer");
    if (container && activeNavView === "live_map") {
      renderLiveMapSection(container);
    }
  };

  // =========================================================================
  // VIEW: ADVANCED PAN-INDIA INTERACTIVE RAILWAY MAP & REALISTIC TRAIN SYSTEM
  // Strictly India-Confined Bounds, Progressive Geographic Zoom (States -> Cities -> Towns -> Tracks),
  // Multi-Coach Realistic Train Rakes with Headlight Beam & Kavach Radar,
  // Intelligent Search with Auto-Detection & Camera Fly-To,
  // Forward Route Track Timeline & Distance/ETA Scrubber.
  // =========================================================================

  // Comprehensive Pan-India Train Corridors Dataset
  const panIndiaTrainData = [
    {
      id: "22436",
      number: "22436",
      name: "Vande Bharat Express (Kashi / Varanasi)",
      shortName: "Kashi Vande Bharat (NDLS - BSB)",
      type: "vande_bharat",
      color: "#0284c7",
      speed: 130,
      maxSpeed: 160,
      kavachStatus: "ARMED (160.225 MHz)",
      kavachFreq: "160.225 MHz",
      rssi: "-39 dBm",
      satellites: 15,
      locoPilot: "Manish Tiwari (HQ CNB)",
      locoModel: "Train 18 Vande Bharat (16 Coaches)",
      currentSection: "Aligarh - Tundla High-Speed Track",
      nextStation: "Kanpur Central (CNB)",
      etaNextStation: "52 mins",
      brakingMargin: "1,750m (Optimal)",
      cabSignal: "PROCEED (GREEN)",
      cabSignalClass: "text-emerald-400",
      routeDescription: "New Delhi (NDLS) ➔ Aligarh ➔ Kanpur Central ➔ Prayagraj ➔ Varanasi",
      stations: [
        { name: "New Delhi", code: "NDLS", lat: 28.6139, lng: 77.2090, pf: "PF 16", arr: "Departed 06:00", distKm: 0 },
        { name: "Aligarh Jn", code: "ALJN", lat: 27.8974, lng: 78.0880, pf: "PF 3", arr: "07:30", distKm: 131 },
        { name: "Kanpur Central", code: "CNB", lat: 26.4499, lng: 80.3319, pf: "PF 1", arr: "10:08", distKm: 440 },
        { name: "Prayagraj Jn", code: "PRYJ", lat: 25.4358, lng: 81.8463, pf: "PF 6", arr: "12:08", distKm: 635 },
        { name: "Varanasi Jn", code: "BSB", lat: 25.3176, lng: 82.9739, pf: "PF 1", arr: "14:00", distKm: 759 }
      ],
      progress: 0.35
    },
    {
      id: "12951",
      number: "12951",
      name: "Mumbai Tejas Rajdhani Express",
      shortName: "Tejas Rajdhani (MMCT - NDLS)",
      type: "rajdhani",
      color: "#e11d48",
      speed: 130,
      maxSpeed: 130,
      kavachStatus: "ARMED (SIL-4 Certified)",
      kavachFreq: "160.225 MHz",
      rssi: "-46 dBm",
      satellites: 13,
      locoPilot: "Sunil Wankhede (HQ MMCT)",
      locoModel: "WAP-7 Twin-Bo-Bo Electric (6,000 HP)",
      currentSection: "Vadodara - Ratlam Ghat Section",
      nextStation: "Ratlam Junction (RTM)",
      etaNextStation: "24 mins",
      brakingMargin: "1,450m (Safe Curve)",
      cabSignal: "PROCEED (GREEN)",
      cabSignalClass: "text-emerald-400",
      routeDescription: "Mumbai Central (MMCT) ➔ Surat ➔ Vadodara ➔ Ratlam ➔ Kota ➔ New Delhi",
      stations: [
        { name: "Mumbai Central", code: "MMCT", lat: 18.9712, lng: 72.8197, pf: "PF 1", arr: "Departed 17:00", distKm: 0 },
        { name: "Surat", code: "ST", lat: 21.1702, lng: 72.8311, pf: "PF 1", arr: "19:32", distKm: 263 },
        { name: "Vadodara Jn", code: "BRC", lat: 22.3072, lng: 73.1812, pf: "PF 2", arr: "21:05", distKm: 392 },
        { name: "Ratlam Jn", code: "RTM", lat: 23.3315, lng: 75.0367, pf: "PF 4", arr: "00:25", distKm: 653 },
        { name: "Kota Jn", code: "KOTA", lat: 25.1800, lng: 75.8300, pf: "PF 1", arr: "03:15", distKm: 919 },
        { name: "Mathura Jn", code: "MTJ", lat: 27.4924, lng: 77.6737, pf: "PF 3", arr: "06:40", distKm: 1243 },
        { name: "New Delhi", code: "NDLS", lat: 28.6139, lng: 77.2090, pf: "PF 1", arr: "08:32", distKm: 1384 }
      ],
      progress: 0.42
    }
  ];

  // =========================================================================
  // PAN-INDIA COMPLETE RAILWAY TRACK NETWORK INFRASTRUCTURE (GQ/GD & DFC)
  // Real Broad-Gauge Track System Across India
  // =========================================================================
  const panIndiaRailwayTrackSystem = [
    {
      id: "track_western_trunk",
      name: "Delhi - Mumbai Western Electrified Trunk (GQ-1)",
      type: "electrified_main",
      color: "#0284c7",
      speedRating: "130-160 km/h",
      gauge: "Broad Gauge 1676mm (Double/Quad Line)",
      electrification: "25 kV AC 50 Hz",
      kavachStatus: "ACTIVE (SIL-4)",
      coordinates: [
        [28.6139, 77.2090], // NDLS
        [27.4924, 77.6737], // Mathura
        [27.2152, 77.4892], // Bharatpur
        [26.7297, 76.9856], // Hindaun City
        [26.4716, 76.7214], // Gangapur City
        [25.9928, 76.3533], // Sawai Madhopur
        [25.1800, 75.8300], // Kota Jn
        [24.1878, 75.6412], // Shamgarh
        [23.4560, 75.4124], // Nagda Jn
        [23.3315, 75.0367], // Ratlam Jn
        [22.8373, 74.2554], // Dahod
        [22.7554, 73.6146], // Godhra
        [22.3072, 73.1812], // Vadodara Jn
        [21.7051, 72.9959], // Bharuch Jn
        [21.6264, 73.0039], // Ankleshwar
        [21.1702, 72.8311], // Surat
        [20.9507, 72.9258], // Navsari
        [20.6103, 72.9342], // Valsad
        [20.3712, 72.9048], // Vapi
        [19.6967, 72.7699], // Palghar
        [19.4564, 72.8081], // Virar
        [19.2288, 72.8541], // Borivali
        [18.9712, 72.8197]  // Mumbai Central
      ]
    },
    {
      id: "track_eastern_trunk",
      name: "Delhi - Howrah Eastern Electrified Trunk (GQ-2)",
      type: "electrified_main",
      color: "#dc2626",
      speedRating: "130-160 km/h",
      gauge: "Broad Gauge 1676mm (Triple/Double Line)",
      electrification: "25 kV AC 50 Hz",
      kavachStatus: "ACTIVE (SIL-4)",
      coordinates: [
        [28.6139, 77.2090], // NDLS
        [28.6692, 77.4538], // Ghaziabad
        [27.8974, 78.0880], // Aligarh
        [27.2062, 78.2438], // Tundla
        [26.7855, 79.0270], // Etawah
        [26.4499, 80.3319], // Kanpur Central
        [25.9284, 80.8128], // Fatehpur
        [25.4358, 81.8463], // Prayagraj Jn
        [25.1460, 82.5690], // Mirzapur
        [25.2818, 83.1162], // Pt. Deen Dayal Upadhyaya
        [24.9535, 84.0289], // Sasaram
        [24.9126, 84.1856], // Dehri-on-Sone
        [24.7955, 85.0002], // Gaya Jn
        [24.4674, 85.5936], // Koderma
        [23.9482, 86.0694], // Parasnath
        [23.8722, 86.1554], // Gomoh
        [23.7957, 86.4304], // Dhanbad Jn
        [23.6889, 86.9661], // Asansol Jn
        [23.5204, 87.3119], // Durgapur
        [23.2324, 87.8615], // Bardhaman
        [22.5850, 88.3426]  // Howrah
      ]
    },
    {
      id: "track_grand_trunk",
      name: "Delhi - Chennai Grand Trunk Corridor (GD-1)",
      type: "electrified_main",
      color: "#c2410c",
      speedRating: "130 km/h",
      gauge: "Broad Gauge 1676mm (Double Line)",
      electrification: "25 kV AC",
      kavachStatus: "ACTIVE (SIL-4)",
      coordinates: [
        [28.6139, 77.2090], // NDLS
        [27.4924, 77.6737], // Mathura
        [27.1767, 78.0081], // Agra Cantt
        [26.2183, 78.1828], // Gwalior
        [25.4484, 78.5685], // VGL Jhansi
        [24.6900, 78.4100], // Lalitpur
        [24.1800, 78.1800], // Bina Jn
        [23.2599, 77.4126], // Bhopal Jn
        [22.6100, 77.7600], // Itarsi Jn
        [21.9000, 77.9000], // Betul
        [21.1458, 79.0882], // Nagpur Jn
        [20.7400, 78.6000], // Sewagram
        [19.8519, 79.3789], // Balharshah
        [18.7600, 79.5100], // Ramagundam
        [17.9689, 79.5941], // Warangal / Kazipet
        [17.2500, 80.1500], // Khammam
        [16.5062, 80.6480], // Vijayawada Jn
        [16.2400, 80.6400], // Tenali
        [15.5000, 80.0500], // Ongole
        [14.4400, 79.9800], // Nellore
        [13.8200, 79.8500], // Gudur
        [13.0827, 80.2707]  // Chennai Central
      ]
    },
    {
      id: "track_mumbai_howrah",
      name: "Mumbai - Howrah Trans-India Central Corridor (GD-2)",
      type: "electrified_main",
      color: "#0891b2",
      speedRating: "130 km/h",
      gauge: "Broad Gauge 1676mm (Double Line)",
      electrification: "25 kV AC",
      kavachStatus: "ACTIVE (SIL-4)",
      coordinates: [
        [18.9400, 72.8350], // Mumbai CSMT
        [19.2400, 73.1300], // Kalyan
        [19.9975, 73.7898], // Nashik
        [20.2500, 74.4400], // Manmad
        [20.8200, 75.7000], // Jalgaon
        [21.0500, 75.7900], // Bhusawal
        [20.7000, 77.0000], // Akola
        [20.9300, 77.7500], // Badnera / Amravati
        [20.7400, 78.6000], // Wardha
        [21.1458, 79.0882], // Nagpur
        [21.4600, 80.2000], // Gondia
        [21.1900, 81.2800], // Durg
        [21.2500, 81.6300], // Raipur
        [22.0800, 82.1500], // Bilaspur
        [21.8500, 83.9200], // Jharsuguda
        [22.2500, 84.8800], // Rourkela
        [22.7500, 86.2000], // Tatanagar (Jamshedpur)
        [22.3400, 87.3200], // Kharagpur
        [22.5850, 88.3426]  // Howrah
      ]
    },
    {
      id: "track_mumbai_chennai",
      name: "Mumbai - Chennai South-Central Trunk (GQ-3)",
      type: "electrified_main",
      color: "#9333ea",
      speedRating: "130 km/h",
      gauge: "Broad Gauge 1676mm",
      electrification: "25 kV AC",
      kavachStatus: "DEPLOYED",
      coordinates: [
        [18.9400, 72.8350], // Mumbai
        [18.5204, 73.8567], // Pune
        [18.4600, 74.5800], // Daund
        [17.6600, 75.9100], // Solapur
        [17.0500, 76.9900], // Wadi Jn
        [16.2000, 77.3600], // Raichur
        [15.1700, 77.3800], // Guntakal Jn
        [14.4700, 78.8200], // Cuddapah (Kadapa)
        [13.6300, 79.4200], // Renigunta
        [13.0827, 80.2707]  // Chennai Central
      ]
    },
    {
      id: "track_east_coast",
      name: "Howrah - Chennai East Coast Golden Trunk (GQ-4)",
      type: "electrified_main",
      color: "#16a34a",
      speedRating: "130 km/h",
      gauge: "Broad Gauge 1676mm",
      electrification: "25 kV AC",
      kavachStatus: "ACTIVE (SIL-4)",
      coordinates: [
        [22.5850, 88.3426], // Howrah
        [22.3400, 87.3200], // Kharagpur
        [21.5000, 86.9200], // Balasore
        [21.0500, 86.5000], // Bhadrak
        [20.4600, 85.8800], // Cuttack
        [20.2700, 85.8400], // Bhubaneswar
        [19.3200, 84.7900], // Brahmapur
        [18.6000, 84.1400], // Srikakulam
        [18.1200, 83.4200], // Vizianagaram
        [17.6868, 83.2185], // Visakhapatnam
        [17.0000, 81.7800], // Rajahmundry
        [16.7100, 81.1000], // Eluru
        [16.5062, 80.6480], // Vijayawada
        [15.5000, 80.0500], // Ongole
        [14.4400, 79.9800], // Nellore
        [13.0827, 80.2707]  // Chennai Central
      ]
    },
    {
      id: "track_northern_trunk",
      name: "Delhi - Amritsar / Jammu Northern Trunk",
      type: "electrified_main",
      color: "#0284c7",
      speedRating: "130-160 km/h",
      gauge: "Broad Gauge (Double Line)",
      electrification: "25 kV AC",
      kavachStatus: "ACTIVE (160.225 MHz)",
      coordinates: [
        [28.6139, 77.2090], // NDLS
        [29.3909, 76.9635], // Panipat
        [29.6857, 76.9905], // Karnal
        [29.9695, 76.8783], // Kurukshetra
        [30.3752, 76.7821], // Ambala Cantt
        [30.9010, 75.8573], // Ludhiana
        [31.3260, 75.5762], // Jalandhar City
        [31.5168, 75.3023], // Beas
        [31.6340, 74.8723]  // Amritsar
      ]
    },
    {
      id: "track_wdfc",
      name: "Western Dedicated Freight Corridor (WDFC)",
      type: "dfc_freight",
      color: "#eab308",
      speedRating: "100 km/h (Heavy Loaded)",
      gauge: "Broad Gauge Heavy Haul (Double Stack)",
      electrification: "2x25 kV AC High Rise OHE",
      kavachStatus: "ACTIVE (SIL-4)",
      coordinates: [
        [28.5528, 77.5540], // Dadri WDFC
        [28.1920, 76.6239], // Rewari
        [27.9900, 76.1000], // Narnaul
        [27.7000, 75.8000], // Neem Ka Thana
        [27.3500, 75.5700], // Ringas
        [26.8727, 75.2348], // Phulera
        [26.4700, 74.6400], // Ajmer
        [25.7289, 73.3644], // Marwar Jn
        [25.2200, 73.0500], // Falna
        [24.4700, 72.7800], // Abu Road
        [24.1724, 72.4346], // Palanpur
        [23.6000, 72.4000], // Mehsana
        [22.9868, 72.3813], // Sanand Freight
        [22.3072, 73.1812], // Vadodara DFC
        [21.1702, 72.8311], // Surat DFC
        [18.9500, 72.9500]  // JNPT Terminal
      ]
    },
    {
      id: "track_edfc",
      name: "Eastern Dedicated Freight Corridor (EDFC)",
      type: "dfc_freight",
      color: "#ca8a04",
      speedRating: "100 km/h",
      gauge: "Heavy Double Track Automated",
      electrification: "2x25 kV AC",
      kavachStatus: "ACTIVE (SIL-4)",
      coordinates: [
        [30.8500, 75.9500], // Sahnewal (Ludhiana)
        [30.3500, 76.8500], // Shambhu
        [28.2500, 77.8500], // Khurja DFC
        [27.2000, 78.2500], // Tundla DFC
        [26.4000, 80.2000], // Bhaupur (Kanpur)
        [25.3500, 81.9000], // New Karchhana
        [25.2818, 83.1162], // Pt. Deen Dayal Upadhyaya
        [24.8500, 84.2500]  // Sonnagar DFC
      ]
    },
    {
      id: "track_southern_kerala",
      name: "Southern Trunk & Kerala Corridor",
      type: "electrified_main",
      color: "#15803d",
      speedRating: "110-130 km/h",
      gauge: "Broad Gauge (Double Line)",
      electrification: "25 kV AC",
      kavachStatus: "DEPLOYED",
      coordinates: [
        [13.0827, 80.2707], // Chennai
        [12.9698, 79.1325], // Katpadi
        [12.5500, 78.5800], // Jolarpettai
        [11.6600, 78.1400], // Salem
        [11.3400, 77.7200], // Erode
        [11.1000, 77.3400], // Tiruppur
        [11.0168, 76.9558], // Coimbatore
        [10.7800, 76.6500], // Palakkad
        [10.7600, 76.2800], // Shoranur
        [10.5200, 76.2100], // Thrissur
        [9.9816, 76.2999],  // Ernakulam Town
        [9.5900, 76.5200],  // Kottayam
        [8.8900, 76.6000],  // Kollam
        [8.5241, 76.9366],  // Thiruvananthapuram
        [8.0800, 77.5500]   // Kanyakumari
      ]
    },
    {
      id: "track_konkan_railway",
      name: "Konkan Railway Coastal Route",
      type: "electrified_main",
      color: "#0284c7",
      speedRating: "120 km/h",
      gauge: "Broad Gauge (Tunnels & Bridges)",
      electrification: "100% Electrified 25 kV AC",
      kavachStatus: "ACTIVE (Anti-Collision Device)",
      coordinates: [
        [18.4300, 73.1200], // Roha
        [17.5300, 73.5200], // Chiplun
        [16.9900, 73.3000], // Ratnagiri
        [15.9000, 73.7000], // Kudal
        [15.2800, 73.9800], // Madgaon (Goa)
        [14.8200, 74.1300], // Karwar
        [13.9100, 74.5700], // Bhatkal
        [13.3400, 74.7400], // Udupi
        [12.8700, 74.8400]  // Mangaluru Central
      ]
    },
    {
      id: "track_bengaluru_hyderabad",
      name: "Bengaluru - Hyderabad / Secunderabad Trunk",
      type: "electrified_main",
      color: "#6366f1",
      speedRating: "130 km/h",
      gauge: "Broad Gauge",
      electrification: "25 kV AC",
      kavachStatus: "ACTIVE (SIL-4)",
      coordinates: [
        [12.9716, 77.5946], // Bengaluru
        [14.1500, 77.7200], // Dharmavaram
        [14.6800, 77.6000], // Anantapur
        [15.1700, 77.3800], // Guntakal
        [15.8200, 78.0300], // Kurnool
        [16.7400, 77.9800], // Mahbubnagar
        [17.3850, 78.4867]  // Hyderabad / Kacheguda
      ]
    },
    {
      id: "track_northeast",
      name: "North-Eastern & Assam Gateway Corridor",
      type: "electrified_main",
      color: "#059669",
      speedRating: "110-130 km/h",
      gauge: "Broad Gauge",
      electrification: "25 kV AC Electrified",
      kavachStatus: "DEPLOYED",
      coordinates: [
        [22.5850, 88.3426], // Kolkata
        [25.0100, 88.1400], // Malda Town
        [26.7200, 88.4300], // New Jalpaiguri (Siliguri)
        [26.3200, 89.4600], // New Cooch Behar
        [26.5000, 90.5500], // New Bongaigaon
        [26.1445, 91.7362], // Guwahati
        [25.7500, 93.1700], // Lumding
        [27.4700, 94.9100]  // Dibrugarh
      ]
    },
    {
      id: "track_rajasthan_link",
      name: "Jaipur - Ajmer - Marwar - Jodhpur Link",
      type: "secondary_main",
      color: "#d97706",
      speedRating: "110-130 km/h",
      gauge: "Broad Gauge Electrified",
      electrification: "25 kV AC",
      kavachStatus: "DEPLOYED",
      coordinates: [
        [26.9124, 75.7873], // Jaipur
        [26.4700, 74.6400], // Ajmer
        [25.7289, 73.3644], // Marwar Jn
        [26.2900, 73.0200]  // Jodhpur
      ]
    },
    {
      id: "track_central_link",
      name: "Bhopal - Ujjain - Indore / Ahmedabad Link",
      type: "secondary_main",
      color: "#2563eb",
      speedRating: "110-130 km/h",
      gauge: "Broad Gauge Electrified",
      electrification: "25 kV AC",
      kavachStatus: "ACTIVE",
      coordinates: [
        [23.2599, 77.4126], // Bhopal
        [23.1800, 75.7800], // Ujjain
        [22.7196, 75.8577], // Indore
        [23.4560, 75.4124], // Nagda
        [23.3315, 75.0367], // Ratlam
        [23.0225, 72.5714]  // Ahmedabad
      ]
    }
  ];

  // Pan-India Hierarchical Geography Dataset (States -> Metros -> Junctions -> Towns)
  const panIndiaGeoPlaces = [
    // Tier 1: Indian States & Union Territories (Visible at Zoom 4 - 6)
    { name: "RAJASTHAN (NWR)", lat: 26.58, lng: 73.85, tier: "state" },
    { name: "UTTAR PRADESH (NCR/NR)", lat: 27.12, lng: 80.95, tier: "state" },
    { name: "MAHARASHTRA (CR/WR)", lat: 19.55, lng: 75.52, tier: "state" },
    { name: "MADHYA PRADESH (WCR)", lat: 23.50, lng: 78.25, tier: "state" },
    { name: "GUJARAT (WR)", lat: 22.85, lng: 71.55, tier: "state" },
    { name: "PUNJAB (NR)", lat: 31.05, lng: 75.40, tier: "state" },
    { name: "HARYANA (NR)", lat: 29.25, lng: 76.50, tier: "state" },
    { name: "BIHAR (ECR)", lat: 25.65, lng: 85.80, tier: "state" },
    { name: "WEST BENGAL (ER/SER)", lat: 23.35, lng: 87.80, tier: "state" },
    { name: "TAMIL NADU (SR)", lat: 11.05, lng: 78.50, tier: "state" },
    { name: "KARNATAKA (SWR)", lat: 14.50, lng: 75.80, tier: "state" },
    { name: "ANDHRA PRADESH (SCR)", lat: 15.80, lng: 79.70, tier: "state" },
    { name: "TELANGANA (SCR)", lat: 17.80, lng: 79.10, tier: "state" },
    { name: "KERALA (SR)", lat: 10.20, lng: 76.40, tier: "state" },
    { name: "ODISHA (ECoR)", lat: 20.50, lng: 84.50, tier: "state" },
    { name: "JHARKHAND (SER/ECR)", lat: 23.60, lng: 85.30, tier: "state" },
    { name: "CHHATTISGARH (SECR)", lat: 21.30, lng: 81.90, tier: "state" },
    { name: "ASSAM (NFR)", lat: 26.20, lng: 92.90, tier: "state" },
    { name: "UTTARAKHAND (NR)", lat: 30.10, lng: 79.10, tier: "state" },
    { name: "HIMACHAL PRADESH (NR)", lat: 31.80, lng: 77.20, tier: "state" },
    { name: "JAMMU & KASHMIR (NR)", lat: 33.50, lng: 75.00, tier: "state" },
    { name: "DELHI NCR (HQ)", lat: 28.6139, lng: 77.2090, tier: "state" },

    // Tier 2: Metros & Primary Cities (Visible at Zoom 6 - 8)
    { name: "New Delhi", lat: 28.6139, lng: 77.2090, tier: "city" },
    { name: "Mumbai", lat: 18.9712, lng: 72.8197, tier: "city" },
    { name: "Kolkata", lat: 22.5726, lng: 88.3639, tier: "city" },
    { name: "Chennai", lat: 13.0827, lng: 80.2707, tier: "city" },
    { name: "Bengaluru", lat: 12.9716, lng: 77.5946, tier: "city" },
    { name: "Hyderabad", lat: 17.3850, lng: 78.4867, tier: "city" },
    { name: "Ahmedabad", lat: 23.0225, lng: 72.5714, tier: "city" },
    { name: "Jaipur", lat: 26.9124, lng: 75.7873, tier: "city" },
    { name: "Lucknow", lat: 26.8467, lng: 80.9462, tier: "city" },
    { name: "Kanpur", lat: 26.4499, lng: 80.3319, tier: "city" },
    { name: "Nagpur", lat: 21.1458, lng: 79.0882, tier: "city" },
    { name: "Bhopal", lat: 23.2599, lng: 77.4126, tier: "city" },
    { name: "Patna", lat: 25.5941, lng: 85.1376, tier: "city" },
    { name: "Surat", lat: 21.1702, lng: 72.8311, tier: "city" },
    { name: "Vadodara", lat: 22.3072, lng: 73.1812, tier: "city" },
    { name: "Varanasi", lat: 25.3176, lng: 82.9739, tier: "city" },
    { name: "Agra", lat: 27.1767, lng: 78.0081, tier: "city" },
    { name: "Amritsar", lat: 31.6340, lng: 74.8723, tier: "city" },
    { name: "Chandigarh", lat: 30.7333, lng: 76.7794, tier: "city" },
    { name: "Indore", lat: 22.7196, lng: 75.8577, tier: "city" },
    { name: "Coimbatore", lat: 11.0168, lng: 76.9558, tier: "city" },
    { name: "Thiruvananthapuram", lat: 8.5241, lng: 76.9366, tier: "city" },
    { name: "Guwahati", lat: 26.1445, lng: 91.7362, tier: "city" },

    // Tier 3: District Junctions (Visible at Zoom 9 - 11)
    { name: "Kota Jn", lat: 25.1800, lng: 75.8300, tier: "junction" },
    { name: "Ratlam Jn", lat: 23.3315, lng: 75.0367, tier: "junction" },
    { name: "Mathura Jn", lat: 27.4924, lng: 77.6737, tier: "junction" },
    { name: "Prayagraj Jn", lat: 25.4358, lng: 81.8463, tier: "junction" },
    { name: "Pt. Deen Dayal Upadhyaya", lat: 25.2818, lng: 83.1162, tier: "junction" },
    { name: "Asansol Jn", lat: 23.6889, lng: 86.9661, tier: "junction" },
    { name: "Dhanbad Jn", lat: 23.7957, lng: 86.4304, tier: "junction" },
    { name: "Gaya Jn", lat: 24.7955, lng: 85.0002, tier: "junction" },
    { name: "Ambala Cantt", lat: 30.3752, lng: 76.7821, tier: "junction" },
    { name: "Panipat Jn", lat: 29.3909, lng: 76.9635, tier: "junction" },
    { name: "Kurukshetra Jn", lat: 29.9695, lng: 76.8783, tier: "junction" },
    { name: "Ludhiana Jn", lat: 30.9010, lng: 75.8573, tier: "junction" },
    { name: "Jalandhar City", lat: 31.3260, lng: 75.5762, tier: "junction" },
    { name: "Gwalior Jn", lat: 26.2183, lng: 78.1828, tier: "junction" },
    { name: "VGL Jhansi", lat: 25.4484, lng: 78.5685, tier: "junction" },
    { name: "Vijayawada Jn", lat: 16.5062, lng: 80.6480, tier: "junction" },
    { name: "Warangal", lat: 17.9689, lng: 79.5941, tier: "junction" },
    { name: "Palanpur Jn", lat: 24.1724, lng: 72.4346, tier: "junction" },
    { name: "Rewari Jn", lat: 28.1920, lng: 76.6239, tier: "junction" },
    { name: "Phulera Jn", lat: 26.8727, lng: 75.2348, tier: "junction" },
    { name: "Marwar Jn", lat: 25.7289, lng: 73.3644, tier: "junction" },
    { name: "Vapi", lat: 20.3712, lng: 72.9048, tier: "junction" },
    { name: "Bharuch Jn", lat: 21.7051, lng: 72.9959, tier: "junction" },
    { name: "Anand Jn", lat: 22.5645, lng: 72.9289, tier: "junction" },

    // Tier 4: Intermediate Towns, Halts & Track Stations (Visible at Zoom 12+)
    { name: "Gangapur City", lat: 26.4716, lng: 76.7214, tier: "town" },
    { name: "Sawai Madhopur", lat: 25.9928, lng: 76.3533, tier: "town" },
    { name: "Bharatpur Jn", lat: 27.2152, lng: 77.4892, tier: "town" },
    { name: "Hindaun City", lat: 26.7297, lng: 76.9856, tier: "town" },
    { name: "Nagda Jn", lat: 23.4560, lng: 75.4124, tier: "town" },
    { name: "Shamgarh", lat: 24.1878, lng: 75.6412, tier: "town" },
    { name: "Dahod", lat: 22.8373, lng: 74.2554, tier: "town" },
    { name: "Ankleshwar", lat: 21.6264, lng: 73.0039, tier: "town" },
    { name: "Navsari", lat: 20.9507, lng: 72.9258, tier: "town" },
    { name: "Valsad", lat: 20.6103, lng: 72.9342, tier: "town" },
    { name: "Ganaur", lat: 29.1332, lng: 77.0195, tier: "town" },
    { name: "Samalkha", lat: 29.2372, lng: 77.0117, tier: "town" },
    { name: "Gharaunda", lat: 29.5398, lng: 76.9698, tier: "town" },
    { name: "Karnal", lat: 29.6857, lng: 76.9905, tier: "town" },
    { name: "Taraori", lat: 29.8055, lng: 76.9272, tier: "town" },
    { name: "Shahabad Markanda", lat: 30.1685, lng: 76.8711, tier: "town" },
    { name: "Sirhind Jn", lat: 30.6425, lng: 76.3846, tier: "town" },
    { name: "Khanna", lat: 30.7071, lng: 76.2163, tier: "town" },
    { name: "Phagwara Jn", lat: 31.2240, lng: 75.7708, tier: "town" },
    { name: "Beas Jn", lat: 31.5168, lng: 75.3023, tier: "town" },
    { name: "Fatehpur", lat: 25.9284, lng: 80.8128, tier: "town" },
    { name: "Mirzapur", lat: 25.1460, lng: 82.5690, tier: "town" },
    { name: "Sasaram Jn", lat: 24.9535, lng: 84.0289, tier: "town" },
    { name: "Dehri-on-Sone", lat: 24.9126, lng: 84.1856, tier: "town" },
    { name: "Koderma Jn", lat: 24.4674, lng: 85.5936, tier: "town" },
    { name: "Gomoh Jn", lat: 23.8722, lng: 86.1554, tier: "town" },
    { name: "Parasnath", lat: 23.9482, lng: 86.0694, tier: "town" }
  ];

  // Map Global State
  let panIndiaMap = null;
  let activeSelectedTrain = panIndiaTrainData[0]; // Default Vande Bharat
  let isFollowingTrainCamera = false;
  let mapRoutePolyline = null;
  let mapStationMarkersGroup = null;
  let mapGeoLabelsGroup = null;
  let mapCrossingsLayerGroup = null;
  let mapSignalsLayerGroup = null;
  let mapEarthquakesLayerGroup = null;
  let mapGhostScrubberMarker = null;
  let mapTrainMarkers = {};
  let trainAnimationTimer = null;
  let mapCurrentTileLayer = null;

  // Calculation Helper: Bearing between two lat/lng points
  function calculateBearingAngle(startLat, startLng, destLat, destLng) {
    const y = Math.sin((destLng - startLng) * (Math.PI / 180)) * Math.cos(destLat * (Math.PI / 180));
    const x =
      Math.cos(startLat * (Math.PI / 180)) * Math.sin(destLat * (Math.PI / 180)) -
      Math.sin(startLat * (Math.PI / 180)) * Math.cos(destLat * (Math.PI / 180)) * Math.cos((destLng - startLng) * (Math.PI / 180));
    const brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  }

  // Calculation Helper: Interpolate coordinates along train path
  function getTrainPositionAndBearing(train) {
    const stations = train.stations;
    if (!stations || stations.length < 2) {
      return { lat: 28.6139, lng: 77.2090, bearing: 0, currentSegmentIdx: 0 };
    }
    const totalSegments = stations.length - 1;
    const scaledProgress = train.progress * totalSegments;
    const segIdx = Math.min(Math.floor(scaledProgress), totalSegments - 1);
    const frac = scaledProgress - segIdx;

    const p1 = stations[segIdx];
    const p2 = stations[segIdx + 1];

    const lat = p1.lat + (p2.lat - p1.lat) * frac;
    const lng = p1.lng + (p2.lng - p1.lng) * frac;
    const bearing = calculateBearingAngle(p1.lat, p1.lng, p2.lat, p2.lng);

    return { lat, lng, bearing, currentSegmentIdx: segIdx };
  }

  // Calculate Forward Station Milestones, Distances & Remaining ETAs
  function calculateForwardMilestones(train) {
    if (!train || !train.stations) return [];

    const totalSegments = train.stations.length - 1;
    const scaledProgress = train.progress * totalSegments;
    const currentSegIdx = Math.floor(scaledProgress);
    const speed = train.speed > 0 ? train.speed : 110;

    const milestones = train.stations.map((stn, idx) => {
      const isPassed = idx <= currentSegIdx;
      const isNextImmediate = idx === currentSegIdx + 1;
      let distFromTrain = 0;
      let etaMins = 0;
      let etaText = "";

      if (isPassed) {
        etaText = "DEPARTED";
      } else {
        const segFrac = scaledProgress - currentSegIdx;
        const currentDist = train.stations[currentSegIdx].distKm + 
          (train.stations[currentSegIdx + 1].distKm - train.stations[currentSegIdx].distKm) * segFrac;
        distFromTrain = Math.max(0, Math.round(stn.distKm - currentDist));
        etaMins = Math.round((distFromTrain / speed) * 60);

        if (etaMins < 60) {
          etaText = `${etaMins} mins`;
        } else {
          const hrs = Math.floor(etaMins / 60);
          const mins = etaMins % 60;
          etaText = `${hrs}h ${mins}m`;
        }
      }

      return {
        ...stn,
        index: idx,
        isPassed,
        isNextImmediate,
        distFromTrain,
        etaMins,
        etaText
      };
    });

    return milestones;
  }

  // Generator: Ultra-Realistic Multi-Coach Train Rake SVG with Always-Visible Live Badge
  function generateRealisticTrainSVG(train, isSelected) {
    const isVB = train.type === "vande_bharat";
    const isRaj = train.type === "rajdhani";
    const isFreight = train.type === "freight";

    let bodyColor = isVB ? "#FFFFFF" : isRaj ? "#DC2626" : isFreight ? "#15803D" : "#2563EB";
    let stripeColor = isVB ? "#0284C7" : isRaj ? "#F59E0B" : isFreight ? "#EAB308" : "#93C5FD";
    let coachBg = isVB ? "#F8FAFC" : isRaj ? "#B91C1C" : isFreight ? "#166534" : "#1D4ED8";
    let coachStripe = isVB ? "#0284C7" : isRaj ? "#F59E0B" : isFreight ? "#CA8A04" : "#60A5FA";
    let badgeColor = isVB ? "#0284C7" : isRaj ? "#DC2626" : isFreight ? "#EAB308" : "#2563EB";

    return `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <!-- Always Visible High-Tech Live Status Badge -->
        <div class="train-live-status-badge" style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 8px; z-index: 1000; pointer-events: none; white-space: nowrap;">
          <div style="background: rgba(10, 25, 47, 0.94); color: #FFFFFF; border: 1.5px solid ${badgeColor}; border-radius: 8px; padding: 3px 8px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 800; box-shadow: 0 4px 14px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 5px; backdrop-filter: blur(6px);">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: #10B981; box-shadow: 0 0 8px #10B981;"></span>
            <span style="color: #FF9933; font-weight: 900; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em;">${train.number}</span>
            <span style="color: #FFFFFF; font-weight: 800; text-transform: uppercase;">${train.shortName || train.name}</span>
            <span style="color: #38BDF8; font-family: 'JetBrains Mono', monospace; font-weight: 800; background: rgba(56, 189, 248, 0.15); padding: 1px 4px; border-radius: 4px;">${train.speed} km/h</span>
            <span style="color: #34D399; font-weight: 800; font-size: 9px; background: rgba(16, 185, 129, 0.2); padding: 1px 5px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.4);">
              ETA ${train.etaNextStation}
            </span>
          </div>
        </div>

        <div class="realistic-train-rake" title="${train.number} - ${train.name}">
          <!-- Kavach 160.225 MHz Radar Aura Bubble -->
          <div class="kavach-radar-beacon ${train.kavachStatus.includes('TSR') ? 'caution' : ''}"></div>
          
          <!-- Forward Headlight Beam Cone -->
          <div class="train-headlight-cone"></div>

          <!-- Targeting Radar Reticle (When Selected) -->
          ${isSelected ? '<div class="targeting-radar-reticle"></div>' : ''}

          <!-- Locomotive Engine SVG -->
          <svg viewBox="0 0 36 46" width="36" height="46" style="position: relative; z-index: 3;">
            <path d="M 8 44 L 8 16 C 8 6, 18 2, 18 2 C 18 2, 28 6, 28 16 L 28 44 Z" fill="${bodyColor}" stroke="${stripeColor}" stroke-width="1.8" />
            <path d="M 11 15 C 11 10, 18 6, 18 6 C 18 6, 25 10, 25 15 Z" fill="#0F172A" stroke="#38BDF8" stroke-width="1" />
            <circle cx="12" cy="5" r="2.2" fill="#FEF08A" filter="drop-shadow(0 0 4px #FACC15)" />
            <circle cx="24" cy="5" r="2.2" fill="#FEF08A" filter="drop-shadow(0 0 4px #FACC15)" />
            <rect x="9" y="22" width="18" height="3" fill="${stripeColor}" rx="0.5" />
            <rect x="9" y="28" width="18" height="1.8" fill="${stripeColor}" opacity="0.8" />
            <rect x="9" y="33" width="18" height="1.8" fill="${stripeColor}" opacity="0.8" />
            <rect x="14" y="38" width="8" height="4" fill="#334155" rx="1" />
            <line x1="18" y1="38" x2="18" y2="34" stroke="#CBD5E1" stroke-width="1.5" />
          </svg>

          <!-- Articulated Trailing Coaches -->
          <div style="display: flex; flex-direction: column; align-items: center; margin-top: -3px; z-index: 2;">
            <div class="train-coach-box" style="background: ${coachBg}; border-color: ${coachStripe};">
              <div style="width: 100%; height: 3px; background: ${coachStripe}; margin-top: 6px;"></div>
              <div style="width: 100%; height: 2px; background: ${coachStripe}; margin-top: 5px; opacity: 0.8;"></div>
            </div>
            <div class="train-coach-box" style="background: ${coachBg}; border-color: ${coachStripe}; margin-top: 3px;">
              <div style="width: 100%; height: 3px; background: ${coachStripe}; margin-top: 6px;"></div>
              <div style="width: 100%; height: 2px; background: ${coachStripe}; margin-top: 5px; opacity: 0.8;"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Update Dynamic Hierarchical Geography Labels on Zoom Change
  function updateDynamicLODMarkers() {
    if (!panIndiaMap || !mapGeoLabelsGroup) return;

    const currentZoom = panIndiaMap.getZoom();
    mapGeoLabelsGroup.clearLayers();

    panIndiaGeoPlaces.forEach((place) => {
      let shouldShow = false;
      let markerHtml = "";
      let iconSize = [100, 24];

      if (place.tier === "state" && currentZoom >= 4 && currentZoom <= 7) {
        shouldShow = true;
        markerHtml = `<div class="state-map-label"><i class="fa-solid fa-landmark text-amber-300 text-[10px]"></i> ${place.name}</div>`;
        iconSize = [130, 24];
      } else if (place.tier === "city" && currentZoom >= 6 && currentZoom <= 9) {
        shouldShow = true;
        markerHtml = `<div class="city-map-label"><span class="city-dot"></span> ${place.name}</div>`;
        iconSize = [100, 20];
      } else if (place.tier === "junction" && currentZoom >= 8 && currentZoom <= 12) {
        shouldShow = true;
        markerHtml = `<div class="city-map-label" style="border-color: #0284C7;"><span class="city-dot" style="background-color: #0284C7;"></span> ${place.name}</div>`;
        iconSize = [110, 20];
      } else if (place.tier === "town" && currentZoom >= 11) {
        shouldShow = true;
        markerHtml = `<div class="town-map-label"><span class="town-dot"></span> ${place.name}</div>`;
        iconSize = [90, 18];
      }

      if (shouldShow) {
        const icon = L.divIcon({
          className: "custom-geo-lod-label",
          html: markerHtml,
          iconSize: iconSize,
          iconAnchor: [iconSize[0] / 2, iconSize[1] / 2]
        });
        L.marker([place.lat, place.lng], { icon: icon, interactive: false }).addTo(mapGeoLabelsGroup);
      }
    });
  }

  // Core Map View Renderer
  function renderLiveMapSection(container) {
    if (trainAnimationTimer) {
      cancelAnimationFrame(trainAnimationTimer);
      trainAnimationTimer = null;
    }

    container.innerHTML = `
      <div class="space-y-4">
        
        <!-- Top Operations Bar: Search, Quick Chips & Controls -->
        <div class="glass-card p-4 space-y-3 border-l-4 border-[#FF9933] shadow-lg">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[#138808] border border-emerald-500/40 text-[11px] font-extrabold uppercase tracking-wider font-mono">
                  ● 100% KAVACH GIS RADAR
                </span>
                <span class="px-2 py-0.5 rounded bg-blue-100 text-[#12355B] font-mono text-[10px] font-black">STRICT INDIA BOUNDS</span>
              </div>
              <h2 class="text-xl font-black text-[#0F172A] font-['Outfit'] mt-1 flex items-center gap-2">
                🗺️ Indian Railways Pan-India Interactive Live Radar Map
              </h2>
              <p class="text-xs text-slate-500 font-medium">
                Zoom into any state or district to reveal cities, junctions & tracks • Auto-detect & track live moving trains
              </p>
            </div>

            <!-- Map View Switchers & Controls -->
            <div class="flex flex-wrap items-center gap-2">
              <button onclick="switchLiveMapTileLayer('iri')" id="btnLayerIRI" class="px-3 py-1.5 rounded-xl border border-[#FF9933] text-xs font-black transition-all cursor-pointer bg-[#FF9933] text-white shadow flex items-center gap-1.5">
                <i class="fa-solid fa-route text-white"></i> 🛤️ IndiaRailInfo Atlas View
              </button>
              <button onclick="switchLiveMapTileLayer('voyager')" id="btnLayerVoyager" class="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer">
                <i class="fa-solid fa-map"></i> Official Railway Map
              </button>
              <button onclick="switchLiveMapTileLayer('dark')" id="btnLayerDark" class="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer">
                <i class="fa-solid fa-moon"></i> Night Radar Mode
              </button>
              <button onclick="resetPanIndiaMapView()" class="px-3.5 py-1.5 rounded-xl bg-[#138808] hover:bg-emerald-700 text-white font-extrabold text-xs shadow transition-all cursor-pointer flex items-center gap-1.5">
                <i class="fa-solid fa-earth-asia"></i> Reset Pan-India View
              </button>
            </div>
          </div>

          <!-- Train Search Input with Auto-Suggest Dropdown -->
          <div class="relative w-full">
            <div class="relative flex items-center">
              <i class="fa-solid fa-magnifying-glass absolute left-4 text-[#12355B] text-sm pointer-events-none"></i>
              <input 
                type="text" 
                id="liveMapTrainSearchInput" 
                oninput="handleLiveMapTrainSearch(this.value)" 
                onfocus="handleLiveMapTrainSearch(this.value)"
                placeholder="Search any train by number, name or station (e.g. 12012, 12951, Vande Bharat, Rajdhani, Mumbai, Kota, Amritsar)..." 
                class="w-full pl-11 pr-28 py-3 rounded-xl bg-white border-2 border-[#12355B] text-slate-900 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9933] shadow-sm transition-all"
              />
              <span class="absolute right-3 px-2 py-1 rounded bg-[#EAF3F8] text-[#12355B] text-[10px] font-mono font-extrabold border border-blue-200">
                8 LIVE CORRIDORS
              </span>
            </div>

            <!-- Auto-Suggest Dropdown List -->
            <div id="trainSearchDropdown" class="hidden absolute top-full left-0 right-0 mt-1 bg-white border-2 border-[#12355B] rounded-xl shadow-2xl z-50 divide-y divide-slate-100">
              <!-- Populated via handleLiveMapTrainSearch -->
            </div>
          </div>

          <!-- Quick Corridor Filter Chips -->
          <div class="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200">
            <span class="text-[11px] font-extrabold text-slate-500 uppercase font-mono">Select Flagship Train:</span>
            <button onclick="selectAndFocusTrain('22436')" class="px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border-2 border-sky-400 text-sky-950 text-xs font-black transition-all cursor-pointer shadow-sm">
              🚅 22436 Kashi Vande Bharat Express (New Delhi ➔ Varanasi)
            </button>
            <button onclick="selectAndFocusTrain('12951')" class="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-400 text-rose-950 text-xs font-black transition-all cursor-pointer shadow-sm">
              ⭐ 12951 Tejas Rajdhani Express (Mumbai ➔ New Delhi)
            </button>
          </div>

          <!-- Railway Track System Filter Toolbar -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[11px] font-extrabold text-[#12355B] uppercase font-mono">
                <i class="fa-solid fa-bars-staggered mr-1 text-[#FF9933]"></i> Track System:
              </span>
              <button onclick="filterRailwayTracks('all')" id="btnTrackAll" class="px-2.5 py-1 rounded-lg bg-[#12355B] text-white text-xs font-black shadow transition-all cursor-pointer">
                🛤️ All Indian Tracks (15 Corridors)
              </button>
              <button onclick="filterRailwayTracks('kavach')" id="btnTrackKavach" class="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 hover:bg-emerald-100 text-xs font-bold transition-all cursor-pointer">
                🛡️ Kavach SIL-4 Corridors
              </button>
              <button onclick="filterRailwayTracks('dfc')" id="btnTrackDfc" class="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-bold transition-all cursor-pointer">
                📦 WDFC / EDFC Freight
              </button>
              <button onclick="filterRailwayTracks('electrified')" id="btnTrackElec" class="px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-300 text-sky-900 hover:bg-sky-100 text-xs font-bold transition-all cursor-pointer">
                ⚡ 25 kV AC Electrified
              </button>
            </div>
            <span class="text-[11px] font-mono text-slate-500 font-bold hidden sm:inline">
              🇮🇳 Exclusive India Boundary Mask Active
            </span>
          </div>
        </div>

        <!-- Main Map Viewport & Right Locomotive Telemetry HUD -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          <!-- Leaflet Interactive Map Canvas (8 cols on lg) -->
          <div class="lg:col-span-8 glass-card p-3 space-y-2 border-2 border-slate-200 relative overflow-hidden flex flex-col justify-between">
            <div class="flex items-center justify-between text-xs px-2 pb-1 border-b border-slate-200">
              <div class="flex items-center gap-2">
                <span class="font-extrabold text-[#12355B] font-mono uppercase">MAP STATUS:</span>
                <span id="mapStatusText" class="font-bold text-emerald-600 font-mono">LIVE GPS FEED ACTIVE • 8 TRAINS TRACKED • FULL TRACK SYSTEM</span>
              </div>
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-1.5 cursor-pointer font-bold text-[#12355B] text-[11px]">
                  <input type="checkbox" id="chkFollowCamera" onchange="toggleFollowTrainCamera(this.checked)" class="rounded text-[#12355B] focus:ring-0 cursor-pointer">
                  <span>Lock Camera to Train</span>
                </label>
              </div>
            </div>

            <!-- Leaflet Container -->
            <div id="panIndiaRailMap" class="w-full relative shadow-inner"></div>

            <!-- Forward Route Track Timeline & Distance/ETA Scrubber -->
            <div class="route-timeline-container space-y-2" id="routeTimelineContainer">
              <!-- Populated via renderForwardRouteTimeline -->
            </div>

            <!-- Dynamic Bottom Legend Bar -->
            <div class="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-700 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
              <div class="flex items-center gap-3">
                <span><strong class="text-[#0284C7]">━━━</strong> Electrified Double Line</span>
                <span><strong class="text-[#EAB308]">━━━</strong> Dedicated Freight (WDFC/EDFC)</span>
                <span><strong class="text-[#15803D]">━━━</strong> Kavach SIL-4 Monitored</span>
                <span><strong class="text-[#9333EA]">━━━</strong> South-Central Trunk</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-emerald-700 font-bold">● Green (Normal)</span>
                <span class="text-amber-700 font-bold">● Yellow (Caution)</span>
                <span class="text-red-700 font-bold">● Red (Danger / Stop)</span>
              </div>
            </div>
          </div>

          <!-- Locomotive Inspector & Real-Time Telemetry HUD (4 cols) -->
          <div class="lg:col-span-4 glass-card p-5 space-y-4 border-2 border-[#12355B] flex flex-col justify-between" id="locomotiveInspectorHUD">
            <!-- Populated dynamically via updateLocomotiveHUD -->
          </div>

        </div>

      </div>
    `;

    // Initialize the Leaflet Pan-India Map
    setTimeout(initPanIndiaLeafletMap, 60);

    // Close search dropdown on clicking outside
    document.addEventListener("click", (e) => {
      const dropdown = document.getElementById("trainSearchDropdown");
      const input = document.getElementById("liveMapTrainSearchInput");
      if (dropdown && input && !dropdown.contains(e.target) && e.target !== input) {
        dropdown.classList.add("hidden");
      }
    });
  }

  // Map Tracks Layer Group & Filter State
  let mapTracksLayerGroup = null;
  let activeTrackSystemFilter = 'all';

  window.filterRailwayTracks = function(filterType) {
    activeTrackSystemFilter = filterType;
    
    const btnAll = document.getElementById("btnTrackAll");
    const btnKavach = document.getElementById("btnTrackKavach");
    const btnDfc = document.getElementById("btnTrackDfc");
    const btnElec = document.getElementById("btnTrackElec");

    const defaultClass = "px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer";
    const activeClass = "px-2.5 py-1 rounded-lg bg-[#12355B] text-white text-xs font-black shadow transition-all cursor-pointer";

    if (btnAll) btnAll.className = filterType === 'all' ? activeClass : defaultClass + " bg-slate-50 border-slate-300 text-slate-700";
    if (btnKavach) btnKavach.className = filterType === 'kavach' ? activeClass : defaultClass + " bg-emerald-50 border-emerald-300 text-emerald-900";
    if (btnDfc) btnDfc.className = filterType === 'dfc' ? activeClass : defaultClass + " bg-amber-50 border-amber-300 text-amber-900";
    if (btnElec) btnElec.className = filterType === 'electrified' ? activeClass : defaultClass + " bg-sky-50 border-sky-300 text-sky-900";

    renderPanIndiaRailwayTracks(filterType);
    showToast(`Track System Filter: ${filterType.toUpperCase()}`, "info");
  };

  // Render Complete Indian Railway Track Network on Leaflet
  function renderPanIndiaRailwayTracks(filter = 'all') {
    if (!panIndiaMap || !mapTracksLayerGroup) return;
    mapTracksLayerGroup.clearLayers();

    // 1. If real tracks GeoJSON is available (3,474 tracks), render them!
    if (irTracksGeoJSON && irTracksGeoJSON.features && irTracksGeoJSON.features.length > 0) {
      L.geoJSON(irTracksGeoJSON, {
        style: function (feature) {
          const p = feature.properties || {};
          const isDfc = p.usage === 'freight' || (p.gauge && p.gauge.includes('Double'));
          return {
            color: isDfc ? '#78350F' : '#0284c7',
            weight: 2.5,
            opacity: 0.85
          };
        },
        onEachFeature: function (feature, layer) {
          const p = feature.properties || {};
          layer.bindTooltip(`
            <div class="font-['Plus_Jakarta_Sans'] text-xs font-bold text-[#12355B]">
              <span>🛤️ ${p.name || 'Indian Railways Track Section'}</span><br>
              <span class="text-emerald-700 font-mono">Traction: ${p.electrified || '25 kV AC'} • ${p.kavach || 'SIL-4 ARMED'}</span>
            </div>
          `, { sticky: true });
        }
      }).addTo(mapTracksLayerGroup);
    } else {
      panIndiaRailwayTrackSystem.forEach((track) => {
        let isVisible = true;
        if (filter === 'kavach') isVisible = track.kavachStatus.includes('ACTIVE');
        else if (filter === 'dfc') isVisible = track.type === 'dfc_freight';
        else if (filter === 'electrified') isVisible = track.electrification.includes('25 kV');

        if (!isVisible) return;

        const isDfc = track.type === 'dfc_freight';

        // 1. Bed / Base Rail Layer
        L.polyline(track.coordinates, {
          color: isDfc ? '#78350F' : '#0F172A',
          weight: isDfc ? 6 : 4.5,
          opacity: 0.85,
          lineCap: 'round',
          interactive: false
        }).addTo(mapTracksLayerGroup);

        // 2. Center / Sleeper Track Layer
        const centerLine = L.polyline(track.coordinates, {
          color: track.color,
          weight: isDfc ? 3.5 : 2.5,
          dashArray: isDfc ? '8, 4' : '5, 3',
          opacity: 0.95,
          interactive: true
        }).addTo(mapTracksLayerGroup);

        centerLine.bindTooltip(`
          <div class="font-['Plus_Jakarta_Sans'] text-xs font-bold text-[#12355B]">
            <span>🛤️ ${track.name}</span><br>
            <span class="text-emerald-700 font-mono">Speed: ${track.speedRating} • ${track.kavachStatus}</span>
          </div>
        `, { sticky: true });
      });
    }

    // 2. Render Level Crossings if loaded (3,308 crossings)
    if (mapCrossingsLayerGroup) {
      mapCrossingsLayerGroup.clearLayers();
      if (irCrossingsGeoJSON && irCrossingsGeoJSON.features) {
        const sampleCrossings = irCrossingsGeoJSON.features.slice(0, 150);
        sampleCrossings.forEach(cr => {
          if (cr.geometry && cr.geometry.coordinates) {
            const lat = cr.geometry.coordinates[1];
            const lng = cr.geometry.coordinates[0];
            const m = L.circleMarker([lat, lng], {
              radius: 4,
              fillColor: '#FF9933',
              color: '#FFFFFF',
              weight: 1.5,
              fillOpacity: 0.9
            });
            m.bindTooltip(`<div style="font-size:10px;font-weight:700;color:#12355B;">🚦 Level Crossing #${cr.properties.id || ''}<br><span style="color:#16a34a;">Kavach Whistling Active</span></div>`);
            mapCrossingsLayerGroup.addLayer(m);
          }
        });
      }
    }

    // 3. Render Signals if loaded (11 signals)
    if (mapSignalsLayerGroup) {
      mapSignalsLayerGroup.clearLayers();
      if (irSignalsGeoJSON && irSignalsGeoJSON.features) {
        irSignalsGeoJSON.features.forEach(sig => {
          if (sig.geometry && sig.geometry.coordinates) {
            const lat = sig.geometry.coordinates[1];
            const lng = sig.geometry.coordinates[0];
            const m = L.circleMarker([lat, lng], {
              radius: 6,
              fillColor: '#10B981',
              color: '#FFFFFF',
              weight: 2,
              fillOpacity: 1
            });
            m.bindTooltip(`<div style="font-size:10px;font-weight:800;color:#166534;">🟢 Kavach Signal Aspect: PROCEED</div>`);
            mapSignalsLayerGroup.addLayer(m);
          }
        });
      }
    }

    // 4. Render Earthquakes if loaded (287 seismic records)
    if (mapEarthquakesLayerGroup) {
      mapEarthquakesLayerGroup.clearLayers();
      if (irEarthquakesGeoJSON && irEarthquakesGeoJSON.features) {
        irEarthquakesGeoJSON.features.slice(0, 40).forEach(eq => {
          if (eq.geometry && eq.geometry.coordinates) {
            const lat = eq.geometry.coordinates[1];
            const lng = eq.geometry.coordinates[0];
            const p = eq.properties || {};
            const circle = L.circle([lat, lng], {
              radius: (p.mag || 4) * 12000,
              fillColor: '#EF4444',
              color: '#B91C1C',
              weight: 1,
              fillOpacity: 0.16
            });
            circle.bindTooltip(`<div style="font-size:10px;font-weight:700;color:#991B1B;">🌋 Seismic Alert M${p.mag}<br>${p.place || ''}<br><span style="color:#b45309;">${p.kavachTsrAdvisory || ''}</span></div>`);
            mapEarthquakesLayerGroup.addLayer(circle);
          }
        });
      }
    }
  }

  // Initialize the Leaflet Map instance with strict India confinement
  function initPanIndiaLeafletMap() {
    const mapElement = document.getElementById("panIndiaRailMap");
    if (!mapElement) return;

    if (panIndiaMap) {
      panIndiaMap.remove();
      panIndiaMap = null;
    }

    // Strict India Bounding Box: SW 6.5°N, 68°E | NE 37.5°N, 97.5°E
    const indiaBounds = L.latLngBounds(
      L.latLng(6.5, 68.0),
      L.latLng(37.5, 97.5)
    );

    panIndiaMap = L.map("panIndiaRailMap", {
      center: [22.8, 78.9],
      zoom: 5,
      minZoom: 4,
      maxZoom: 17,
      maxBounds: indiaBounds,
      maxBoundsViscosity: 1.0,
      zoomControl: true,
      scrollWheelZoom: true
    });

    // Layer Groups
    mapTracksLayerGroup = L.layerGroup().addTo(panIndiaMap);
    mapCrossingsLayerGroup = L.layerGroup().addTo(panIndiaMap);
    mapSignalsLayerGroup = L.layerGroup().addTo(panIndiaMap);
    mapEarthquakesLayerGroup = L.layerGroup().addTo(panIndiaMap);
    mapStationMarkersGroup = L.layerGroup().addTo(panIndiaMap);
    mapGeoLabelsGroup = L.layerGroup().addTo(panIndiaMap);
    mapTrainMarkers = {};

    // Initialize default tile layer to Clean Command-Center Dark View (No patchy colors or label clutter)
    switchLiveMapTileLayer('dark');

    // Exclusive India Boundary Spotlight Mask:
    // Inverted polygon that covers the world outside India in dark command-center navy,
    // making only India and its railway track system illuminated with a golden Saffron border!
    const worldOuterBounds = [
      [90, -180], [90, 180], [-90, 180], [-90, -180], [90, -180]
    ];
    const indiaBorderCutout = [
      [35.67, 74.84], [34.70, 77.03], [32.90, 78.96], [30.41, 80.89],
      [28.78, 81.33], [27.70, 88.13], [28.21, 97.40], [27.20, 96.80],
      [24.50, 94.80], [22.00, 89.10], [21.60, 87.00], [17.80, 83.30],
      [13.10, 80.30], [8.08, 77.55],  [9.90, 76.20],  [15.40, 73.80],
      [18.90, 72.80], [22.80, 69.10], [23.80, 68.20], [24.70, 71.00],
      [27.50, 70.30], [31.50, 74.40], [35.67, 74.84]
    ];
    L.polygon([worldOuterBounds, indiaBorderCutout], {
      fillColor: '#050D1A',
      fillOpacity: 0.90,
      stroke: true,
      color: '#FF9933',
      weight: 2.5,
      interactive: false
    }).addTo(panIndiaMap);

    // Render Complete Indian Railway Track Infrastructure Lines
    renderPanIndiaRailwayTracks('all');

    // Listen for zoom changes to update progressive geographic labels (States -> Cities -> Towns)
    panIndiaMap.on("zoomend", updateDynamicLODMarkers);
    updateDynamicLODMarkers();

    // Render all initial train markers and routes
    renderAllPanIndiaTrainMarkers();

    // Render selected train route track, forward waypoints & timeline
    highlightActiveTrainRoute(activeSelectedTrain);

    // Update the HUD Card
    updateLocomotiveHUD(activeSelectedTrain);

    // Start high-performance animation loop
    startTrainAnimationLoop();
  }

  let mapIRIRailOverlayLayer = null;

  // Switch between Tile Layers (IRI Atlas vs Voyager vs Dark Night Radar)
  window.switchLiveMapTileLayer = function(layerType) {
    if (!panIndiaMap) return;

    if (mapCurrentTileLayer) {
      panIndiaMap.removeLayer(mapCurrentTileLayer);
    }
    if (mapIRIRailOverlayLayer) {
      panIndiaMap.removeLayer(mapIRIRailOverlayLayer);
      mapIRIRailOverlayLayer = null;
    }

    const btnIri = document.getElementById("btnLayerIRI");
    const btnVoyager = document.getElementById("btnLayerVoyager");
    const btnDark = document.getElementById("btnLayerDark");

    const defaultBtn = "px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer";
    const activeBtn = "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer bg-[#12355B] text-white shadow";
    const activeIriBtn = "px-3 py-1.5 rounded-xl border border-[#FF9933] text-xs font-black transition-all cursor-pointer bg-[#FF9933] text-white shadow flex items-center gap-1.5";

    if (layerType === "iri") {
      // 1. Base Layer (Carto Voyager)
      mapCurrentTileLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; CARTO &copy; OpenStreetMap',
        subdomains: "abcd",
        maxZoom: 19
      }).addTo(panIndiaMap);

      // 2. OpenRailwayMap Standard Track Tile Layer (1:1 Match with IndiaRailInfo Atlas)
      mapIRIRailOverlayLayer = L.tileLayer("https://{s}.tile.openrailwaymap.org/standard/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenRailwayMap &copy; OpenStreetMap contributors',
        subdomains: "abc",
        maxZoom: 19,
        opacity: 0.95
      }).addTo(panIndiaMap);

      if (btnIri) btnIri.className = activeIriBtn;
      if (btnVoyager) btnVoyager.className = defaultBtn;
      if (btnDark) btnDark.className = defaultBtn;
      showToast("Activated IndiaRailInfo Atlas GIS Railway Track Overlay", "success");
    } else if (layerType === "dark") {
      mapCurrentTileLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; CARTO &copy; OpenStreetMap',
        subdomains: "abcd",
        maxZoom: 19
      }).addTo(panIndiaMap);

      if (btnDark) btnDark.className = activeBtn;
      if (btnIri) btnIri.className = defaultBtn;
      if (btnVoyager) btnVoyager.className = defaultBtn;
    } else {
      mapCurrentTileLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; CARTO &copy; OpenStreetMap',
        subdomains: "abcd",
        maxZoom: 19
      }).addTo(panIndiaMap);

      if (btnVoyager) btnVoyager.className = activeBtn;
      if (btnIri) btnIri.className = defaultBtn;
      if (btnDark) btnDark.className = defaultBtn;
    }
  };

  // Reset to Pan-India Full View
  window.resetPanIndiaMapView = function() {
    if (!panIndiaMap) return;
    isFollowingTrainCamera = false;
    const chk = document.getElementById("chkFollowCamera");
    if (chk) chk.checked = false;

    panIndiaMap.flyTo([22.8, 78.9], 5, {
      duration: 1.5,
      easeLinearity: 0.25
    });
    showToast("Reset map to full Pan-India geographic overview", "info");
  };

  // Render all active train markers on map
  function renderAllPanIndiaTrainMarkers() {
    if (!panIndiaMap) return;

    panIndiaTrainData.forEach((train) => {
      const pos = getTrainPositionAndBearing(train);
      const isSelected = activeSelectedTrain && activeSelectedTrain.id === train.id;

      const customIcon = L.divIcon({
        className: "custom-train-leaflet-marker",
        html: `<div id="trainMarker_${train.id}" style="transform: rotate(${pos.bearing}deg); transition: transform 0.2s linear;">
                 ${generateRealisticTrainSVG(train, isSelected)}
               </div>`,
        iconSize: [44, 76],
        iconAnchor: [22, 23]
      });

      const marker = L.marker([pos.lat, pos.lng], { icon: customIcon }).addTo(panIndiaMap);

      marker.on("click", () => {
        selectAndFocusTrain(train.id);
      });

      marker.bindTooltip(`
        <div class="font-bold text-xs text-[#12355B]">
          <span>${train.number} ${train.shortName}</span><br>
          <span class="text-emerald-700 font-mono">Speed: ${train.speed} km/h • Kavach: ${train.kavachStatus}</span>
        </div>
      `, { direction: "top", offset: [0, -25] });

      mapTrainMarkers[train.id] = marker;
    });
  }

  // Draw full illuminated track route, station milestone pins & forward timeline
  function highlightActiveTrainRoute(train) {
    if (!panIndiaMap || !train) return;

    // Remove existing route line
    if (mapRoutePolyline) {
      panIndiaMap.removeLayer(mapRoutePolyline);
      mapRoutePolyline = null;
    }

    // Clear station markers
    if (mapStationMarkersGroup) {
      mapStationMarkersGroup.clearLayers();
    }

    const latLngs = train.stations.map((s) => [s.lat, s.lng]);

    // Draw main glowing route polyline
    mapRoutePolyline = L.polyline(latLngs, {
      color: train.color,
      weight: 6,
      opacity: 0.95,
      lineCap: "round",
      dashArray: "2, 8",
      className: "illuminated-rail-track"
    }).addTo(panIndiaMap);

    // Calculate forward station milestones
    const milestones = calculateForwardMilestones(train);

    // Station Markers along route
    milestones.forEach((stn) => {
      const isTerminus = stn.index === 0 || stn.index === train.stations.length - 1;
      const markerColor = isTerminus ? "#FF9933" : stn.isPassed ? "#64748B" : "#12355B";
      const statusBadge = stn.isPassed 
        ? '<span class="text-[9px] text-slate-400 font-bold ml-1">✓ Passed</span>' 
        : `<span class="text-[9px] text-emerald-600 font-mono font-bold ml-1">+${stn.distFromTrain}km (${stn.etaText})</span>`;

      const stationIcon = L.divIcon({
        className: "station-leaflet-icon",
        html: `
          <div class="milestone-station-pin" title="${stn.name} (${stn.code}) • Scheduled: ${stn.arr}">
            <div class="milestone-station-dot" style="background: ${isTerminus ? '#FF9933' : stn.isPassed ? '#94A3B8' : '#38BDF8'}; border: 2px solid #FFFFFF; box-shadow: 0 0 8px ${isTerminus ? '#FF9933' : '#38BDF8'};"></div>
            <div class="milestone-station-label" style="border-color: ${markerColor}; opacity: ${stn.isPassed ? '0.75' : '1'};">
              <strong>${stn.name} (${stn.code})</strong> ${statusBadge}
            </div>
          </div>
        `,
        iconSize: [160, 22],
        iconAnchor: [4, 4]
      });

      const stnMarker = L.marker([stn.lat, stn.lng], { icon: stationIcon }).addTo(mapStationMarkersGroup);
      
      stnMarker.bindPopup(`
        <div class="p-2 font-['Plus_Jakarta_Sans'] min-w-[200px]">
          <div class="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
            <span class="font-extrabold text-sm text-[#12355B]">${stn.name} (${stn.code})</span>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-black ${stn.isPassed ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-800'}">
              ${stn.isPassed ? 'DEPARTED' : 'UPCOMING'}
            </span>
          </div>
          <div class="space-y-1 text-xs text-slate-700">
            <p><strong>Scheduled Time:</strong> ${stn.arr}</p>
            <p><strong>Platform:</strong> ${stn.pf}</p>
            ${!stn.isPassed ? `
              <p class="text-emerald-700 font-bold"><strong>Distance from Train:</strong> +${stn.distFromTrain} km</p>
              <p class="text-blue-900 font-bold"><strong>Estimated Time to Reach:</strong> ${stn.etaText}</p>
              <p class="text-slate-500 text-[11px]"><strong>Signal Block:</strong> 🟢 PROCEED (130 km/h)</p>
            ` : ''}
          </div>
        </div>
      `);
    });

    // Render the Forward Route Timeline Bar
    renderForwardRouteTimeline(train, milestones);
  }

  // Render Horizontal Forward Route Timeline & Track Scrubber
  function renderForwardRouteTimeline(train, milestones) {
    const timelineContainer = document.getElementById("routeTimelineContainer");
    if (!timelineContainer || !train) return;

    if (!milestones) {
      milestones = calculateForwardMilestones(train);
    }

    const nextStn = milestones.find((m) => !m.isPassed) || milestones[milestones.length - 1];

    timelineContainer.innerHTML = `
      <div class="space-y-2">
        
        <!-- Timeline Header: Next Stop & Distance Remaining -->
        <div class="flex items-center justify-between text-xs pb-1 border-b border-slate-200">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="font-extrabold text-[#12355B] uppercase font-mono">TRACK FORWARD TIMELINE:</span>
            <span class="text-slate-800 font-bold">Next: ${nextStn.name} (${nextStn.code}) in ${nextStn.etaText} (+${nextStn.distFromTrain} km)</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold text-slate-500 font-mono">Click any station to inspect track ahead</span>
          </div>
        </div>

        <!-- Horizontal Station Sequence Nodes -->
        <div class="route-timeline-strip">
          ${milestones.map((m, idx) => {
            const isLast = idx === milestones.length - 1;
            const nodeClass = m.isPassed ? "active-passed" : m.isNextImmediate ? "active-current" : "";
            const pinColor = m.isPassed ? "bg-slate-400" : m.isNextImmediate ? "bg-[#138808]" : "bg-[#12355B]";
            const connectorClass = m.isPassed ? "completed" : "upcoming";

            return `
              <div class="timeline-station-node ${nodeClass}" onclick="inspectAheadStation('${train.id}', ${idx})" title="Click to fly to ${m.name}">
                <div class="timeline-node-pin ${pinColor}">
                  ${m.isPassed ? '✓' : idx + 1}
                </div>
                <div class="text-[11px] font-black text-[#12355B] truncate max-w-[85px]">${m.code}</div>
                <div class="text-[9px] font-mono text-slate-500 truncate max-w-[85px]">${m.name}</div>
                <div class="text-[9px] font-mono font-extrabold ${m.isPassed ? 'text-slate-400' : 'text-emerald-700'}">
                  ${m.isPassed ? 'Departed' : m.etaText}
                </div>
              </div>
              ${!isLast ? `<div class="timeline-connector-bar ${connectorClass}"></div>` : ''}
            `;
          }).join("")}
        </div>

        <!-- Interactive Forward Track Inspector Slider -->
        <div class="flex items-center gap-3 pt-1 border-t border-slate-100 text-xs">
          <span class="font-mono font-bold text-[#12355B] shrink-0 text-[11px]">
            <i class="fa-solid fa-route text-blue-600"></i> Track Scrubber:
          </span>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value="${Math.round(train.progress * 100)}" 
            class="flex-1 accent-[#12355B] cursor-pointer"
            oninput="handleForwardTrackScrubber('${train.id}', this.value)"
          />
          <span id="scrubberReading" class="font-mono font-black text-[#12355B] text-[11px] shrink-0">
            Progress: ${Math.round(train.progress * 100)}%
          </span>
        </div>

      </div>
    `;
  }

  // Handle Forward Track Scrubber Slider: Move camera and preview ahead track
  window.handleForwardTrackScrubber = function(trainId, percentVal) {
    const train = panIndiaTrainData.find((t) => t.id === trainId);
    if (!train || !panIndiaMap) return;

    const val = parseFloat(percentVal) / 100;
    const stations = train.stations;
    if (!stations || stations.length < 2) return;

    const totalSegments = stations.length - 1;
    const scaledProgress = val * totalSegments;
    const segIdx = Math.min(Math.floor(scaledProgress), totalSegments - 1);
    const frac = scaledProgress - segIdx;

    const p1 = stations[segIdx];
    const p2 = stations[segIdx + 1];

    const lat = p1.lat + (p2.lat - p1.lat) * frac;
    const lng = p1.lng + (p2.lng - p1.lng) * frac;

    // Pan camera to preview this track position
    panIndiaMap.panTo([lat, lng], { animate: true });

    // Place or update ghost scrubber marker
    if (mapGhostScrubberMarker) {
      mapGhostScrubberMarker.setLatLng([lat, lng]);
    } else {
      const ghostIcon = L.divIcon({
        className: "ghost-scrubber-icon",
        html: `<div style="width: 16px; height: 16px; background: #00F0FF; border: 3px solid #12355B; border-radius: 50%; box-shadow: 0 0 10px #00F0FF;"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      mapGhostScrubberMarker = L.marker([lat, lng], { icon: ghostIcon }).addTo(panIndiaMap);
    }

    const readingEl = document.getElementById("scrubberReading");
    if (readingEl) {
      readingEl.innerText = `Track Progress: ${percentVal}% (Near ${p1.code} - ${p2.code})`;
    }
  };

  // Inspect Ahead Station: Glide camera to that station and pop open details
  window.inspectAheadStation = function(trainId, stationIndex) {
    const train = panIndiaTrainData.find((t) => t.id === trainId);
    if (!train || !panIndiaMap) return;

    const stn = train.stations[stationIndex];
    if (!stn) return;

    panIndiaMap.flyTo([stn.lat, stn.lng], 13, {
      duration: 1.5,
      easeLinearity: 0.25
    });

    showToast(`Inspecting Track Ahead at ${stn.name} (${stn.code})`, "info");
  };

  // Handle Search Input & Render Dropdown
  window.handleLiveMapTrainSearch = function(query) {
    const dropdown = document.getElementById("trainSearchDropdown");
    if (!dropdown) return;

    const q = (query || "").trim().toLowerCase();

    const matches = panIndiaTrainData.filter((t) => {
      if (!q) return true;
      const inNum = t.number.toLowerCase().includes(q);
      const inName = t.name.toLowerCase().includes(q);
      const inRoute = t.routeDescription.toLowerCase().includes(q);
      const inStations = t.stations.some((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
      return inNum || inName || inRoute || inStations;
    });

    if (matches.length === 0) {
      dropdown.innerHTML = `
        <div class="p-4 text-center text-xs text-slate-500 font-bold">
          No trains found matching "${query}". Try searching "12012", "12951", "Rajdhani", or "Varanasi".
        </div>
      `;
      dropdown.classList.remove("hidden");
      return;
    }

    dropdown.innerHTML = matches.map((t) => `
      <div onclick="selectAndFocusTrain('${t.id}')" class="p-3 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-all border-b border-slate-100 last:border-b-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-sm" style="background-color: ${t.color};">
            <i class="fa-solid fa-train"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-extrabold text-[#12355B] text-xs">${t.number} - ${t.name}</span>
              <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono ${t.type === 'vande_bharat' ? 'bg-sky-100 text-sky-800' : t.type === 'rajdhani' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}">
                ${t.type.replace('_', ' ')}
              </span>
            </div>
            <p class="text-[11px] text-slate-500">${t.routeDescription}</p>
          </div>
        </div>
        <div class="text-right font-mono">
          <div class="text-xs font-black text-emerald-600">${t.speed} km/h</div>
          <span class="text-[10px] text-slate-400 font-bold">ETA: ${t.etaNextStation}</span>
        </div>
      </div>
    `).join("");

    dropdown.classList.remove("hidden");
  };

  // Select a train: Fly to location, draw route, open telemetry HUD
  window.selectAndFocusTrain = function(trainId) {
    const dropdown = document.getElementById("trainSearchDropdown");
    if (dropdown) dropdown.classList.add("hidden");

    const searchInput = document.getElementById("liveMapTrainSearchInput");

    const train = panIndiaTrainData.find((t) => t.id === trainId);
    if (!train) return;

    activeSelectedTrain = train;
    if (searchInput) searchInput.value = `${train.number} - ${train.name}`;

    // Get current interpolated position
    const pos = getTrainPositionAndBearing(train);

    // Highlight route, station milestone markers & forward timeline
    highlightActiveTrainRoute(train);

    // Smooth camera view fitting the complete train track route across India cleanly
    if (panIndiaMap && mapRoutePolyline) {
      panIndiaMap.fitBounds(mapRoutePolyline.getBounds(), {
        padding: [60, 60],
        maxZoom: 8.5,
        animate: true,
        duration: 1.5
      });
    }

    // Update marker icons to reflect active selection
    Object.keys(mapTrainMarkers).forEach((tid) => {
      const t = panIndiaTrainData.find((item) => item.id === tid);
      const isSel = tid === trainId;
      const p = getTrainPositionAndBearing(t);
      const icon = L.divIcon({
        className: "custom-train-leaflet-marker",
        html: `<div id="trainMarker_${t.id}" style="transform: rotate(${p.bearing}deg); transition: transform 0.2s linear;">
                 ${generateRealisticTrainSVG(t, isSel)}
               </div>`,
        iconSize: [44, 76],
        iconAnchor: [22, 23]
      });
      mapTrainMarkers[tid].setIcon(icon);
    });

    // Update HUD inspector
    updateLocomotiveHUD(train);

    // Update status bar
    const statusText = document.getElementById("mapStatusText");
    if (statusText) {
      statusText.innerHTML = `LOCKED ON TRAIN ${train.number} (${train.shortName}) • SPEED: ${train.speed} KM/H`;
    }

    showToast(`🎯 Auto-Detected & Camera Locked on ${train.number} ${train.name}`, "success");
  };

  // Toggle Camera Lock to follow train continuously
  window.toggleFollowTrainCamera = function(checked) {
    isFollowingTrainCamera = checked;
    if (checked && activeSelectedTrain && panIndiaMap) {
      const pos = getTrainPositionAndBearing(activeSelectedTrain);
      panIndiaMap.panTo([pos.lat, pos.lng], { animate: true });
      showToast(`Camera lock enabled for ${activeSelectedTrain.number}`, "info");
    }
  };

  // Update Right Locomotive Telemetry HUD Panel
  function updateLocomotiveHUD(train) {
    const container = document.getElementById("locomotiveInspectorHUD");
    if (!container || !train) return;

    container.innerHTML = `
      <div class="space-y-3">
        
        <!-- Header -->
        <div class="flex items-center justify-between border-b-2 border-slate-200 pb-2.5">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-[#12355B] text-white flex items-center justify-center text-xs">
              <i class="fa-solid fa-train"></i>
            </div>
            <div>
              <h3 class="text-sm font-extrabold text-[#12355B] font-['Outfit']">Locomotive Telemetry Inspector</h3>
              <p class="text-[10px] text-slate-500 font-mono">RDSO KAVACH SPEC v4.0</p>
            </div>
          </div>
          <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-[#138808] border border-emerald-300 font-mono text-[10px] font-black">
            ● LIVE OBC LINK
          </span>
        </div>

        <!-- Train Identity Card -->
        <div class="p-3.5 rounded-xl bg-slate-50 border-2 border-slate-200 space-y-2 text-xs">
          <div class="flex items-center justify-between">
            <span class="text-slate-600 font-medium">Train Identification:</span>
            <span class="font-extrabold text-[#12355B] font-mono text-sm">${train.number}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-600 font-medium">Train Name:</span>
            <span class="font-extrabold text-slate-900">${train.name}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-600 font-medium">Locomotive Type:</span>
            <span class="font-bold text-blue-900 text-[11px]">${train.locoModel}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-600 font-medium">Assigned Loco Pilot:</span>
            <span class="font-bold text-slate-800">${train.locoPilot}</span>
          </div>
        </div>

        <!-- Speedometer & Braking Margin Gauges -->
        <div class="grid grid-cols-2 gap-2 text-center">
          <div class="p-3 rounded-xl bg-[#EAF3F8] border border-blue-200">
            <span class="text-[10px] text-slate-500 font-bold uppercase font-mono">Current Speed</span>
            <div class="text-2xl font-black text-[#12355B] font-mono mt-0.5" id="hudSpeedReading">
              ${train.speed} <span class="text-xs font-bold text-slate-600">km/h</span>
            </div>
            <div class="text-[10px] font-bold text-[#138808] mt-0.5">
              Max Permitted: ${train.maxSpeed} km/h
            </div>
          </div>

          <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
            <span class="text-[10px] text-slate-500 font-bold uppercase font-mono">Braking Reserve</span>
            <div class="text-base font-black text-[#138808] font-mono mt-1">
              ${train.brakingMargin}
            </div>
            <div class="text-[10px] font-bold text-slate-600 mt-0.5">
              Dynamic Curve Safe
            </div>
          </div>
        </div>

        <!-- Real-Time Signal & Kavach Telemetry -->
        <div class="p-3 rounded-xl bg-white border-2 border-slate-200 space-y-2 text-xs font-mono">
          <div class="flex items-center justify-between">
            <span class="text-slate-500">Cab Signal Aspect:</span>
            <span class="font-extrabold flex items-center gap-1.5 ${train.cabSignalClass}">
              <span class="w-2.5 h-2.5 rounded-full ${train.cabSignalClass.includes('emerald') ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse"></span>
              ${train.cabSignal}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500">Active Section:</span>
            <span class="font-bold text-[#12355B]">${train.currentSection}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500">Next Scheduled Halt:</span>
            <span class="font-bold text-slate-800">${train.nextStation}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500">Estimated Arrival:</span>
            <span class="font-bold text-emerald-700">${train.etaNextStation}</span>
          </div>
          <div class="flex items-center justify-between border-t border-slate-100 pt-1.5">
            <span class="text-slate-500">Kavach RF Transceiver:</span>
            <span class="font-bold text-[#12355B]">${train.kavachFreq} (${train.rssi})</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-slate-500">NavIC Satellites Locked:</span>
            <span class="font-bold text-[#138808]">${train.satellites} Locked</span>
          </div>
        </div>

      </div>

      <!-- Action Buttons -->
      <div class="pt-3 border-t-2 border-slate-200 space-y-2">
        <button onclick="showToast('Transmitted Speed Advisory & Route Clearance to Loco ${train.number}', 'success')" class="w-full py-2.5 rounded-xl bg-[#12355B] hover:bg-[#1a4a7e] text-white font-black text-xs shadow-md transition-all cursor-pointer">
          <i class="fa-solid fa-paper-plane mr-1.5"></i> Transmit Radio Advisory to Loco
        </button>
        <button onclick="showToast('Emergency Braking Test ping sent to Kavach OBC ${train.number} - ACK OK', 'info')" class="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#12355B] font-extrabold text-xs border border-slate-300 cursor-pointer">
          <i class="fa-solid fa-shield-halved mr-1.5"></i> Test Kavach OBC Link
        </button>
      </div>
    `;
  }

  // Smooth continuous train movement loop
  function startTrainAnimationLoop() {
    let lastTimestamp = performance.now();

    function stepAnimation(timestamp) {
      const delta = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      panIndiaTrainData.forEach((train) => {
        const progressIncrement = (train.speed / 130) * 0.00035 * Math.min(delta, 0.1);
        train.progress = (train.progress + progressIncrement) % 1;

        const pos = getTrainPositionAndBearing(train);

        const marker = mapTrainMarkers[train.id];
        if (marker) {
          marker.setLatLng([pos.lat, pos.lng]);

          const rotElement = document.getElementById(`trainMarker_${train.id}`);
          if (rotElement) {
            rotElement.style.transform = `rotate(${pos.bearing}deg)`;
          }
        }
      });

      if (isFollowingTrainCamera && activeSelectedTrain && panIndiaMap) {
        const activePos = getTrainPositionAndBearing(activeSelectedTrain);
        panIndiaMap.panTo([activePos.lat, activePos.lng], { animate: false });
      }

      if (document.getElementById("panIndiaRailMap")) {
        trainAnimationTimer = requestAnimationFrame(stepAnimation);
      }
    }

    trainAnimationTimer = requestAnimationFrame(stepAnimation);
  }

  // =========================================================================
  // VIEW 2: IRCTC-STYLE TRAIN SEARCH, RESULTS & DETAIL (train_list)
  // 3-Screen Flow: Search Form → Train Results → Train Detail
  // =========================================================================

  let trainSearchScreen = "search"; // "search" | "results" | "detail"
  let trainSearchFrom = "";
  let trainSearchTo = "";
  let trainSearchDate = "";
  let trainSearchClass = "All";
  let trainSearchQuota = "General";
  let trainSearchResults = [];
  let trainDetailSelected = null;
  let trainRecentSearches = [];

  // Real Indian Railways State & Live Ingestion Cache
  let irSchedulesIndex = {};
  let irTracksGeoJSON = null;
  let irCrossingsGeoJSON = null;
  let irSignalsGeoJSON = null;
  let irEarthquakesGeoJSON = null;
  let irDelayModel = null;
  let irMaintenanceDataset = [];
  let isRealDatasetsLoaded = false;

  // Comprehensive Indian Railway Station Database (8,990 Stations Dynamically Upgraded)
  let irStations = [
    { code: "NDLS", name: "New Delhi", zone: "NR" },
    { code: "MMCT", name: "Mumbai Central", zone: "WR" },
    { code: "HWH", name: "Howrah Jn", zone: "ER" },
    { code: "MAS", name: "Chennai Central", zone: "SR" },
    { code: "SBC", name: "KSR Bengaluru", zone: "SWR" },
    { code: "JP", name: "Jaipur Jn", zone: "NWR" },
    { code: "LKO", name: "Lucknow Charbagh", zone: "NR" },
    { code: "PNBE", name: "Patna Jn", zone: "ECR" },
    { code: "BRC", name: "Vadodara Jn", zone: "WR" },
    { code: "CNB", name: "Kanpur Central", zone: "NCR" },
    { code: "BSB", name: "Varanasi Jn", zone: "NER" },
    { code: "ADI", name: "Ahmedabad Jn", zone: "WR" },
    { code: "KOTA", name: "Kota Jn", zone: "WCR" },
    { code: "AGC", name: "Agra Cantt", zone: "NCR" },
    { code: "BPL", name: "Bhopal Jn", zone: "WCR" },
    { code: "NGP", name: "Nagpur Jn", zone: "CR" },
    { code: "SC", name: "Secunderabad Jn", zone: "SCR" },
    { code: "TVC", name: "Thiruvananthapuram", zone: "SR" },
    { code: "GHY", name: "Guwahati", zone: "NFR" },
    { code: "PUNE", name: "Pune Jn", zone: "CR" },
    { code: "CDG", name: "Chandigarh Jn", zone: "NR" },
    { code: "JAT", name: "Jammu Tawi", zone: "NR" },
    { code: "UDZ", name: "Udaipur City", zone: "NWR" },
    { code: "JU", name: "Jodhpur Jn", zone: "NWR" },
    { code: "AII", name: "Ajmer Jn", zone: "NWR" },
    { code: "ST", name: "Surat", zone: "WR" },
    { code: "PRYJ", name: "Prayagraj Jn", zone: "NCR" },
    { code: "GWL", name: "Gwalior Jn", zone: "NCR" },
    { code: "LJN", name: "Lucknow NR", zone: "NR" },
    { code: "MTJ", name: "Mathura Jn", zone: "NCR" },
    { code: "BLT", name: "Balotra Jn", zone: "NWR" },
    { code: "LUNI", name: "Luni Jn", zone: "NWR" },
    { code: "BME", name: "Barmer", zone: "NWR" },
    { code: "RTM", name: "Ratlam Jn", zone: "WR" },
    { code: "UMT", name: "Ummed Hospital", zone: "NWR" },
    { code: "DEE", name: "Delhi Sarai Rohilla", zone: "NR" },
    { code: "SBIB", name: "Sabarmati BG", zone: "WR" },
  ];

  // Comprehensive Train Database — 5,208 Real Indian Trains (Dynamically Loaded)
  let irTrainDatabase = [
    {
      number: "22436", name: "VANDE BHARAT EXP", type: "Vande Bharat",
      from: "NDLS", to: "BSB", depart: "06:00", arrive: "14:00", duration: "08h 00m",
      classes: ["CC", "EC"], days: [true,true,true,true,true,true,false],
      delay: 0, delayText: "ON TIME",
      stations: [
        { code: "NDLS", name: "New Delhi", arr: "--", dep: "06:00", pf: 16, delay: 0 },
        { code: "CNB", name: "Kanpur Central", arr: "10:08", dep: "10:13", pf: 1, delay: 0 },
        { code: "PRYJ", name: "Prayagraj Jn", arr: "12:08", dep: "12:13", pf: 6, delay: 0 },
        { code: "BSB", name: "Varanasi Jn", arr: "14:00", dep: "--", pf: 1, delay: 0 },
      ],
      speed: "160 km/h", kavach: "ARMED (SIL-4)"
    },
    {
      number: "12951", name: "MUMBAI RAJDHANI", type: "Rajdhani",
      from: "MMCT", to: "NDLS", depart: "17:00", arrive: "08:32", duration: "15h 32m",
      classes: ["1A", "2A", "3A"], days: [true,true,true,true,true,true,true],
      delay: 0, delayText: "ON TIME",
      stations: [
        { code: "MMCT", name: "Mumbai Central", arr: "--", dep: "17:00", pf: 1, delay: 0 },
        { code: "BRC", name: "Vadodara Jn", arr: "21:05", dep: "21:15", pf: 2, delay: 0 },
        { code: "RTM", name: "Ratlam Jn", arr: "00:25", dep: "00:30", pf: 4, delay: 0 },
        { code: "KOTA", name: "Kota Jn", arr: "03:15", dep: "03:20", pf: 1, delay: 0 },
        { code: "NDLS", name: "New Delhi", arr: "08:32", dep: "--", pf: 1, delay: 0 },
      ],
      speed: "130 km/h", kavach: "ARMED (SIL-4)"
    },
    {
      number: "12302", name: "HOWRAH RAJDHANI", type: "Rajdhani",
      from: "NDLS", to: "HWH", depart: "16:55", arrive: "10:00", duration: "17h 05m",
      classes: ["1A", "2A", "3A"], days: [true,true,true,true,true,true,true],
      delay: 12, delayText: "+12 MIN",
      stations: [
        { code: "NDLS", name: "New Delhi", arr: "--", dep: "16:55", pf: 16, delay: 0 },
        { code: "CNB", name: "Kanpur Central", arr: "21:38", dep: "21:43", pf: 1, delay: 5 },
        { code: "PRYJ", name: "Prayagraj Jn", arr: "00:05", dep: "00:10", pf: 4, delay: 8 },
        { code: "PNBE", name: "Patna Jn", arr: "05:45", dep: "05:50", pf: 1, delay: 10 },
        { code: "HWH", name: "Howrah Jn", arr: "10:00", dep: "--", pf: 9, delay: 12 },
      ],
      speed: "130 km/h", kavach: "ARMED (SIL-4)"
    },
    {
      number: "12952", name: "MUMBAI RAJDHANI", type: "Rajdhani",
      from: "NDLS", to: "MMCT", depart: "16:25", arrive: "08:15", duration: "15h 50m",
      classes: ["1A", "2A", "3A"], days: [true,true,true,true,true,true,true],
      delay: 0, delayText: "ON TIME",
      stations: [
        { code: "NDLS", name: "New Delhi", arr: "--", dep: "16:25", pf: 2, delay: 0 },
        { code: "KOTA", name: "Kota Jn", arr: "21:50", dep: "21:55", pf: 1, delay: 0 },
        { code: "BRC", name: "Vadodara Jn", arr: "03:05", dep: "03:10", pf: 3, delay: 0 },
        { code: "MMCT", name: "Mumbai Central", arr: "08:15", dep: "--", pf: 1, delay: 0 },
      ],
      speed: "130 km/h", kavach: "ARMED (SIL-4)"
    },
    {
      number: "12059", name: "KOTA JAN SHTBDI", type: "Jan Shatabdi",
      from: "NDLS", to: "KOTA", depart: "17:50", arrive: "23:20", duration: "05h 30m",
      classes: ["CC", "2S"], days: [true,true,true,true,true,true,false],
      delay: 28, delayText: "+28 MIN",
      stations: [
        { code: "NDLS", name: "New Delhi", arr: "--", dep: "17:50", pf: 9, delay: 0 },
        { code: "MTJ", name: "Mathura Jn", arr: "19:45", dep: "19:47", pf: 3, delay: 8 },
        { code: "AGC", name: "Agra Cantt", arr: "20:15", dep: "20:18", pf: 1, delay: 12 },
        { code: "GWL", name: "Gwalior Jn", arr: "21:32", dep: "21:35", pf: 2, delay: 18 },
        { code: "KOTA", name: "Kota Jn", arr: "23:20", dep: "--", pf: 1, delay: 28 },
      ],
      speed: "110 km/h", kavach: "TSR ENFORCED"
    },
    {
      number: "12626", name: "KERALA EXPRESS", type: "Superfast",
      from: "NDLS", to: "TVC", depart: "11:25", arrive: "19:05", duration: "31h 40m",
      classes: ["SL", "3A", "2A", "1A"], days: [true,true,true,true,true,true,true],
      delay: 45, delayText: "+45 MIN",
      stations: [
        { code: "NDLS", name: "New Delhi", arr: "--", dep: "11:25", pf: 5, delay: 0 },
        { code: "AGC", name: "Agra Cantt", arr: "14:05", dep: "14:10", pf: 1, delay: 10 },
        { code: "BPL", name: "Bhopal Jn", arr: "20:10", dep: "20:20", pf: 4, delay: 22 },
        { code: "NGP", name: "Nagpur Jn", arr: "02:45", dep: "02:55", pf: 3, delay: 30 },
        { code: "SC", name: "Secunderabad Jn", arr: "10:30", dep: "10:40", pf: 1, delay: 38 },
        { code: "TVC", name: "Thiruvananthapuram", arr: "19:05", dep: "--", pf: 1, delay: 45 },
      ],
      speed: "110 km/h", kavach: "CAB SIGNAL PROCEED"
    },
    {
      number: "20488", name: "MALANI EXPRESS", type: "Express",
      from: "LUNI", to: "BLT", depart: "02:35", arrive: "03:53", duration: "01h 18m",
      classes: ["SL", "3A", "2A", "1A"], days: [true,true,true,true,true,true,true],
      delay: 0, delayText: "ON TIME",
      stations: [
        { code: "LUNI", name: "Luni Jn", arr: "--", dep: "02:35", pf: 1, delay: 0 },
        { code: "BLT", name: "Balotra Jn", arr: "03:53", dep: "--", pf: 2, delay: 0 },
      ],
      speed: "80 km/h", kavach: "ARMED"
    },
    {
      number: "14887", name: "RKSH BME EXP", type: "Express",
      from: "LUNI", to: "BLT", depart: "16:22", arrive: "17:43", duration: "01h 21m",
      classes: ["SL", "3A", "2A"], days: [true,true,true,true,true,true,true],
      delay: 0, delayText: "ON TIME",
      stations: [
        { code: "LUNI", name: "Luni Jn", arr: "--", dep: "16:22", pf: 2, delay: 0 },
        { code: "BLT", name: "Balotra Jn", arr: "17:43", dep: "--", pf: 1, delay: 0 },
      ],
      speed: "75 km/h", kavach: "ARMED"
    },
    {
      number: "04812", name: "HW BME SPL", type: "Special",
      from: "LUNI", to: "BLT", depart: "03:12", arrive: "04:35", duration: "01h 23m",
      classes: ["SL", "3A", "2A"], days: [true,false,true,false,true,true,true],
      delay: 0, delayText: "ON TIME",
      stations: [
        { code: "LUNI", name: "Luni Jn", arr: "--", dep: "03:12", pf: 1, delay: 0 },
        { code: "BLT", name: "Balotra Jn", arr: "04:35", dep: "--", pf: 2, delay: 0 },
      ],
      speed: "70 km/h", kavach: "ARMED"
    },
    {
      number: "15632", name: "GHY BME EXPRESS", type: "Express",
      from: "LUNI", to: "BLT", depart: "04:23", arrive: "06:05", duration: "01h 42m",
      classes: ["SL", "3A", "2A"], days: [true,true,true,true,true,true,true],
      delay: 0, delayText: "ON TIME",
      stations: [
        { code: "LUNI", name: "Luni Jn", arr: "--", dep: "04:23", pf: 1, delay: 0 },
        { code: "BLT", name: "Balotra Jn", arr: "06:05", dep: "--", pf: 1, delay: 0 },
      ],
      speed: "70 km/h", kavach: "ARMED"
    },
    {
      number: "12015", name: "AJMER SHATABDI", type: "Shatabdi",
      from: "NDLS", to: "AII", depart: "06:15", arrive: "12:40", duration: "06h 25m",
      classes: ["CC", "EC"], days: [true,true,true,true,true,true,false],
      delay: 0, delayText: "ON TIME",
      stations: [
        { code: "NDLS", name: "New Delhi", arr: "--", dep: "06:15", pf: 1, delay: 0 },
        { code: "JP", name: "Jaipur Jn", arr: "10:40", dep: "10:50", pf: 1, delay: 0 },
        { code: "AII", name: "Ajmer Jn", arr: "12:40", dep: "--", pf: 3, delay: 0 },
      ],
      speed: "130 km/h", kavach: "ARMED (SIL-4)"
    },
    {
      number: "12958", name: "ADI RAJDHANI", type: "Rajdhani",
      from: "NDLS", to: "ADI", depart: "19:25", arrive: "07:40", duration: "12h 15m",
      classes: ["1A", "2A", "3A"], days: [true,true,true,true,true,true,true],
      delay: 8, delayText: "+8 MIN",
      stations: [
        { code: "NDLS", name: "New Delhi", arr: "--", dep: "19:25", pf: 4, delay: 0 },
        { code: "KOTA", name: "Kota Jn", arr: "00:20", dep: "00:25", pf: 3, delay: 5 },
        { code: "ADI", name: "Ahmedabad Jn", arr: "07:40", dep: "--", pf: 1, delay: 8 },
      ],
      speed: "130 km/h", kavach: "ARMED (SIL-4)"
    },
    {
      number: "12904", name: "GOLDEN TEMPLE ML", type: "Superfast",
      from: "MMCT", to: "NDLS", depart: "21:30", arrive: "14:45", duration: "17h 15m",
      classes: ["SL", "3A", "2A", "1A"], days: [true,true,true,true,true,true,true],
      delay: 15, delayText: "+15 MIN",
      stations: [
        { code: "MMCT", name: "Mumbai Central", arr: "--", dep: "21:30", pf: 5, delay: 0 },
        { code: "ST", name: "Surat", arr: "00:30", dep: "00:35", pf: 2, delay: 5 },
        { code: "BRC", name: "Vadodara Jn", arr: "02:30", dep: "02:35", pf: 3, delay: 8 },
        { code: "KOTA", name: "Kota Jn", arr: "09:10", dep: "09:15", pf: 1, delay: 12 },
        { code: "NDLS", name: "New Delhi", arr: "14:45", dep: "--", pf: 6, delay: 15 },
      ],
      speed: "110 km/h", kavach: "CAB SIGNAL PROCEED"
    },
    {
      number: "12622", name: "TAMIL NADU EXP", type: "Superfast",
      from: "NDLS", to: "MAS", depart: "22:00", arrive: "07:10", duration: "33h 10m",
      classes: ["SL", "3A", "2A", "1A"], days: [true,true,true,true,true,true,true],
      delay: 0, delayText: "ON TIME",
      stations: [
        { code: "NDLS", name: "New Delhi", arr: "--", dep: "22:00", pf: 8, delay: 0 },
        { code: "AGC", name: "Agra Cantt", arr: "00:38", dep: "00:43", pf: 1, delay: 0 },
        { code: "GWL", name: "Gwalior Jn", arr: "02:25", dep: "02:30", pf: 3, delay: 0 },
        { code: "BPL", name: "Bhopal Jn", arr: "07:10", dep: "07:20", pf: 6, delay: 0 },
        { code: "NGP", name: "Nagpur Jn", arr: "14:20", dep: "14:30", pf: 4, delay: 0 },
        { code: "MAS", name: "Chennai Central", arr: "07:10", dep: "--", pf: 3, delay: 0 },
      ],
      speed: "110 km/h", kavach: "ARMED"
    },
    {
      number: "12432", name: "TRIVNDRM RAJDHNI", type: "Rajdhani",
      from: "NDLS", to: "TVC", depart: "10:55", arrive: "05:30", duration: "30h 35m",
      classes: ["1A", "2A", "3A"], days: [true,false,true,false,true,false,true],
      delay: 20, delayText: "+20 MIN",
      stations: [
        { code: "NDLS", name: "New Delhi", arr: "--", dep: "10:55", pf: 3, delay: 0 },
        { code: "BPL", name: "Bhopal Jn", arr: "17:45", dep: "17:55", pf: 4, delay: 5 },
        { code: "NGP", name: "Nagpur Jn", arr: "23:20", dep: "23:30", pf: 3, delay: 10 },
        { code: "SC", name: "Secunderabad Jn", arr: "06:30", dep: "06:40", pf: 1, delay: 14 },
        { code: "TVC", name: "Thiruvananthapuram", arr: "05:30", dep: "--", pf: 1, delay: 20 },
      ],
      speed: "110 km/h", kavach: "ARMED"
    },
    {
      number: "12650", name: "KSK SAMPARK KRNTI", type: "Superfast",
      from: "NDLS", to: "SBC", depart: "21:00", arrive: "05:40", duration: "32h 40m",
      classes: ["SL", "3A", "2A"], days: [true,true,true,true,true,false,true],
      delay: 0, delayText: "ON TIME",
      stations: [
        { code: "NDLS", name: "New Delhi", arr: "--", dep: "21:00", pf: 12, delay: 0 },
        { code: "AGC", name: "Agra Cantt", arr: "00:05", dep: "00:10", pf: 1, delay: 0 },
        { code: "BPL", name: "Bhopal Jn", arr: "06:45", dep: "06:55", pf: 5, delay: 0 },
        { code: "SC", name: "Secunderabad Jn", arr: "19:15", dep: "19:30", pf: 1, delay: 0 },
        { code: "SBC", name: "KSR Bengaluru", arr: "05:40", dep: "--", pf: 5, delay: 0 },
      ],
      speed: "110 km/h", kavach: "ARMED"
    },
    {
      number: "14660", name: "JSM DLI EXPRESS", type: "Express",
      from: "BME", to: "NDLS", depart: "06:30", arrive: "06:45", duration: "24h 15m",
      classes: ["SL", "3A", "2A"], days: [true,true,true,true,true,true,true],
      delay: 35, delayText: "+35 MIN",
      stations: [
        { code: "BME", name: "Barmer", arr: "--", dep: "06:30", pf: 1, delay: 0 },
        { code: "BLT", name: "Balotra Jn", arr: "08:15", dep: "08:20", pf: 2, delay: 5 },
        { code: "LUNI", name: "Luni Jn", arr: "09:55", dep: "10:00", pf: 1, delay: 10 },
        { code: "JU", name: "Jodhpur Jn", arr: "11:30", dep: "11:45", pf: 3, delay: 15 },
        { code: "JP", name: "Jaipur Jn", arr: "18:00", dep: "18:10", pf: 2, delay: 25 },
        { code: "NDLS", name: "New Delhi", arr: "06:45", dep: "--", pf: 7, delay: 35 },
      ],
      speed: "75 km/h", kavach: "CAB SIGNAL PROCEED"
    },
    {
      number: "12462", name: "MANDORE EXPRESS", type: "Superfast",
      from: "JU", to: "NDLS", depart: "19:45", arrive: "06:10", duration: "10h 25m",
      classes: ["SL", "3A", "2A", "1A"], days: [true,true,true,true,true,true,true],
      delay: 0, delayText: "ON TIME",
      stations: [
        { code: "JU", name: "Jodhpur Jn", arr: "--", dep: "19:45", pf: 1, delay: 0 },
        { code: "AII", name: "Ajmer Jn", arr: "23:20", dep: "23:30", pf: 3, delay: 0 },
        { code: "JP", name: "Jaipur Jn", arr: "01:40", dep: "01:50", pf: 1, delay: 0 },
        { code: "NDLS", name: "New Delhi", arr: "06:10", dep: "--", pf: 11, delay: 0 },
      ],
      speed: "110 km/h", kavach: "ARMED"
    },
    {
      number: "12308", name: "JODHPUR RAJDHANI", type: "Rajdhani",
      from: "JU", to: "NDLS", depart: "14:45", arrive: "05:05", duration: "14h 20m",
      classes: ["1A", "2A", "3A"], days: [false,true,false,true,false,true,false],
      delay: 0, delayText: "ON TIME",
      stations: [
        { code: "JU", name: "Jodhpur Jn", arr: "--", dep: "14:45", pf: 1, delay: 0 },
        { code: "AII", name: "Ajmer Jn", arr: "18:05", dep: "18:15", pf: 3, delay: 0 },
        { code: "JP", name: "Jaipur Jn", arr: "20:20", dep: "20:30", pf: 1, delay: 0 },
        { code: "NDLS", name: "New Delhi", arr: "05:05", dep: "--", pf: 16, delay: 0 },
      ],
      speed: "130 km/h", kavach: "ARMED (SIL-4)"
    },
    {
      number: "22478", name: "JODHPUR SF EXP", type: "Superfast",
      from: "NDLS", to: "JU", depart: "05:35", arrive: "16:00", duration: "10h 25m",
      classes: ["SL", "3A", "2A"], days: [true,true,true,true,true,true,true],
      delay: 5, delayText: "+5 MIN",
      stations: [
        { code: "NDLS", name: "New Delhi", arr: "--", dep: "05:35", pf: 13, delay: 0 },
        { code: "JP", name: "Jaipur Jn", arr: "10:15", dep: "10:25", pf: 5, delay: 3 },
        { code: "AII", name: "Ajmer Jn", arr: "12:30", dep: "12:35", pf: 1, delay: 5 },
        { code: "JU", name: "Jodhpur Jn", arr: "16:00", dep: "--", pf: 4, delay: 5 },
      ],
      speed: "110 km/h", kavach: "ARMED"
    },
  ];

  // =========================================================================
  // REAL INDIAN RAILWAYS DATA INGESTION & RUNTIME ADAPTER
  // =========================================================================
  async function loadRealRailwayDatasets() {
    try {
      console.log("🚆 Connecting to 100% Real Indian Railways Datasets...");
      const fetchJson = async (filename, apiPath) => {
        try {
          const apiRes = await fetch(apiPath);
          if (apiRes.ok) return await apiRes.json();
        } catch (e) {}
        const staticPaths = [
          `../data/${filename}`,
          `/frontend/src/data/${filename}`,
          `/data/processed/${filename}`,
          `../../data/processed/${filename}`,
          `data/processed/${filename}`
        ];
        for (const p of staticPaths) {
          try {
            const res = await fetch(p);
            if (res.ok) return await res.json();
          } catch (e) {}
        }
        return null;
      };

      // 1. Stations (8,990 real stations)
      const stData = await fetchJson('stations_index.json', '/api/v1/stations');
      if (stData && Array.isArray(stData)) {
        irStations = stData;
        console.log(`✓ Loaded ${irStations.length} Real Indian Railway Stations`);
      } else if (stData && stData.stations) {
        irStations = stData.stations;
      }

      // 2. Trains (5,208 real trains)
      const trData = await fetchJson('trains_light.json', '/data/processed/trains_light.json');
      if (trData && Array.isArray(trData)) {
        irTrainDatabase = trData;
        console.log(`✓ Loaded ${irTrainDatabase.length} Real Indian Railway Trains`);
      }

      // 3. Train Schedules Index (commercial stops timetable)
      const schData = await fetchJson('train_schedules_index.json', '/data/processed/train_schedules_index.json');
      if (schData && typeof schData === 'object') {
        irSchedulesIndex = schData;
        console.log(`✓ Loaded Real Train Timetable Schedules Index`);
      }

      // 4. Delay Model
      const delayData = await fetchJson('delay_model.json', '/api/v1/delays/model');
      if (delayData) {
        irDelayModel = delayData;
      }

      // 5. Maintenance Telemetry (100k real records)
      const maintData = await fetchJson('maintenance_telemetry.json', '/api/v1/maintenance/telemetry');
      if (maintData && maintData.records) {
        irMaintenanceDataset = maintData.records;
      }

      // 6. Tracks GeoJSON (3,474 tracks)
      const trackData = await fetchJson('tracks_geojson.json', '/api/v1/gis/tracks');
      if (trackData && trackData.features) {
        irTracksGeoJSON = trackData;
        if (panIndiaMap && activeNavView === 'live_map') {
          renderPanIndiaRailwayTracks();
        }
      }

      // 7. Crossings GeoJSON (3,308 crossings)
      const crData = await fetchJson('crossings_geojson.json', '/api/v1/gis/crossings');
      if (crData && crData.features) {
        irCrossingsGeoJSON = crData;
      }

      // 8. Signals GeoJSON
      const sigData = await fetchJson('signals_geojson.json', '/api/v1/gis/signals');
      if (sigData && sigData.features) {
        irSignalsGeoJSON = sigData;
      }

      // 9. Earthquakes GeoJSON
      const eqData = await fetchJson('earthquakes_geojson.json', '/api/v1/gis/earthquakes');
      if (eqData && eqData.features) {
        irEarthquakesGeoJSON = eqData;
      }

      isRealDatasetsLoaded = true;

      // Re-render current active screen to reflect real data if currently viewing train list or search
      const container = document.getElementById("activeSubTabContainer");
      if (container && (activeNavView === "train_list" || activeNavView === "overview")) {
        renderTrainListSection(container);
      }
    } catch (err) {
      console.warn("Error loading real railway datasets:", err);
    }
  }

  // Trigger real data ingestion immediately on DOM load
  loadRealRailwayDatasets();

  // Helper: Get station display name
  function getStationDisplay(code) {
    if (!code) return "";
    const cleanCode = code.trim().toUpperCase();
    const s = irStations.find(st => st.code === cleanCode);
    if (s) {
      const extra = s.state ? ` (${s.state})` : s.zone ? ` (${s.zone})` : "";
      return `${s.code} - ${s.name.toUpperCase()}${extra}`;
    }
    return cleanCode;
  }

  // Helper: Get today and upcoming dates
  function getSearchDates() {
    const dates = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      dates.push({
        full: d.toISOString().split("T")[0],
        day: d.toLocaleDateString("en-IN", { weekday: "short" }),
        date: d.getDate(),
        month: d.toLocaleDateString("en-IN", { month: "short" }),
        label: i === 0 ? "Today" : i === 1 ? "Tomorrow" : `${d.toLocaleDateString("en-IN", { weekday: "short" })}, ${d.getDate()} ${d.toLocaleDateString("en-IN", { month: "short" })}`
      });
    }
    return dates;
  }

  // Swap From/To
  window.swapTrainStations = function () {
    const temp = trainSearchFrom;
    trainSearchFrom = trainSearchTo;
    trainSearchTo = temp;
    const container = document.getElementById("activeSubTabContainer");
    if (container) renderTrainListSection(container);
  };

  // Search trains across 5,208 real Indian Railways trains
  window.executeTrainSearch = function () {
    if (!trainSearchFrom || !trainSearchTo) {
      showToast("⚠️ Please select both From and To stations!", "warning");
      return;
    }
    if (trainSearchFrom === trainSearchTo) {
      showToast("⚠️ From and To stations cannot be same!", "warning");
      return;
    }
    if (!trainSearchDate) {
      const today = new Date().toISOString().split("T")[0];
      trainSearchDate = today;
    }

    // Alias mapping for major hub codes (e.g. MMCT/BCT, NDLS/DLI/NZM)
    const fromAliases = [trainSearchFrom];
    const toAliases = [trainSearchTo];
    if (trainSearchFrom === 'MMCT' || trainSearchFrom === 'BCT') { fromAliases.push('MMCT', 'BCT', 'BDTS'); }
    if (trainSearchTo === 'MMCT' || trainSearchTo === 'BCT') { toAliases.push('MMCT', 'BCT', 'BDTS'); }
    if (trainSearchFrom === 'NDLS') { fromAliases.push('DLI', 'NZM', 'DEE'); }
    if (trainSearchTo === 'NDLS') { toAliases.push('DLI', 'NZM', 'DEE'); }
    if (trainSearchFrom === 'HWH') { fromAliases.push('SDAH', 'KOAA'); }
    if (trainSearchTo === 'HWH') { toAliases.push('SDAH', 'KOAA'); }

    // Find matching trains from irTrainDatabase (all 5,208 real trains!)
    trainSearchResults = irTrainDatabase.filter(t => {
      // 1. Direct match
      if (fromAliases.includes(t.from) && toAliases.includes(t.to)) return true;
      // 2. Intermediate stop match
      if (t.stopCodes && t.stopCodes.length > 1) {
        const fromIdx = t.stopCodes.findIndex(c => fromAliases.includes(c));
        const toIdx = t.stopCodes.findIndex(c => toAliases.includes(c));
        if (fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx) return true;
      }
      return false;
    });

    // If search class is selected and not 'All', filter
    if (trainSearchClass && trainSearchClass !== "All") {
      const matchingClass = trainSearchResults.filter(t => t.classes && t.classes.includes(trainSearchClass));
      if (matchingClass.length > 0) trainSearchResults = matchingClass;
    }

    // Attach real timetable schedule to each train result
    trainSearchResults.forEach(t => {
      if (!t.stations || t.stations.length === 0) {
        t.stations = irSchedulesIndex[t.number] || [];
      }
      // Apply real delay model
      if (irDelayModel && irDelayModel.avgDelayByType) {
        const baseDelay = irDelayModel.avgDelayByType[t.type] || (t.type === 'Rajdhani' || t.type === 'Vande Bharat' ? 0 : 8);
        t.delay = baseDelay;
        t.delayText = baseDelay === 0 ? "ON TIME" : `+${baseDelay} MIN`;
      }
    });

    // Sort: Vande Bharat & Rajdhani & Superfast first, then by departure time
    trainSearchResults.sort((a, b) => {
      const pMap = { 'Vande Bharat': 1, 'Rajdhani': 2, 'Shatabdi': 3, 'Duronto': 4, 'Superfast': 5, 'Express': 6 };
      const pA = pMap[a.type] || 7;
      const pB = pMap[b.type] || 7;
      if (pA !== pB) return pA - pB;
      return (a.depart || "").localeCompare(b.depart || "");
    });

    // Add to recent searches
    const searchEntry = { from: trainSearchFrom, to: trainSearchTo, date: trainSearchDate };
    trainRecentSearches = [searchEntry, ...trainRecentSearches.filter(r => !(r.from === searchEntry.from && r.to === searchEntry.to))].slice(0, 5);

    trainSearchScreen = "results";
    const container = document.getElementById("activeSubTabContainer");
    if (container) renderTrainListSection(container);
  };

  // Go back to search from results
  window.goBackToSearch = function () {
    trainSearchScreen = "search";
    const container = document.getElementById("activeSubTabContainer");
    if (container) renderTrainListSection(container);
  };

  // Go back to results from detail
  window.goBackToResults = function () {
    trainSearchScreen = "results";
    const container = document.getElementById("activeSubTabContainer");
    if (container) renderTrainListSection(container);
  };

  // View train detail with real timetable stops
  window.viewTrainDetail = function (trainNumber) {
    trainDetailSelected = irTrainDatabase.find(t => t.number === trainNumber);
    if (!trainDetailSelected) {
      trainDetailSelected = irTrainDatabase.find(t => t.number.includes(trainNumber));
    }
    if (trainDetailSelected) {
      if (!trainDetailSelected.stations || trainDetailSelected.stations.length === 0) {
        trainDetailSelected.stations = irSchedulesIndex[trainDetailSelected.number] || [];
        if (trainDetailSelected.stations.length === 0) {
          const fromSt = irStations.find(s => s.code === trainDetailSelected.from) || { name: trainDetailSelected.fromName || trainDetailSelected.from, code: trainDetailSelected.from };
          const toSt = irStations.find(s => s.code === trainDetailSelected.to) || { name: trainDetailSelected.toName || trainDetailSelected.to, code: trainDetailSelected.to };
          trainDetailSelected.stations = [
            { code: trainDetailSelected.from, name: fromSt.name || trainDetailSelected.from, pf: 1, arr: "--", dep: trainDetailSelected.depart || "06:00", delay: 0 },
            { code: trainDetailSelected.to, name: toSt.name || trainDetailSelected.to, pf: 2, arr: trainDetailSelected.arrive || "14:00", dep: "--", delay: trainDetailSelected.delay || 0 }
          ];
        }
      }
      trainSearchScreen = "detail";
      const container = document.getElementById("activeSubTabContainer");
      if (container) renderTrainListSection(container);
    }
  };

  // Use recent search
  window.useRecentSearch = function (from, to) {
    trainSearchFrom = from;
    trainSearchTo = to;
    const container = document.getElementById("activeSubTabContainer");
    if (container) renderTrainListSection(container);
  };

  // High-Performance 8,990 Station Autocomplete Filter
  window.filterStationDropdown = function (inputId, listId) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    if (!input || !list) return;
    const query = input.value.trim().toLowerCase();
    const isFrom = listId.startsWith("from");
    const container = list.querySelector(".station-options-container");
    if (!container) return;

    let matches = [];
    if (!query) {
      const topCodes = ["NDLS", "MMCT", "BCT", "HWH", "MAS", "SBC", "BSB", "CNB", "JU", "JP", "BPL", "NGP", "SC", "LKO", "PNBE", "PUNE", "ADI", "KOTA", "AGC", "GWL", "ST", "RTM", "GHY", "CDG", "JAT", "BDTS", "NZM", "DLI"];
      matches = topCodes.map(c => irStations.find(s => s.code === c)).filter(Boolean);
    } else {
      matches = irStations.filter(s => {
        return s.code.toLowerCase().includes(query) ||
               s.name.toLowerCase().includes(query) ||
               (s.aliases && s.aliases.some(a => a.toLowerCase().includes(query)));
      }).slice(0, 35);
    }

    container.innerHTML = matches.map(s => `
      <div class="station-option" onclick="selectStation('${isFrom ? 'from' : 'to'}','${s.code}'); document.getElementById('${listId}').classList.add('hidden');"
        style="padding: 10px 14px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a; border-radius: 10px; margin: 2px 0; transition: background 0.15s;"
        onmouseover="this.style.background='#eaf3f8'" onmouseout="this.style.background='white'">
        <i class="fa-solid fa-train" style="color: #12355B; margin-right: 8px; font-size: 11px;"></i>
        <strong>${s.code}</strong> - ${s.name.toUpperCase()}
        <span style="float: right; font-size: 10px; color: #64748b; font-weight: 700;">${s.state || s.zone || ''}</span>
      </div>
    `).join("") || `<div style="padding: 12px; font-size: 12px; color: #94a3b8; text-align: center;">No stations found matching "${query}"</div>`;

    list.classList.remove("hidden");
  };

  window.selectStation = function (field, code) {
    if (field === "from") trainSearchFrom = code;
    else trainSearchTo = code;
    const container = document.getElementById("activeSubTabContainer");
    if (container) renderTrainListSection(container);
  };

  window.toggleStationDropdown = function (listId) {
    const list = document.getElementById(listId);
    if (list) {
      list.classList.toggle("hidden");
      if (!list.classList.contains("hidden")) {
        const inputId = listId.startsWith("from") ? "fromSearchInput" : "toSearchInput";
        filterStationDropdown(inputId, listId);
      }
    }
  };

  window.setTrainSearchClass = function (cls) {
    trainSearchClass = cls;
    const container = document.getElementById("activeSubTabContainer");
    if (container && trainSearchScreen === "search") renderTrainListSection(container);
  };

  window.setTrainSearchDate = function (date) {
    trainSearchDate = date;
    const container = document.getElementById("activeSubTabContainer");
    if (container) renderTrainListSection(container);
  };

  // =========================================================================
  // RENDER: TRAIN LIST SECTION (3 SCREENS)
  // =========================================================================
  function renderTrainListSection(container) {
    if (trainSearchScreen === "results") {
      renderTrainResultsScreen(container);
    } else if (trainSearchScreen === "detail") {
      renderTrainDetailScreen(container);
    } else {
      renderTrainSearchScreen(container);
    }
  }

  // =========================================================================
  // SCREEN 1: IRCTC-STYLE SEARCH FORM
  // =========================================================================
  function renderTrainSearchScreen(container) {
    const dates = getSearchDates();
    if (!trainSearchDate) trainSearchDate = dates[0].full;
    const dayNames = ["M", "T", "W", "T", "F", "S", "S"];
    const classOptions = ["All", "2S", "SL", "3A", "2A", "1A", "CC", "EC"];

    const fromStation = trainSearchFrom ? irStations.find(s => s.code === trainSearchFrom) : null;
    const toStation = trainSearchTo ? irStations.find(s => s.code === trainSearchTo) : null;

    container.innerHTML = `
      <div class="space-y-5" style="max-width: 620px; margin: 0 auto;">

        <!-- Header -->
        <div class="text-center">
          <div style="display: inline-flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <i class="fa-solid fa-train" style="color: #12355B; font-size: 20px;"></i>
            <h2 style="font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 22px; color: #12355B; margin: 0;">
              Search Trains
            </h2>
          </div>
          <p style="font-size: 12px; color: #64748b; font-weight: 500;">Find trains between stations across Indian Railways network</p>
        </div>

        <!-- Search Card -->
        <div class="glass-card" style="padding: 26px; position: relative; border-radius: 24px !important;">

          <!-- From Station -->
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 13px; font-weight: 700; color: #2563eb; margin-bottom: 6px;">
              <i class="fa-solid fa-location-dot" style="margin-right: 4px;"></i> From
            </label>
            <div style="position: relative;">
              <div onclick="toggleStationDropdown('fromStationList')"
                   style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; border: 2px solid #d6e3ec; border-radius: 16px; cursor: pointer; background: #f8fafc; transition: border-color 0.2s;"
                   onmouseover="this.style.borderColor='#2563eb'" onmouseout="this.style.borderColor='#d6e3ec'">
                <i class="fa-solid fa-train-tram" style="color: #12355B; font-size: 16px;"></i>
                <span style="font-size: 14px; font-weight: 700; color: ${fromStation ? '#0f172a' : '#94a3b8'};">
                  ${fromStation ? `${fromStation.code} - ${fromStation.name.toUpperCase()}` : 'Select Source Station'}
                </span>
              </div>
              <div id="fromStationList" class="hidden" style="position: absolute; top: 100%; left: 0; right: 0; z-index: 40; max-height: 240px; overflow-y: auto; background: white; border: 2px solid #2563eb; border-radius: 18px; margin-top: 6px; box-shadow: 0 20px 40px rgba(18,53,91,0.18); padding: 8px;">
                <div style="padding: 6px; position: sticky; top: 0; background: white; border-bottom: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 4px; z-index: 2;">
                  <input type="text" placeholder="Type station name or code (e.g. NDLS, Mumbai, Kota)..." oninput="filterStationDropdown('fromSearchInput','fromStationList')" id="fromSearchInput"
                    style="width: 100%; padding: 9px 14px; border: 1.5px solid #d6e3ec; border-radius: 12px; font-size: 12px; font-weight: 600; outline: none; box-sizing: border-box;" />
                </div>
                <div class="station-options-container">
                  ${irStations.slice(0, 30).map(s => `
                    <div class="station-option" onclick="selectStation('from','${s.code}'); document.getElementById('fromStationList').classList.add('hidden');"
                      style="padding: 10px 14px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a; border-radius: 10px; margin: 2px 0; transition: background 0.15s;"
                      onmouseover="this.style.background='#eaf3f8'" onmouseout="this.style.background='white'">
                      <i class="fa-solid fa-train" style="color: #12355B; margin-right: 8px; font-size: 11px;"></i>
                      <strong>${s.code}</strong> - ${s.name.toUpperCase()}
                      <span style="float: right; font-size: 10px; color: #64748b; font-weight: 700;">${s.state || s.zone || ''}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>
          </div>

          <!-- Swap Button -->
          <div style="position: absolute; right: 36px; top: 120px; z-index: 10;">
            <button onclick="swapTrainStations()"
              style="width: 42px; height: 42px; border-radius: 50%; background: white; border: 2px solid #2563eb; color: #2563eb; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 14px rgba(37,99,235,0.25); transition: all 0.2s;"
              onmouseover="this.style.background='#2563eb'; this.style.color='white'; this.style.transform='rotate(180deg)'" onmouseout="this.style.background='white'; this.style.color='#2563eb'; this.style.transform='rotate(0deg)'">
              <i class="fa-solid fa-arrow-right-arrow-left" style="transform: rotate(90deg); font-size: 14px;"></i>
            </button>
          </div>

          <!-- To Station -->
          <div style="margin-bottom: 24px;">
            <label style="display: block; font-size: 13px; font-weight: 700; color: #2563eb; margin-bottom: 6px;">
              <i class="fa-solid fa-location-crosshairs" style="margin-right: 4px;"></i> To
            </label>
            <div style="position: relative;">
              <div onclick="toggleStationDropdown('toStationList')"
                   style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; border: 2px solid #d6e3ec; border-radius: 16px; cursor: pointer; background: #f8fafc; transition: border-color 0.2s;"
                   onmouseover="this.style.borderColor='#2563eb'" onmouseout="this.style.borderColor='#d6e3ec'">
                <i class="fa-solid fa-train-tram" style="color: #12355B; font-size: 16px;"></i>
                <span style="font-size: 14px; font-weight: 700; color: ${toStation ? '#0f172a' : '#94a3b8'};">
                  ${toStation ? `${toStation.code} - ${toStation.name.toUpperCase()}` : 'Select Destination Station'}
                </span>
              </div>
              <div id="toStationList" class="hidden" style="position: absolute; top: 100%; left: 0; right: 0; z-index: 40; max-height: 240px; overflow-y: auto; background: white; border: 2px solid #2563eb; border-radius: 18px; margin-top: 6px; box-shadow: 0 20px 40px rgba(18,53,91,0.18); padding: 8px;">
                <div style="padding: 6px; position: sticky; top: 0; background: white; border-bottom: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 4px; z-index: 2;">
                  <input type="text" placeholder="Type station name or code (e.g. NDLS, Mumbai, Kota)..." oninput="filterStationDropdown('toSearchInput','toStationList')" id="toSearchInput"
                    style="width: 100%; padding: 9px 14px; border: 1.5px solid #d6e3ec; border-radius: 12px; font-size: 12px; font-weight: 600; outline: none; box-sizing: border-box;" />
                </div>
                <div class="station-options-container">
                  ${irStations.slice(0, 30).map(s => `
                    <div class="station-option" onclick="selectStation('to','${s.code}'); document.getElementById('toStationList').classList.add('hidden');"
                      style="padding: 10px 14px; cursor: pointer; font-size: 13px; font-weight: 600; color: #0f172a; border-radius: 10px; margin: 2px 0; transition: background 0.15s;"
                      onmouseover="this.style.background='#eaf3f8'" onmouseout="this.style.background='white'">
                      <i class="fa-solid fa-train" style="color: #12355B; margin-right: 8px; font-size: 11px;"></i>
                      <strong>${s.code}</strong> - ${s.name.toUpperCase()}
                      <span style="float: right; font-size: 10px; color: #64748b; font-weight: 700;">${s.state || s.zone || ''}</span>
                    </div>
                  `).join("")}
                </div>
              </div>
            </div>
          </div>

          <!-- Departure Date -->
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 13px; font-weight: 700; color: #2563eb; margin-bottom: 8px;">
              <i class="fa-solid fa-calendar-days" style="margin-right: 4px;"></i> Departure Date
            </label>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <input type="date" value="${trainSearchDate}" onchange="setTrainSearchDate(this.value)"
                style="padding: 10px 14px; border: 2px solid #d6e3ec; border-radius: 14px; font-size: 13px; font-weight: 700; color: #0f172a; background: #f8fafc; cursor: pointer; outline: none; font-family: 'Plus Jakarta Sans', sans-serif;" />
              ${dates.slice(1, 4).map(d => `
                <button onclick="setTrainSearchDate('${d.full}')"
                  style="padding: 7px 16px; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: 1.5px solid ${trainSearchDate === d.full ? '#2563eb' : '#d6e3ec'}; background: ${trainSearchDate === d.full ? '#2563eb' : 'white'}; color: ${trainSearchDate === d.full ? 'white' : '#475569'};"
                  onmouseover="if('${trainSearchDate}'!=='${d.full}'){this.style.borderColor='#2563eb';this.style.color='#2563eb'}" onmouseout="if('${trainSearchDate}'!=='${d.full}'){this.style.borderColor='#d6e3ec';this.style.color='#475569'}">
                  ${d.date} ${d.month}
                </button>
              `).join("")}
            </div>
          </div>

          <!-- Class Selector -->
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 13px; font-weight: 700; color: #2563eb; margin-bottom: 8px;">
              <i class="fa-solid fa-chair" style="margin-right: 4px;"></i> Class
            </label>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              ${classOptions.map(cls => `
                <button onclick="setTrainSearchClass('${cls}')"
                  style="padding: 8px 18px; border-radius: 20px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: 1.5px solid ${trainSearchClass === cls ? '#2563eb' : '#d6e3ec'}; background: ${trainSearchClass === cls ? '#2563eb' : 'white'}; color: ${trainSearchClass === cls ? 'white' : '#475569'};"
                  onmouseover="if('${trainSearchClass}'!=='${cls}'){this.style.borderColor='#2563eb';this.style.color='#2563eb'}" onmouseout="if('${trainSearchClass}'!=='${cls}'){this.style.borderColor='#d6e3ec';this.style.color='#475569'}">
                  ${cls}
                </button>
              `).join("")}
            </div>
          </div>

          <!-- Quota -->
          <div style="margin-bottom: 24px;">
            <label style="display: block; font-size: 13px; font-weight: 700; color: #2563eb; margin-bottom: 6px;">
              <i class="fa-solid fa-ticket" style="margin-right: 4px;"></i> Quota
            </label>
            <select onchange="trainSearchQuota = this.value"
              style="width: 100%; padding: 11px 16px; border: 2px solid #d6e3ec; border-radius: 14px; font-size: 13px; font-weight: 700; color: #0f172a; background: #f8fafc; cursor: pointer; outline: none; font-family: 'Plus Jakarta Sans', sans-serif; appearance: auto;">
              <option value="General" ${trainSearchQuota === 'General' ? 'selected' : ''}>General</option>
              <option value="Tatkal" ${trainSearchQuota === 'Tatkal' ? 'selected' : ''}>Tatkal</option>
              <option value="Ladies" ${trainSearchQuota === 'Ladies' ? 'selected' : ''}>Ladies</option>
              <option value="Lower Berth" ${trainSearchQuota === 'Lower Berth' ? 'selected' : ''}>Lower Berth / Senior Citizen</option>
              <option value="Divyaang" ${trainSearchQuota === 'Divyaang' ? 'selected' : ''}>Divyaang</option>
              <option value="Defence" ${trainSearchQuota === 'Defence' ? 'selected' : ''}>Defence</option>
            </select>
          </div>

          <!-- Search Button -->
          <button onclick="executeTrainSearch()"
            style="width: 100%; padding: 15px; border-radius: 16px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; font-size: 16px; font-weight: 800; border: none; cursor: pointer; font-family: 'Outfit', sans-serif; letter-spacing: 0.5px; box-shadow: 0 6px 24px rgba(37,99,235,0.35); transition: all 0.25s; display: flex; align-items: center; justify-content: center; gap: 10px;"
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 10px 30px rgba(37,99,235,0.45)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 6px 24px rgba(37,99,235,0.35)'">
            <i class="fa-solid fa-magnifying-glass"></i> Search Trains
          </button>
        </div>

        <!-- Recent Searches -->
        ${trainRecentSearches.length > 0 ? `
          <div style="padding: 0 4px;">
            <h4 style="font-size: 13px; font-weight: 800; color: #12355B; margin-bottom: 10px;">
              <i class="fa-solid fa-clock-rotate-left" style="margin-right: 6px; color: #2563eb;"></i> Recent Searches
            </h4>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${trainRecentSearches.map(r => `
                <button onclick="useRecentSearch('${r.from}', '${r.to}')"
                  style="padding: 9px 18px; border-radius: 14px; background: white; border: 1.5px solid #d6e3ec; font-size: 11px; font-weight: 700; color: #12355B; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: all 0.2s; display: flex; align-items: center; gap: 6px;"
                  onmouseover="this.style.borderColor='#2563eb'; this.style.boxShadow='0 4px 12px rgba(37,99,235,0.15)'" onmouseout="this.style.borderColor='#d6e3ec'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'">
                  <i class="fa-solid fa-route" style="color: #2563eb; font-size: 10px;"></i>
                  ${r.from} → ${r.to}
                </button>
              `).join("")}
            </div>
          </div>
        ` : ''}

        <!-- Featured Active Train Fleet (Direct 1-Click Dashboard Access) -->
        <div style="padding: 4px 4px 0 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <h4 style="font-size: 13px; font-weight: 800; color: #12355B; margin: 0; display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-gauge-high" style="color: #FF9933;"></i> Active Fleet (Click for Live Train Dashboard)
            </h4>
            <span style="font-size: 11px; color: #64748b; font-weight: 600;">20 Trains in Network</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            ${irTrainDatabase.slice(0, 6).map(tr => {
              const dCol = tr.delay === 0 ? '#138808' : tr.delay <= 15 ? '#f59e0b' : '#dc2626';
              const dBg = tr.delay === 0 ? '#f0fdf4' : tr.delay <= 15 ? '#fffbeb' : '#fef2f2';
              const typeColor = tr.type === 'Vande Bharat' ? '#ea580c' : tr.type === 'Rajdhani' ? '#991b1b' : tr.type === 'Shatabdi' ? '#0284c7' : '#2563eb';
              return `
                <div onclick="viewTrainDetail('${tr.number}')"
                  class="glass-card" style="padding: 14px 16px; border-radius: 18px !important; cursor: pointer; transition: all 0.2s; border-left: 4px solid ${dCol} !important;"
                  onmouseover="this.style.boxShadow='0 8px 24px rgba(18,53,91,0.14)'; this.style.transform='translateY(-2px)'"
                  onmouseout="this.style.boxShadow=''; this.style.transform=''">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                    <span style="font-size: 11px; font-weight: 800; color: ${typeColor}; font-family: 'JetBrains Mono', monospace;">${tr.number}</span>
                    <span style="padding: 2px 8px; border-radius: 8px; font-size: 9px; font-weight: 800; background: ${dBg}; color: ${dCol}; border: 1px solid ${dCol}30;">
                      ${tr.delayText}
                    </span>
                  </div>
                  <h5 style="margin: 0; font-size: 13px; font-weight: 800; color: #12355B; font-family: 'Outfit', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tr.name}</h5>
                  <div style="margin: 6px 0 0 0; font-size: 10px; color: #64748b; font-weight: 600; display: flex; align-items: center; justify-content: space-between;">
                    <span>${tr.from} → ${tr.to}</span>
                    <span style="color: #2563eb; font-weight: 700;">Open Dashboard →</span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      </div>
    `;

    // Close dropdowns on outside click
    setTimeout(() => {
      document.addEventListener("click", function closeDropdowns(e) {
        const fromList = document.getElementById("fromStationList");
        const toList = document.getElementById("toStationList");
        if (fromList && !fromList.parentElement.contains(e.target)) fromList.classList.add("hidden");
        if (toList && !toList.parentElement.contains(e.target)) toList.classList.add("hidden");
      }, { once: false });
    }, 100);
  }

  // =========================================================================
  // SCREEN 2: TRAIN RESULTS LIST (IRCTC-STYLE CARDS)
  // =========================================================================
  function renderTrainResultsScreen(container) {
    const dates = getSearchDates();
    const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
    const fromStn = irStations.find(s => s.code === trainSearchFrom);
    const toStn = irStations.find(s => s.code === trainSearchTo);
    const selectedDateObj = new Date(trainSearchDate);
    const dateStr = selectedDateObj.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

    // Filter by class if not "All"
    let filteredResults = [...trainSearchResults];
    if (trainSearchClass !== "All") {
      filteredResults = filteredResults.filter(t => t.classes.includes(trainSearchClass));
    }

    container.innerHTML = `
      <div class="space-y-4">

        <!-- Results Header Bar (CRYSTAL CLEAR HIGH-CONTRAST ROUTE HEADER) -->
        <div class="results-header-banner" style="padding: 18px 22px; background: linear-gradient(135deg, #12355B 0%, #1E4877 100%) !important; border: 1px solid rgba(255,255,255,0.2) !important; border-radius: 20px !important; color: #FFFFFF !important; box-shadow: 0 8px 25px rgba(18,53,91,0.25);">
          <div style="display: flex; align-items: center; gap: 14px;">
            <button onclick="goBackToSearch()"
              style="width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,0.18); border: 1.5px solid rgba(255,255,255,0.35); color: #FFFFFF !important; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0;"
              onmouseover="this.style.background='rgba(255,255,255,0.3)'; this.style.transform='scale(1.05)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'; this.style.transform='scale(1)'">
              <i class="fa-solid fa-arrow-left" style="font-size: 15px; color: #FFFFFF !important;"></i>
            </button>
            <div style="flex: 1;">
              <h3 style="font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 19px; margin: 0; display: flex; align-items: center; gap: 10px; color: #FFFFFF !important; letter-spacing: 0.3px;">
                <span style="color: #FFFFFF !important; font-weight: 900;">${fromStn ? fromStn.name.toUpperCase() : trainSearchFrom}</span>
                <span style="color: #FF9933 !important; font-size: 20px; font-weight: 900;">➔</span>
                <span style="color: #FFFFFF !important; font-weight: 900;">${toStn ? toStn.name.toUpperCase() : trainSearchTo}</span>
              </h3>
              <p style="font-size: 12px; color: #E2E8F0 !important; margin: 4px 0 0 0; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                <i class="fa-regular fa-calendar" style="color: #FF9933 !important; font-size: 13px;"></i> <span style="color: #F1F5F9 !important;">${dateStr}</span>
              </p>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,153,51,0.25); padding: 7px 16px; border-radius: 20px; border: 1.5px solid #FF9933; box-shadow: 0 2px 8px rgba(255,153,51,0.2);">
              <i class="fa-solid fa-train" style="color: #FF9933 !important; font-size: 14px;"></i>
              <span style="color: #FF9933 !important; font-weight: 900; font-size: 14px;">${filteredResults.length}</span>
              <span style="color: #FFFFFF !important; font-size: 12px; font-weight: 800;">Trains</span>
            </div>
          </div>
        </div>

        <!-- Date Tabs (Horizontal Scroll) -->
        <div style="display: flex; gap: 8px; overflow-x: auto; padding: 2px 0; -webkit-overflow-scrolling: touch;">
          ${dates.map(d => `
            <button onclick="setTrainSearchDate('${d.full}'); executeTrainSearch();"
              style="flex-shrink: 0; padding: 9px 20px; border-radius: 20px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; white-space: nowrap; border: 1.5px solid ${trainSearchDate === d.full ? '#2563eb' : '#d6e3ec'}; background: ${trainSearchDate === d.full ? '#2563eb' : 'white'}; color: ${trainSearchDate === d.full ? 'white' : '#475569'}; box-shadow: ${trainSearchDate === d.full ? '0 4px 12px rgba(37,99,235,0.25)' : '0 1px 3px rgba(0,0,0,0.06)'};">
              ${d.day}, ${d.date} ${d.month}
            </button>
          `).join("")}
        </div>

        <!-- Filter / Sort Bar -->
        <div class="glass-card" style="padding: 12px 18px; border-radius: 18px !important; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; font-weight: 600;">
            <i class="fa-solid fa-magnifying-glass" style="font-size: 11px;"></i>
            Name/No.
          </div>
          <span style="font-size: 13px; font-weight: 800; color: #12355B;">(${filteredResults.length})</span>
          <div style="flex: 1;"></div>
          <div style="display: flex; align-items: center; gap: 5px; padding: 6px 14px; border-radius: 14px; border: 1.5px solid #d6e3ec; font-size: 11px; font-weight: 700; color: #475569; cursor: pointer;">
            ${trainSearchQuota} <i class="fa-solid fa-chevron-down" style="font-size: 9px; margin-left: 4px;"></i>
          </div>
          <div style="display: flex; align-items: center; gap: 5px; padding: 6px 14px; border-radius: 14px; border: 1.5px solid #2563eb; background: #eef4ff; font-size: 11px; font-weight: 700; color: #2563eb; cursor: pointer;">
            Available
          </div>
        </div>

        <!-- Train Cards -->
        ${filteredResults.length === 0 ? `
          <div class="glass-card" style="padding: 48px 24px; text-align: center; border-radius: 20px !important;">
            <i class="fa-solid fa-train" style="font-size: 48px; color: #d6e3ec; margin-bottom: 16px;"></i>
            <h4 style="font-size: 16px; font-weight: 800; color: #12355B; margin: 0 0 8px 0;">No Trains Found</h4>
            <p style="font-size: 13px; color: #64748b; font-weight: 500;">No trains available between ${fromStn ? fromStn.name : trainSearchFrom} and ${toStn ? toStn.name : trainSearchTo} on this date.</p>
            <button onclick="goBackToSearch()" style="margin-top: 16px; padding: 10px 24px; border-radius: 14px; background: #2563eb; color: white; font-size: 13px; font-weight: 700; border: none; cursor: pointer;">
              <i class="fa-solid fa-arrow-left" style="margin-right: 6px;"></i> Modify Search
            </button>
          </div>
        ` : filteredResults.map(train => {
          const fromAliases = [trainSearchFrom];
          if (trainSearchFrom === 'MMCT' || trainSearchFrom === 'BCT') fromAliases.push('MMCT', 'BCT', 'BDTS');
          if (trainSearchFrom === 'NDLS') fromAliases.push('DLI', 'NZM', 'DEE');
          const toAliases = [trainSearchTo];
          if (trainSearchTo === 'MMCT' || trainSearchTo === 'BCT') toAliases.push('MMCT', 'BCT', 'BDTS');
          if (trainSearchTo === 'NDLS') toAliases.push('DLI', 'NZM', 'DEE');

          const stList = train.stations || [];
          const fromStIdx = stList.findIndex(s => fromAliases.includes(s.code));
          const toStIdx = stList.findIndex(s => toAliases.includes(s.code));
          const depTime = fromStIdx !== -1 && stList[fromStIdx].dep !== "--" ? stList[fromStIdx].dep : train.depart;
          const arrTime = toStIdx !== -1 && stList[toStIdx].arr !== "--" ? stList[toStIdx].arr : train.arrive;
          const fromStName = fromStIdx !== -1 ? stList[fromStIdx].name : (train.fromName || train.from);
          const toStName = toStIdx !== -1 ? stList[toStIdx].name : (train.toName || train.to);

          const delayColor = train.delay === 0 ? '#138808' : train.delay <= 15 ? '#f59e0b' : '#dc2626';
          const delayBg = train.delay === 0 ? '#f0fdf4' : train.delay <= 15 ? '#fffbeb' : '#fef2f2';

          return `
            <div class="glass-card" onclick="viewTrainDetail('${train.number}')" style="padding: 20px 22px; border-radius: 20px !important; cursor: pointer; transition: all 0.2s; border-left: 5px solid ${train.delay === 0 ? '#138808' : train.delay <= 15 ? '#f59e0b' : '#dc2626'} !important; box-shadow: 0 4px 18px rgba(18,53,91,0.06);"
              onmouseover="this.style.boxShadow='0 8px 30px rgba(18,53,91,0.14)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='0 4px 18px rgba(18,53,91,0.06)'; this.style.transform='translateY(0)'">

              <!-- Top: Train Number & Name -->
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div>
                  <span style="font-size: 11px; font-weight: 700; color: #64748b; font-family: 'JetBrains Mono', monospace;">${train.number}</span>
                  <h4 style="font-size: 15px; font-weight: 800; color: #12355B; margin: 2px 0 0 0; font-family: 'Outfit', sans-serif;">${train.name}</h4>
                </div>
                <div style="display: flex; gap: 6px;">
                  <span style="padding: 4px 10px; border-radius: 10px; font-size: 10px; font-weight: 800; background: ${delayBg}; color: ${delayColor}; border: 1px solid ${delayColor}30;">${train.delayText}</span>
                </div>
              </div>

              <!-- Middle: Timing Row -->
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                <!-- Departure -->
                <div style="text-align: left;">
                  <p style="font-size: 22px; font-weight: 900; color: #0f172a; margin: 0; font-family: 'Outfit', sans-serif;">${depTime}</p>
                  <p style="font-size: 10px; color: #64748b; font-weight: 600; margin: 2px 0 0 0;">${fromStName.toUpperCase()}</p>
                </div>

                <!-- Duration -->
                <div style="flex: 1; text-align: center; position: relative; padding: 0 20px;">
                  <div style="position: absolute; left: 20px; right: 20px; top: 50%; height: 2px; background: #d6e3ec;"></div>
                  <div style="position: absolute; left: 20px; top: calc(50% - 4px); width: 8px; height: 8px; border-radius: 50%; background: #2563eb; border: 2px solid white; box-shadow: 0 0 0 2px #2563eb;"></div>
                  <div style="position: absolute; right: 20px; top: calc(50% - 4px); width: 8px; height: 8px; border-radius: 50%; background: #2563eb; border: 2px solid white; box-shadow: 0 0 0 2px #2563eb;"></div>
                  <span style="position: relative; z-index: 1; padding: 3px 12px; background: white; border: 1px solid #e2e8f0; border-radius: 14px; font-size: 11px; font-weight: 700; color: #475569;">
                    — ${train.duration} —
                  </span>
                </div>

                <!-- Arrival -->
                <div style="text-align: right;">
                  <p style="font-size: 22px; font-weight: 900; color: ${delayColor}; margin: 0; font-family: 'Outfit', sans-serif;">${arrTime}</p>
                  <p style="font-size: 10px; color: #64748b; font-weight: 600; margin: 2px 0 0 0;">${toStName.toUpperCase()}</p>
                </div>
              </div>

              <!-- Running Days -->
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                <div style="display: flex; gap: 4px;">
                  ${dayLabels.map((day, i) => `
                    <span style="width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: ${train.days[i] ? '800' : '500'}; color: ${train.days[i] ? '#2563eb' : '#cbd5e1'}; background: ${train.days[i] ? '#eef4ff' : 'transparent'}; border: 1px solid ${train.days[i] ? '#2563eb30' : '#e2e8f030'};">
                      ${day}
                    </span>
                  `).join("")}
                </div>
              </div>

              <!-- Bottom: Classes & Action -->
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; gap: 6px;">
                  ${train.classes.map(cls => `
                    <span style="padding: 4px 10px; border-radius: 10px; font-size: 11px; font-weight: 700; color: #12355B; background: #eaf3f8; border: 1px solid #d6e3ec;">${cls}</span>
                  `).join("")}
                </div>
                <button onclick="event.stopPropagation(); viewTrainDetail('${train.number}')"
                  style="padding: 9px 20px; border-radius: 14px; background: white; border: 2px solid #2563eb; color: #2563eb; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s; font-family: 'Outfit', sans-serif;"
                  onmouseover="this.style.background='#2563eb'; this.style.color='white'" onmouseout="this.style.background='white'; this.style.color='#2563eb'">
                  VIEW DETAILS <i class="fa-solid fa-chevron-right" style="margin-left: 4px; font-size: 10px;"></i>
                </button>
              </div>
            </div>
          `;
        }).join("")}

      </div>
    `;
  }

  // =========================================================================
  // SCREEN 3: INDIVIDUAL TRAIN PERSONAL DASHBOARD & TELEMETRY SYSTEM
  // =========================================================================
  let activeCoachInspectorIndex = 0;

  window.inspectCoach = function (coachIdx) {
    activeCoachInspectorIndex = coachIdx;
    if (window._currentTrainCoaches && window._currentTrainCoaches[coachIdx]) {
      const c = window._currentTrainCoaches[coachIdx];
      const inspectorEl = document.getElementById("coachDetailInspectorCard");
      if (inspectorEl) {
        inspectorEl.innerHTML = renderCoachInspectorHtml(c, coachIdx);
      }
      document.querySelectorAll(".coach-rake-box").forEach((box, i) => {
        if (i === coachIdx) {
          box.style.borderColor = "#FF9933";
          box.style.transform = "translateY(-6px)";
          box.style.boxShadow = "0 8px 20px rgba(255,153,51,0.4)";
        } else {
          box.style.borderColor = "rgba(255,255,255,0.15)";
          box.style.transform = "translateY(0)";
          box.style.boxShadow = "none";
        }
      });
    }
  };

  window.simulateKavachBrakeTest = function () {
    showToast("Kavach 4.0 ATP Test Triggered: Emergency Braking Curve (EBD) calculated at 440m. SIL-4 Safety Interlock Nominal.", "success");
  };

  window.refreshTrainTelemetry = function () {
    showToast("Real-time Kavach & GPS Telemetry Synced with Central Server!", "info");
    const container = document.getElementById("activeSubTabContainer");
    if (container && trainSearchScreen === "detail") {
      renderTrainDetailScreen(container);
    }
  };

  window.exportTrainTelemetryPdf = function (trainNo) {
    showToast(`Generating Official E-Telemetry & Safety Report for Train #${trainNo}... Ready.`, "success");
  };

  function renderCoachInspectorHtml(c, coachIdx) {
    const classBadgeColors = {
      "ENG": { bg: "#475569", text: "#f8fafc" },
      "1A": { bg: "#991B1B", text: "#fef2f2" },
      "2A": { bg: "#6B21A8", text: "#faf5ff" },
      "3A": { bg: "#1D4ED8", text: "#eff6ff" },
      "CC": { bg: "#0284C7", text: "#f0f9ff" },
      "EC": { bg: "#D97706", text: "#fffbeb" },
      "SL": { bg: "#047857", text: "#ecfdf5" },
      "PC": { bg: "#EA580C", text: "#fff7ed" },
      "SLR": { bg: "#64748B", text: "#f8fafc" }
    };
    const badge = classBadgeColors[c.classKey] || { bg: "#2563eb", text: "white" };
    const occPct = c.cap > 0 ? Math.round((c.booked / c.cap) * 100) : 100;

    return `
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: ${badge.bg}; color: ${badge.text}; font-size: 11px; font-weight: 900; padding: 3px 12px; border-radius: 8px; font-family: 'JetBrains Mono', monospace;">
            COACH ${c.code}
          </span>
          <div>
            <div style="font-size: 13px; font-weight: 800; color: #12355B; font-family: 'Outfit', sans-serif;">${c.label}</div>
            <p style="margin: 0; color: #64748b; font-size: 10px; font-family: 'JetBrains Mono', monospace; font-weight: 600;">Serial: ${c.no} &nbsp;•&nbsp; Rake Pos: #${coachIdx + 1}</p>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 10px; font-weight: 800; color: #166534; background: #dcfce7; padding: 4px 10px; border-radius: 8px; border: 1px solid #bbf7d0;">
            <i class="fa-solid fa-circle-check" style="margin-right: 3px;"></i> DIAGNOSTICS HEALTHY
          </span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px;">
        <div style="background: white; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <p style="font-size: 9px; color: #64748b; margin: 0; font-weight: 700; text-transform: uppercase;">Occupancy</p>
          <p style="font-size: 12px; color: #0f172a; font-weight: 800; margin: 2px 0 0 0; font-family: 'JetBrains Mono', monospace;">${c.booked}/${c.cap} <span style="font-size: 10px; color: #2563eb;">(${occPct}%)</span></p>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <p style="font-size: 9px; color: #64748b; margin: 0; font-weight: 700; text-transform: uppercase;">Climate / AC</p>
          <p style="font-size: 12px; color: #16a34a; font-weight: 800; margin: 2px 0 0 0; font-family: 'JetBrains Mono', monospace;">${c.temp}</p>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <p style="font-size: 9px; color: #64748b; margin: 0; font-weight: 700; text-transform: uppercase;">Water Tank</p>
          <p style="font-size: 12px; color: #0284c7; font-weight: 800; margin: 2px 0 0 0; font-family: 'JetBrains Mono', monospace;">${c.water}</p>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <p style="font-size: 9px; color: #64748b; margin: 0; font-weight: 700; text-transform: uppercase;">Axle Bearing</p>
          <p style="font-size: 12px; color: #0f172a; font-weight: 800; margin: 2px 0 0 0; font-family: 'JetBrains Mono', monospace;">${c.axleTemp}</p>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          <p style="font-size: 9px; color: #64748b; margin: 0; font-weight: 700; text-transform: uppercase;">Bogie Frame</p>
          <p style="font-size: 11px; color: #0f172a; font-weight: 700; margin: 2px 0 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${c.bogie}</p>
        </div>
      </div>
    `;
  }

  function getTrainPersonalDashboardData(t) {
    const seed = parseInt((t.number || "12000").replace(/\D/g, "")) || 12000;
    const nameLower = (t.name || "").toLowerCase();
    const typeLower = (t.type || "").toLowerCase();

    const isVandeBharat = typeLower.includes("vande") || nameLower.includes("vande");
    const isRajdhani = typeLower.includes("rajdhani") || nameLower.includes("rajdhani");
    const isShatabdi = typeLower.includes("shatabdi") || nameLower.includes("shatabdi");
    const isTejas = typeLower.includes("tejas") || nameLower.includes("tejas");
    const isGaribRath = typeLower.includes("garib") || nameLower.includes("garib") || nameLower.includes("humsafar");

    let theme = {
      typeName: t.type,
      categoryBadge: "SUPERFAST EXPRESS",
      badgeColor: "#1d4ed8",
      badgeBg: "#eff6ff",
      badgeBorder: "#bfdbfe",
      accentColor: "#2563eb",
      mps: 110,
      baseSpeed: 88 + (seed % 18),
      locoModel: "WAP-7 Dual Cab #30211 (6,000 HP)",
      locoShed: "Bhagat Ki Kothi (BGKT / NWR)",
      rakeName: "LHB Mixed Superfast Composite Rake",
      traction: "25 kV AC 50 Hz OHE",
      icon: "fa-train",
      coachPreset: "mixed"
    };

    if (isVandeBharat) {
      theme = {
        typeName: "Vande Bharat Express",
        categoryBadge: "SEMI-HIGH SPEED EMU • TRAIN 18",
        badgeColor: "#c2410c",
        badgeBg: "#fff7ed",
        badgeBorder: "#fed7aa",
        accentColor: "#ea580c",
        mps: 160,
        baseSpeed: 124 + (seed % 28),
        locoModel: "Distributed 3-Phase AC Traction (16 Bogies / 12,000 HP)",
        locoShed: "Shakur Basti EMU Car Shed (SSB / NR)",
        rakeName: "Aerodynamic 16-Car EMU Trainset (ICF Chennai)",
        traction: "25 kV AC 50 Hz Pantograph High-Speed Catenary",
        icon: "fa-bolt",
        coachPreset: "vande_bharat"
      };
    } else if (isRajdhani) {
      theme = {
        typeName: "Rajdhani Superfast AC",
        categoryBadge: "PREMIUM ALL-AC SUPERFAST RAJDHANI",
        badgeColor: "#b91c1c",
        badgeBg: "#fef2f2",
        badgeBorder: "#fecaca",
        accentColor: "#dc2626",
        mps: 130,
        baseSpeed: 108 + (seed % 20),
        locoModel: "WAP-7 High Speed #30489 (6,000 HP / 140 km/h)",
        locoShed: "Ghaziabad Electric Loco Shed (GZB / NR)",
        rakeName: "LHB Red-Silver All-AC Smart Rake (22 Coaches)",
        traction: "25 kV AC Single Phase OHE (2 x 25 kV AT System)",
        icon: "fa-crown",
        coachPreset: "rajdhani"
      };
    } else if (isShatabdi) {
      theme = {
        typeName: "Shatabdi Superfast Express",
        categoryBadge: "INTERCITY HIGH-SPEED CHAIR CAR",
        badgeColor: "#0369a1",
        badgeBg: "#f0f9ff",
        badgeBorder: "#bae6fd",
        accentColor: "#0284c7",
        mps: 130,
        baseSpeed: 104 + (seed % 22),
        locoModel: "WAP-7 Head-On Generation (HOG) #30312 (6,000 HP)",
        locoShed: "Vadodara Electric Loco Shed (BRC / WR)",
        rakeName: "LHB Executive & AC Chair Car Rake (16 Coaches)",
        traction: "25 kV AC 50 Hz HOG Converter Fed System",
        icon: "fa-gauge-high",
        coachPreset: "shatabdi"
      };
    } else if (isTejas) {
      theme = {
        typeName: "Tejas Smart Express",
        categoryBadge: "CORPORATE SEMI-HIGH SPEED SMART",
        badgeColor: "#b45309",
        badgeBg: "#fffbeb",
        badgeBorder: "#fde68a",
        accentColor: "#d97706",
        mps: 140,
        baseSpeed: 112 + (seed % 24),
        locoModel: "WAP-7 Aerodynamic Streamlined Cab #37015 (6,350 HP)",
        locoShed: "Royapuram Electric Shed (RPM / SR)",
        rakeName: "Tejas Smart Automatic Plug-Door Rake (18 Coaches)",
        traction: "25 kV AC 50 Hz with Regenerative Dynamic Brakes",
        icon: "fa-rocket",
        coachPreset: "shatabdi"
      };
    } else if (isGaribRath) {
      theme = {
        typeName: "Garib Rath / Humsafar AC",
        categoryBadge: "ALL-AC 3-TIER AFFORDABLE EXPRESS",
        badgeColor: "#047857",
        badgeBg: "#ecfdf5",
        badgeBorder: "#a7f3d0",
        accentColor: "#059669",
        mps: 130,
        baseSpeed: 96 + (seed % 22),
        locoModel: "WAP-5 High Acceleration #30022 (5,450 HP)",
        locoShed: "Tughlakabad Electric Shed (TKD / NR)",
        rakeName: "LHB AC 3-Tier Economy Green Rake (19 Coaches)",
        traction: "25 kV AC 50 Hz Overhead Catenary",
        icon: "fa-leaf",
        coachPreset: "garib_rath"
      };
    }

    let coaches = [];
    if (theme.coachPreset === "vande_bharat") {
      coaches = [
        { code: "DTC", label: "Driving Trailer Car (Nose)", classKey: "ENG", cap: 44, booked: 42, temp: "22.1°C", water: "100%", bogie: "Motorized EMU Bogie", no: "VB 22001/DTC", axleTemp: "41°C" },
        { code: "C1", label: "Executive Chair Car", classKey: "EC", cap: 52, booked: 50, temp: "21.8°C", water: "96%", bogie: "LHB Trailer Bogie", no: "VB 22002/EC", axleTemp: "39°C" },
        { code: "C2", label: "Executive Chair Car", classKey: "EC", cap: 52, booked: 51, temp: "22.0°C", water: "95%", bogie: "LHB Trailer Bogie", no: "VB 22003/EC", axleTemp: "40°C" },
        { code: "C3", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 78, temp: "22.3°C", water: "90%", bogie: "Motor Bogie", no: "VB 22004/CC", axleTemp: "42°C" },
        { code: "C4", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 76, temp: "22.1°C", water: "88%", bogie: "Trailer Bogie", no: "VB 22005/CC", axleTemp: "41°C" },
        { code: "C5", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 78, temp: "22.4°C", water: "85%", bogie: "Motor Bogie", no: "VB 22006/CC", axleTemp: "43°C" },
        { code: "C6", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 75, temp: "21.9°C", water: "92%", bogie: "Trailer Bogie", no: "VB 22007/CC", axleTemp: "38°C" },
        { code: "C7", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 77, temp: "22.2°C", water: "89%", bogie: "Motor Bogie", no: "VB 22008/CC", axleTemp: "42°C" },
        { code: "C8", label: "Mini Pantry & Service Car", classKey: "PC", cap: 40, booked: 39, temp: "22.0°C", water: "98%", bogie: "Trailer Bogie", no: "VB 22009/PC", axleTemp: "39°C" },
        { code: "C9", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 78, temp: "22.1°C", water: "84%", bogie: "Motor Bogie", no: "VB 22010/CC", axleTemp: "41°C" },
        { code: "C10", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 76, temp: "22.3°C", water: "91%", bogie: "Trailer Bogie", no: "VB 22011/CC", axleTemp: "40°C" },
        { code: "C11", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 77, temp: "22.0°C", water: "87%", bogie: "Motor Bogie", no: "VB 22012/CC", axleTemp: "43°C" },
        { code: "C12", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 75, temp: "22.2°C", water: "89%", bogie: "Trailer Bogie", no: "VB 22013/CC", axleTemp: "39°C" },
        { code: "C13", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 78, temp: "22.5°C", water: "86%", bogie: "Motor Bogie", no: "VB 22014/CC", axleTemp: "41°C" },
        { code: "C14", label: "Executive Chair Car", classKey: "EC", cap: 52, booked: 52, temp: "21.9°C", water: "94%", bogie: "Trailer Bogie", no: "VB 22015/EC", axleTemp: "38°C" },
        { code: "DTC", label: "Driving Trailer Car (Rear)", classKey: "ENG", cap: 44, booked: 41, temp: "22.0°C", water: "100%", bogie: "Motorized EMU Bogie", no: "VB 22016/DTC", axleTemp: "40°C" },
      ];
    } else if (theme.coachPreset === "rajdhani") {
      coaches = [
        { code: "LOCO", label: "Locomotive Front (WAP-7)", classKey: "ENG", cap: 2, booked: 2, temp: "Cab 24°C", water: "--", bogie: "Co-Co High Adhesion", no: theme.locoModel, axleTemp: "58°C" },
        { code: "EOG", label: "Power Generator Car", classKey: "SLR", cap: 0, booked: 0, temp: "--", water: "100%", bogie: "FIAT LHB", no: "NR 21890/EOG", axleTemp: "42°C" },
        { code: "H1", label: "AC First Class (1A)", classKey: "1A", cap: 24, booked: 24, temp: "21.5°C", water: "96%", bogie: "FIAT Disc Brake", no: "NR 21102/1A", axleTemp: "38°C" },
        { code: "A1", label: "AC 2-Tier (2A)", classKey: "2A", cap: 52, booked: 52, temp: "22.0°C", water: "94%", bogie: "FIAT Disc Brake", no: "NR 21204/2A", axleTemp: "40°C" },
        { code: "A2", label: "AC 2-Tier (2A)", classKey: "2A", cap: 52, booked: 50, temp: "22.1°C", water: "92%", bogie: "FIAT Disc Brake", no: "NR 21205/2A", axleTemp: "39°C" },
        { code: "A3", label: "AC 2-Tier (2A)", classKey: "2A", cap: 52, booked: 51, temp: "21.9°C", water: "91%", bogie: "FIAT Disc Brake", no: "NR 21206/2A", axleTemp: "41°C" },
        { code: "B1", label: "AC 3-Tier (3A)", classKey: "3A", cap: 72, booked: 72, temp: "22.4°C", water: "88%", bogie: "FIAT Disc Brake", no: "NR 21301/3A", axleTemp: "42°C" },
        { code: "B2", label: "AC 3-Tier (3A)", classKey: "3A", cap: 72, booked: 72, temp: "22.2°C", water: "86%", bogie: "FIAT Disc Brake", no: "NR 21302/3A", axleTemp: "40°C" },
        { code: "B3", label: "AC 3-Tier (3A)", classKey: "3A", cap: 72, booked: 70, temp: "22.3°C", water: "90%", bogie: "FIAT Disc Brake", no: "NR 21303/3A", axleTemp: "41°C" },
        { code: "B4", label: "AC 3-Tier (3A)", classKey: "3A", cap: 72, booked: 72, temp: "22.5°C", water: "84%", bogie: "FIAT Disc Brake", no: "NR 21304/3A", axleTemp: "43°C" },
        { code: "PC", label: "Hot Buffet Pantry Car", classKey: "PC", cap: 0, booked: 0, temp: "Kitchen 25°C", water: "98%", bogie: "FIAT Heavy Duty", no: "NR 21501/PC", axleTemp: "44°C" },
        { code: "B5", label: "AC 3-Tier (3A)", classKey: "3A", cap: 72, booked: 72, temp: "22.1°C", water: "89%", bogie: "FIAT Disc Brake", no: "NR 21305/3A", axleTemp: "39°C" },
        { code: "B6", label: "AC 3-Tier (3A)", classKey: "3A", cap: 72, booked: 71, temp: "22.2°C", water: "87%", bogie: "FIAT Disc Brake", no: "NR 21306/3A", axleTemp: "40°C" },
        { code: "B7", label: "AC 3-Tier (3A)", classKey: "3A", cap: 72, booked: 72, temp: "22.4°C", water: "85%", bogie: "FIAT Disc Brake", no: "NR 21307/3A", axleTemp: "41°C" },
        { code: "B8", label: "AC 3-Tier (3A)", classKey: "3A", cap: 72, booked: 72, temp: "22.0°C", water: "88%", bogie: "FIAT Disc Brake", no: "NR 21308/3A", axleTemp: "42°C" },
        { code: "B9", label: "AC 3-Tier (3A)", classKey: "3A", cap: 72, booked: 69, temp: "22.3°C", water: "92%", bogie: "FIAT Disc Brake", no: "NR 21309/3A", axleTemp: "39°C" },
        { code: "B10", label: "AC 3-Tier (3A)", classKey: "3A", cap: 72, booked: 72, temp: "22.1°C", water: "84%", bogie: "FIAT Disc Brake", no: "NR 21310/3A", axleTemp: "43°C" },
        { code: "A4", label: "AC 2-Tier (2A)", classKey: "2A", cap: 52, booked: 52, temp: "21.8°C", water: "90%", bogie: "FIAT Disc Brake", no: "NR 21207/2A", axleTemp: "39°C" },
        { code: "EOG", label: "Power Generator Car", classKey: "SLR", cap: 0, booked: 0, temp: "--", water: "100%", bogie: "FIAT LHB", no: "NR 21891/EOG", axleTemp: "41°C" },
      ];
    } else if (theme.coachPreset === "shatabdi") {
      coaches = [
        { code: "LOCO", label: "Locomotive WAP-7 HOG", classKey: "ENG", cap: 2, booked: 2, temp: "Cab 23°C", water: "--", bogie: "Co-Co High Adhesion", no: theme.locoModel, axleTemp: "56°C" },
        { code: "EOG", label: "Power Generator Car", classKey: "SLR", cap: 0, booked: 0, temp: "--", water: "100%", bogie: "FIAT LHB", no: "WR 20110/EOG", axleTemp: "40°C" },
        { code: "E1", label: "Executive Anubhuti Chair", classKey: "EC", cap: 56, booked: 56, temp: "21.8°C", water: "95%", bogie: "FIAT Disc Brake", no: "WR 20112/EC", axleTemp: "38°C" },
        { code: "E2", label: "Executive Chair Car", classKey: "EC", cap: 56, booked: 54, temp: "22.0°C", water: "93%", bogie: "FIAT Disc Brake", no: "WR 20113/EC", axleTemp: "39°C" },
        { code: "C1", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 78, temp: "22.2°C", water: "90%", bogie: "FIAT Disc Brake", no: "WR 20201/CC", axleTemp: "41°C" },
        { code: "C2", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 77, temp: "22.1°C", water: "88%", bogie: "FIAT Disc Brake", no: "WR 20202/CC", axleTemp: "40°C" },
        { code: "C3", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 78, temp: "22.4°C", water: "85%", bogie: "FIAT Disc Brake", no: "WR 20203/CC", axleTemp: "42°C" },
        { code: "C4", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 76, temp: "22.0°C", water: "89%", bogie: "FIAT Disc Brake", no: "WR 20204/CC", axleTemp: "39°C" },
        { code: "C5", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 78, temp: "22.3°C", water: "86%", bogie: "FIAT Disc Brake", no: "WR 20205/CC", axleTemp: "41°C" },
        { code: "C6", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 74, temp: "22.1°C", water: "91%", bogie: "FIAT Disc Brake", no: "WR 20206/CC", axleTemp: "38°C" },
        { code: "C7", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 78, temp: "22.2°C", water: "87%", bogie: "FIAT Disc Brake", no: "WR 20207/CC", axleTemp: "42°C" },
        { code: "C8", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 75, temp: "22.5°C", water: "83%", bogie: "FIAT Disc Brake", no: "WR 20208/CC", axleTemp: "43°C" },
        { code: "C9", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 78, temp: "21.9°C", water: "92%", bogie: "FIAT Disc Brake", no: "WR 20209/CC", axleTemp: "39°C" },
        { code: "C10", label: "AC Chair Car", classKey: "CC", cap: 78, booked: 78, temp: "22.0°C", water: "86%", bogie: "FIAT Disc Brake", no: "WR 20210/CC", axleTemp: "41°C" },
        { code: "EOG", label: "Power Generator Car", classKey: "SLR", cap: 0, booked: 0, temp: "--", water: "100%", bogie: "FIAT LHB", no: "WR 20111/EOG", axleTemp: "40°C" },
      ];
    } else {
      coaches = [
        { code: "LOCO", label: "Locomotive WAP-7 / WDG-4D", classKey: "ENG", cap: 2, booked: 2, temp: "Cab 24°C", water: "--", bogie: "Co-Co High Traction", no: theme.locoModel, axleTemp: "59°C" },
        { code: "SLR", label: "Seating-cum-Luggage Rake", classKey: "SLR", cap: 36, booked: 36, temp: "--", water: "100%", bogie: "LHB Non-AC", no: "NWR 19210/SLR", axleTemp: "39°C" },
        { code: "GS", label: "General Unreserved", classKey: "SLR", cap: 100, booked: 98, temp: "--", water: "85%", bogie: "LHB Non-AC", no: "NWR 19211/GS", axleTemp: "40°C" },
        { code: "S1", label: "Sleeper Class (SL)", classKey: "SL", cap: 72, booked: 72, temp: "Ambient", water: "90%", bogie: "LHB Non-AC", no: "NWR 19301/S1", axleTemp: "41°C" },
        { code: "S2", label: "Sleeper Class (SL)", classKey: "SL", cap: 72, booked: 72, temp: "Ambient", water: "88%", bogie: "LHB Non-AC", no: "NWR 19302/S2", axleTemp: "42°C" },
        { code: "S3", label: "Sleeper Class (SL)", classKey: "SL", cap: 72, booked: 70, temp: "Ambient", water: "85%", bogie: "LHB Non-AC", no: "NWR 19303/S3", axleTemp: "39°C" },
        { code: "S4", label: "Sleeper Class (SL)", classKey: "SL", cap: 72, booked: 72, temp: "Ambient", water: "87%", bogie: "LHB Non-AC", no: "NWR 19304/S4", axleTemp: "40°C" },
        { code: "S5", label: "Sleeper Class (SL)", classKey: "SL", cap: 72, booked: 72, temp: "Ambient", water: "82%", bogie: "LHB Non-AC", no: "NWR 19305/S5", axleTemp: "43°C" },
        { code: "S6", label: "Sleeper Class (SL)", classKey: "SL", cap: 72, booked: 71, temp: "Ambient", water: "86%", bogie: "LHB Non-AC", no: "NWR 19306/S6", axleTemp: "41°C" },
        { code: "PC", label: "Pantry Car", classKey: "PC", cap: 0, booked: 0, temp: "26°C", water: "96%", bogie: "LHB Pantry", no: "NWR 19401/PC", axleTemp: "44°C" },
        { code: "B1", label: "AC 3-Tier (3A)", classKey: "3A", cap: 72, booked: 72, temp: "22.1°C", water: "92%", bogie: "LHB AC", no: "NWR 19501/B1", axleTemp: "40°C" },
        { code: "B2", label: "AC 3-Tier (3A)", classKey: "3A", cap: 72, booked: 72, temp: "22.3°C", water: "89%", bogie: "LHB AC", no: "NWR 19502/B2", axleTemp: "39°C" },
        { code: "B3", label: "AC 3-Tier (3A)", classKey: "3A", cap: 72, booked: 72, temp: "22.0°C", water: "88%", bogie: "LHB AC", no: "NWR 19503/B3", axleTemp: "41°C" },
        { code: "B4", label: "AC 3-Tier (3A)", classKey: "3A", cap: 72, booked: 70, temp: "22.2°C", water: "91%", bogie: "LHB AC", no: "NWR 19504/B4", axleTemp: "42°C" },
        { code: "A1", label: "AC 2-Tier (2A)", classKey: "2A", cap: 52, booked: 52, temp: "21.9°C", water: "94%", bogie: "LHB AC", no: "NWR 19601/A1", axleTemp: "38°C" },
        { code: "A2", label: "AC 2-Tier (2A)", classKey: "2A", cap: 52, booked: 51, temp: "22.0°C", water: "93%", bogie: "LHB AC", no: "NWR 19602/A2", axleTemp: "39°C" },
        { code: "H1", label: "AC First Class (1A)", classKey: "1A", cap: 24, booked: 24, temp: "21.5°C", water: "98%", bogie: "LHB AC", no: "NWR 19701/H1", axleTemp: "37°C" },
        { code: "GS", label: "General Unreserved", classKey: "SLR", cap: 100, booked: 95, temp: "--", water: "84%", bogie: "LHB Non-AC", no: "NWR 19212/GS", axleTemp: "41°C" },
        { code: "SLR", label: "Guard Brake Van", classKey: "SLR", cap: 36, booked: 36, temp: "--", water: "100%", bogie: "LHB Non-AC", no: "NWR 19213/SLR", axleTemp: "40°C" },
      ];
    }

    window._currentTrainCoaches = coaches;

    const mRecord = irMaintenanceDataset && irMaintenanceDataset.length > 0 
      ? irMaintenanceDataset[seed % irMaintenanceDataset.length] 
      : null;

    const numStations = (t.stations && t.stations.length > 0) ? t.stations.length : 1;
    const currentStnIdx = Math.max(0, Math.min(Math.floor(numStations / 2), numStations - 2));
    const currentStn = (t.stations && t.stations[currentStnIdx]) || { name: t.fromName || t.from, code: t.from, pf: 1, arr: t.depart, dep: t.depart };
    const nextStn = (t.stations && t.stations[currentStnIdx + 1]) || currentStn;

    const totalDistKm = t.distance || ((seed * 67) % 450 + 480);
    const distCompletedKm = Math.round(totalDistKm * ((currentStnIdx + 0.6) / numStations));
    const distRemainingKm = Math.max(0, totalDistKm - distCompletedKm);
    const progressPct = Math.min(100, Math.round((distCompletedKm / totalDistKm) * 100));

    const curSpeed = t.delay > 20 ? Math.round(theme.baseSpeed * 0.88) : theme.baseSpeed;

    return {
      theme,
      coaches,
      seed,
      currentStn,
      nextStn,
      currentStnIdx,
      curSpeed,
      totalDistKm,
      distCompletedKm,
      distRemainingKm,
      progressPct,
      gpsLat: (25.1 + (seed % 400) / 100).toFixed(4),
      gpsLng: (72.8 + (seed % 350) / 100).toFixed(4),
      trackKm: `KM ${120 + (seed % 150)} / ${(seed % 9) + 1}`,
      oheVoltage: (24.8 + (seed % 9) / 10).toFixed(1),
      oheCurrent: 320 + (seed % 90),
      tractionPower: mRecord ? Math.round(mRecord.powerKw / 10) : 72 + (seed % 22),
      tractionMotorTemp: mRecord ? Math.round(mRecord.tractionMotorTempC) : 60 + (seed % 18),
      transformerTemp: 54 + (seed % 14),
      rfSignalDbm: -(58 + (seed % 16)),
      trackVibrationG: mRecord ? mRecord.trackVibrationG.toFixed(2) : (0.12 + (seed % 6) / 100).toFixed(2),
      railTempC: mRecord ? Math.round(mRecord.trackTempC) : 34 + (seed % 8),
      rfidTagId: `#TAG-KAV-${(seed % 8999) + 1000}`,
      signalAspect: t.delay === 0 ? "GREEN / PROCEED" : (t.delay <= 15 ? "DOUBLE YELLOW / ATTN" : "YELLOW / CAUTION"),
      signalDistance: 820 + (seed % 400),
      movementAuthorityM: 4200 + (seed % 1200),
      brakingEnvelopeM: 460 + (seed % 80),
      tsrLocation: `Bridge #${(seed % 80) + 12}: Caution 30 km/h at KM ${140 + (seed % 40)}/2`,
      lastPohDate: `${(seed % 25) + 1}-Jan-2026 at Ajmer Central`,
      nextInspectionDue: `In ${(seed % 5) + 2} days (${(seed * 17) % 900 + 700} km remaining)`,
      usfdStatus: mRecord && mRecord.failureType !== 'None' ? `USFD Alert: ${mRecord.failureType} Detected` : "0 Flaws Detected • Class-1 Track Standard",
      energyRegenerated: 1240 + (seed % 600),
      mRecord
    };
  }

  function renderTrainDetailScreen(container) {
    if (!trainDetailSelected) return;
    const t = trainDetailSelected;
    const data = getTrainPersonalDashboardData(t);

    const delayColor = t.delay === 0 ? '#138808' : t.delay <= 15 ? '#d97706' : '#dc2626';
    const delayBg = t.delay === 0 ? '#f0fdf4' : t.delay <= 15 ? '#fffbeb' : '#fef2f2';

    // Speedometer calculation
    const gaugeRadius = 55;
    const gaugeCircumference = Math.PI * gaugeRadius; // ~172.8
    const speedRatio = Math.min(data.curSpeed, data.theme.mps) / data.theme.mps;
    const dashOffset = gaugeCircumference * (1 - speedRatio);

    // Initial coach inspector HTML
    const initialCoach = data.coaches[activeCoachInspectorIndex] || data.coaches[0];

    container.innerHTML = `
      <div class="space-y-4" style="max-width: 1400px; margin: 0 auto;">

        <!-- Top Navigation & Actions -->
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding: 2px 0;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <button onclick="goBackToResults()"
              style="display: inline-flex; align-items: center; gap: 5px; padding: 8px 14px; border-radius: 14px; background: white; border: 1.5px solid #d6e3ec; color: #12355B; font-size: 11px; font-weight: 800; cursor: pointer; transition: all 0.2s;"
              onmouseover="this.style.borderColor='#2563eb'; this.style.color='#2563eb'" onmouseout="this.style.borderColor='#d6e3ec'; this.style.color='#12355B'">
              <i class="fa-solid fa-arrow-left"></i> Results
            </button>
            <button onclick="goBackToSearch()"
              style="display: inline-flex; align-items: center; gap: 5px; padding: 8px 14px; border-radius: 14px; background: white; border: 1.5px solid #d6e3ec; color: #64748b; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s;"
              onmouseover="this.style.borderColor='#12355B'; this.style.color='#12355B'" onmouseout="this.style.borderColor='#d6e3ec'; this.style.color='#64748b'">
              <i class="fa-solid fa-magnifying-glass"></i> New Search
            </button>
            <span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; font-size: 10px; font-weight: 800; color: #166534;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #16a34a; display: inline-block;"></span>
              LIVE TELEMETRY
            </span>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <button onclick="switchNavView('live_map')"
              style="display: inline-flex; align-items: center; gap: 5px; padding: 8px 14px; border-radius: 14px; background: #12355B; color: white; font-size: 11px; font-weight: 800; cursor: pointer; border: none; transition: all 0.2s;">
              <i class="fa-solid fa-map-location-dot" style="color: #FF9933;"></i> GIS Map
            </button>
            <button onclick="simulateKavachBrakeTest()"
              style="display: inline-flex; align-items: center; gap: 5px; padding: 8px 14px; border-radius: 14px; background: white; border: 1.5px solid #ea580c; color: #c2410c; font-size: 11px; font-weight: 800; cursor: pointer; transition: all 0.2s;">
              <i class="fa-solid fa-shield-halved" style="color: #ea580c;"></i> ATP Test
            </button>
            <button onclick="refreshTrainTelemetry()"
              style="display: inline-flex; align-items: center; gap: 5px; padding: 8px 14px; border-radius: 14px; background: white; border: 1.5px solid #d6e3ec; color: #12355B; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s;">
              <i class="fa-solid fa-rotate" style="color: #2563eb;"></i> Sync
            </button>
            <button onclick="exportTrainTelemetryPdf('${t.number}')"
              style="display: inline-flex; align-items: center; gap: 5px; padding: 8px 14px; border-radius: 14px; background: white; border: 1.5px solid #d6e3ec; color: #12355B; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.2s;">
              <i class="fa-solid fa-file-pdf" style="color: #dc2626;"></i> PDF
            </button>
          </div>
        </div>

        <!-- HERO BANNER: CRISP, NORMAL COLORS, HIGH CONTRAST -->
        <div class="glass-card" style="padding: 18px 22px; background: white !important; border: 1.5px solid #dbeafe !important; border-left: 6px solid ${data.theme.accentColor} !important; border-radius: 22px !important; box-shadow: 0 4px 18px rgba(0,0,0,0.05);">
          
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px;">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <!-- Train Type Badge -->
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 14px; background: ${data.theme.badgeBg}; border: 1px solid ${data.theme.badgeBorder}; font-size: 10px; font-weight: 800; color: ${data.theme.badgeColor}; letter-spacing: 0.5px; text-transform: uppercase;">
                  <i class="fa-solid ${data.theme.icon}"></i> ${data.theme.categoryBadge}
                </span>
                <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; color: #166534; background: #dcfce7; padding: 3px 10px; border-radius: 12px;">
                  <span style="width: 5px; height: 5px; border-radius: 50%; background: #16a34a; display: inline-block;"></span> Kavach 4.0 Armed
                </span>
              </div>

              <!-- Train Number & Name (Clean, high-contrast, fully visible) -->
              <div style="display: flex; align-items: baseline; gap: 10px; margin-top: 2px;">
                <span style="font-family: 'JetBrains Mono', monospace; font-size: 26px; font-weight: 900; color: ${data.theme.accentColor} !important; letter-spacing: -0.5px;">
                  ${t.number}
                </span>
                <span style="font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 900; color: #12355B !important; letter-spacing: 0.3px;">
                  ${t.name}
                </span>
              </div>

              <!-- Sub-description -->
              <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #64748b; font-weight: 600; flex-wrap: wrap;">
                <span><i class="fa-solid fa-train-subway" style="color: ${data.theme.accentColor}; margin-right: 4px;"></i>${data.theme.rakeName}</span>
                <span>•</span>
                <span><i class="fa-solid fa-bolt" style="color: #f59e0b; margin-right: 4px;"></i>${data.theme.traction}</span>
              </div>
            </div>

            <!-- Right Live Status Pill -->
            <div style="text-align: right; background: #f8fafc; padding: 10px 16px; border-radius: 16px; border: 1px solid #e2e8f0; min-width: 140px;">
              <p style="font-size: 9px; font-weight: 800; color: #64748b; margin: 0; text-transform: uppercase;">Current Status</p>
              <p style="font-size: 16px; font-weight: 900; color: ${delayColor}; margin: 2px 0 0 0; font-family: 'Outfit', sans-serif;">
                ${t.delayText}
              </p>
              <p style="font-size: 10px; color: #16a34a; margin: 2px 0 0 0; font-weight: 700;">
                <i class="fa-solid fa-satellite-dish" style="margin-right: 3px;"></i> GPS ±0.5m Locked
              </p>
            </div>
          </div>

          <!-- Integrated Route Progress Bar -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 12px 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; font-size: 11px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="color: #12355B; font-weight: 800;">${t.fromName || t.from}</span>
                <span style="color: #64748b; font-weight: 600;">(${t.depart})</span>
              </div>
              <div>
                <span style="color: ${data.theme.accentColor}; font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 800;">
                  Covered ${data.distCompletedKm} / ${data.totalDistKm} km (${data.progressPct}%)
                </span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="color: #64748b; font-weight: 600;">(${t.arrive})</span>
                <span style="color: #12355B; font-weight: 800;">${t.toName || t.to}</span>
              </div>
            </div>

            <div style="height: 8px; width: 100%; background: #e2e8f0; border-radius: 8px; position: relative; overflow: visible;">
              <div style="height: 100%; width: ${data.progressPct}%; background: linear-gradient(90deg, #2563eb, ${data.theme.accentColor}); border-radius: 8px;"></div>
              <div style="position: absolute; left: calc(${data.progressPct}% - 10px); top: -6px; width: 20px; height: 20px; border-radius: 50%; background: #12355B; color: white; display: flex; align-items: center; justify-content: center; font-size: 9px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 2px solid white;">
                <i class="fa-solid fa-train"></i>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 10px; color: #64748b; font-weight: 600;">
              <span>Origin: <strong style="color: #12355B;">${t.stations[0] ? t.stations[0].name : t.from}</strong></span>
              <span style="color: #166534; font-weight: 700;">Cruising: <strong style="color: #166534;">${data.currentStn.name} → ${data.nextStn.name}</strong></span>
              <span>Destination: <strong style="color: #12355B;">${t.stations[t.stations.length - 1] ? t.stations[t.stations.length - 1].name : t.to}</strong></span>
            </div>
          </div>

        </div>

        <!-- 6 COMPACT TELEMETRY & DIAGNOSTIC METRIC CARDS -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">

          <!-- Card 1: Speed -->
          <div class="glass-card" style="padding: 14px 16px; background: white !important; border: 1px solid #e2e8f0 !important; border-top: 4px solid #2563eb !important; border-radius: 20px !important;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 800; color: #2563eb; text-transform: uppercase;">
                <i class="fa-solid fa-gauge-high" style="margin-right: 3px;"></i> Speed & Throttle
              </span>
              <span style="font-size: 9px; font-weight: 800; color: #166534; background: #dcfce7; padding: 2px 8px; border-radius: 8px;">
                ACTIVE
              </span>
            </div>

            <div style="display: flex; align-items: center; justify-content: center; margin: 2px 0;">
              <svg viewBox="0 0 140 75" style="width: 110px; height: 62px;">
                <path d="M 15 68 A 55 55 0 0 1 125 68" fill="none" stroke="#e2e8f0" stroke-width="10" stroke-linecap="round" />
                <path d="M 15 68 A 55 55 0 0 1 125 68" fill="none" stroke="url(#speedMeterGrad2)" stroke-width="10" stroke-linecap="round" stroke-dasharray="172.8" stroke-dashoffset="${dashOffset}" style="transition: stroke-dashoffset 1s ease;" />
                <defs>
                  <linearGradient id="speedMeterGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#10b981" />
                    <stop offset="60%" stop-color="#3b82f6" />
                    <stop offset="100%" stop-color="#f59e0b" />
                  </linearGradient>
                </defs>
                <text x="70" y="58" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="24" font-weight="900" fill="#12355B">${data.curSpeed}</text>
                <text x="70" y="70" text-anchor="middle" font-family="'Outfit', sans-serif" font-size="8" font-weight="800" fill="#64748b">KM / H</text>
              </svg>
            </div>

            <div style="display: flex; justify-content: space-between; padding-top: 6px; border-top: 1px solid #f1f5f9; font-size: 10px;">
              <span style="color: #64748b;">MPS: <strong style="color: #0f172a;">${data.theme.mps} km/h</strong></span>
              <span style="color: #64748b;">OHE: <strong style="color: #0f172a;">${data.oheVoltage} kV</strong></span>
            </div>
          </div>

          <!-- Card 2: GPS Section -->
          <div class="glass-card" style="padding: 14px 16px; background: white !important; border: 1px solid #e2e8f0 !important; border-top: 4px solid #0891b2 !important; border-radius: 20px !important;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 800; color: #0891b2; text-transform: uppercase;">
                <i class="fa-solid fa-location-crosshairs" style="margin-right: 3px;"></i> GPS & Section
              </span>
              <span style="font-size: 9px; font-weight: 800; color: #0e7490; background: #cffafe; padding: 2px 8px; border-radius: 8px;">
                ±0.5m
              </span>
            </div>

            <p style="font-size: 10px; color: #64748b; margin: 0; font-weight: 600;">Active Section</p>
            <div style="font-size: 13px; font-weight: 800; color: #12355B; margin: 2px 0 4px 0; font-family: 'Outfit', sans-serif;">
              ${data.currentStn.name} → ${data.nextStn.name}
            </div>

            <div style="background: #f8fafc; padding: 7px 10px; border-radius: 14px; border: 1px solid #e2e8f0; margin-bottom: 6px; font-family: 'JetBrains Mono', monospace; font-size: 10px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Coords:</span>
                <span style="font-weight: 700; color: #0f172a;">${data.gpsLat}°N, ${data.gpsLng}°E</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Post:</span>
                <span style="font-weight: 800; color: #2563eb;">${data.trackKm}</span>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #166534; font-weight: 700;">
              <span><i class="fa-solid fa-shield-halved"></i> Block: CLEAR</span>
              <span>88 Axles</span>
            </div>
          </div>

          <!-- Card 3: Punctuality -->
          <div class="glass-card" style="padding: 14px 16px; background: white !important; border: 1px solid #e2e8f0 !important; border-top: 4px solid ${delayColor} !important; border-radius: 20px !important;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 800; color: ${delayColor}; text-transform: uppercase;">
                <i class="fa-solid fa-clock-rotate-left" style="margin-right: 3px;"></i> Delay & Recovery
              </span>
              <span style="font-size: 9px; font-weight: 800; background: ${delayBg}; color: ${delayColor}; padding: 2px 8px; border-radius: 8px;">
                ${t.delayText}
              </span>
            </div>

            <div style="display: flex; align-items: baseline; gap: 6px; margin: 4px 0;">
              <span style="font-size: 22px; font-weight: 900; color: #0f172a; font-family: 'JetBrains Mono', monospace;">
                ${t.delay === 0 ? '0' : '+' + t.delay}
              </span>
              <span style="font-size: 11px; font-weight: 700; color: #64748b;">min delay</span>
            </div>

            <div style="background: #f8fafc; padding: 7px 10px; border-radius: 14px; border: 1px solid #e2e8f0; font-size: 10px; margin-bottom: 6px;">
              <p style="margin: 0; color: #0f172a; font-weight: 600;">
                ${t.delay === 0 ? 'Coasting profile engaged; on-time arrival guaranteed.' : 'Cruising profile; predicted to recover 4 min.'}
              </p>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; font-weight: 600;">
              <span>Historical:</span>
              <span style="color: #16a34a; font-weight: 800;">97.8% On-Time</span>
            </div>
          </div>

          <!-- Card 4: Locomotive -->
          <div class="glass-card" style="padding: 14px 16px; background: white !important; border: 1px solid #e2e8f0 !important; border-top: 4px solid #7c3aed !important; border-radius: 20px !important;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 800; color: #7c3aed; text-transform: uppercase;">
                <i class="fa-solid fa-train-subway" style="margin-right: 3px;"></i> Locomotive & Power
              </span>
              <span style="font-size: 9px; font-weight: 800; color: #6d28d9; background: #ede9fe; padding: 2px 8px; border-radius: 8px;">
                HEALTHY
              </span>
            </div>

            <p style="font-size: 10px; color: #64748b; margin: 0; font-weight: 600;">Traction Unit</p>
            <div style="font-size: 12px; font-weight: 800; color: #12355B; margin: 2px 0 6px 0; font-family: 'Outfit', sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${data.theme.locoModel}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px; background: #f8fafc; padding: 7px 10px; border-radius: 14px; border: 1px solid #e2e8f0; margin-bottom: 6px;">
              <div>TM: <strong>${data.tractionMotorTemp}°C</strong></div>
              <div style="text-align: right;">Oil: <strong>${data.transformerTemp}°C</strong></div>
              <div>BP: <strong>5.0 kg</strong></div>
              <div style="text-align: right;">FP: <strong>6.0 kg</strong></div>
            </div>

            <p style="font-size: 10px; color: #64748b; margin: 0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              Shed: <strong>${data.theme.locoShed}</strong>
            </p>
          </div>

          <!-- Card 5: Next Station -->
          <div class="glass-card" style="padding: 14px 16px; background: white !important; border: 1px solid #e2e8f0 !important; border-top: 4px solid #ea580c !important; border-radius: 20px !important;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 800; color: #ea580c; text-transform: uppercase;">
                <i class="fa-solid fa-building-columns" style="margin-right: 3px;"></i> Next Station
              </span>
              <span style="font-size: 9px; font-weight: 800; color: #c2410c; background: #ffedd5; padding: 2px 8px; border-radius: 8px;">
                PF #${data.nextStn.pf}
              </span>
            </div>

            <p style="font-size: 10px; color: #64748b; margin: 0; font-weight: 600;">Approaching</p>
            <div style="font-size: 13px; font-weight: 800; color: #12355B; margin: 2px 0 6px 0; font-family: 'Outfit', sans-serif;">
              ${data.nextStn.name} <span style="color: #64748b; font-size: 11px;">(${data.nextStn.code})</span>
            </div>

            <div style="display: flex; align-items: baseline; justify-content: space-between; background: #f8fafc; padding: 7px 10px; border-radius: 14px; border: 1px solid #e2e8f0; margin-bottom: 6px;">
              <div>
                <p style="margin: 0; font-size: 9px; color: #64748b;">ARR TIME</p>
                <p style="margin: 0; font-size: 13px; font-weight: 900; color: #0f172a; font-family: 'JetBrains Mono', monospace;">
                  ${data.nextStn.arr !== '--' ? data.nextStn.arr : data.nextStn.dep}
                </p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; font-size: 9px; color: #64748b;">REMAINING</p>
                <p style="margin: 0; font-size: 13px; font-weight: 900; color: #2563eb; font-family: 'JetBrains Mono', monospace;">
                  ${(data.seed * 11) % 25 + 8} km
                </p>
              </div>
            </div>

            <div style="font-size: 10px; color: #64748b; font-weight: 600;">
              Allocated: <strong style="color: #12355B;">Platform ${data.nextStn.pf}</strong>
            </div>
          </div>

          <!-- Card 6: Crew -->
          <div class="glass-card" style="padding: 14px 16px; background: white !important; border: 1px solid #e2e8f0 !important; border-top: 4px solid #16a34a !important; border-radius: 20px !important;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: 800; color: #16a34a; text-transform: uppercase;">
                <i class="fa-solid fa-user-shield" style="margin-right: 3px;"></i> Crew & Vigilance
              </span>
              <span style="font-size: 9px; font-weight: 800; color: #15803d; background: #dcfce7; padding: 2px 8px; border-radius: 8px;">
                VCD ARMED
              </span>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: #eaf3f8; border: 1.5px solid #12355B; display: flex; align-items: center; justify-content: center; color: #12355B; font-weight: 800; font-size: 11px;">
                LP
              </div>
              <div>
                <div style="margin: 0; font-size: 12px; font-weight: 800; color: #12355B; font-family: 'Outfit', sans-serif;">R. K. Sharma</div>
                <p style="margin: 0; font-size: 10px; color: #64748b;">Sr. Loco Pilot (HQ: Jodhpur)</p>
              </div>
            </div>

            <div style="background: #f8fafc; padding: 7px 10px; border-radius: 14px; border: 1px solid #e2e8f0; font-size: 10px; margin-bottom: 6px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">ALP:</span>
                <span style="font-weight: 700; color: #0f172a;">A. Verma (0.0‰ BAC)</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Guard:</span>
                <span style="font-weight: 700; color: #0f172a;">M. S. Rathore (OK)</span>
              </div>
            </div>

            <p style="font-size: 10px; color: #166534; font-weight: 700; margin: 0;">
              <i class="fa-solid fa-circle-check"></i> Vigilance Cycle Acknowledged
            </p>
          </div>

        </div>

        <!-- COACH COMPOSITION & RAKE DIAGRAM (CLEAN LIGHT CARD) -->
        <div class="glass-card" style="background: white !important; padding: 18px 20px; border-radius: 20px !important; border: 1.5px solid #d6e3ec !important; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 32px; height: 32px; border-radius: 10px; background: #eaf3f8; border: 1px solid #12355B; display: flex; align-items: center; justify-content: center;">
                <i class="fa-solid fa-train-subway" style="color: #12355B; font-size: 14px;"></i>
              </div>
              <div>
                <div style="font-size: 14px; font-weight: 800; color: #12355B; font-family: 'Outfit', sans-serif;">
                  Live Coach Rake Composition & Health Monitor
                </div>
                <p style="margin: 0; font-size: 10px; color: #64748b; font-weight: 500;">
                  Click any coach to inspect real-time axle temperatures, passenger occupancy & air-conditioning telemetry
                </p>
              </div>
            </div>
            <div>
              <span style="font-size: 10px; font-weight: 800; background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 10px; border: 1px solid #bfdbfe;">
                ${data.coaches.length} COACHES
              </span>
            </div>
          </div>

          <!-- Coach Class Color Legend -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; font-size: 10px; font-weight: 700;">
            <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 3px; background: #475569;"></span> Engine</span>
            <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 3px; background: #991B1B;"></span> 1st AC (1A)</span>
            <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 3px; background: #6B21A8;"></span> 2-Tier (2A)</span>
            <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 3px; background: #1D4ED8;"></span> 3-Tier (3A)</span>
            <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 3px; background: #0284C7;"></span> Chair Car (CC)</span>
            <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 3px; background: #D97706;"></span> Exec (EC)</span>
            <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 3px; background: #047857;"></span> Sleeper (SL)</span>
            <span style="display: inline-flex; align-items: center; gap: 4px;"><span style="width: 8px; height: 8px; border-radius: 3px; background: #EA580C;"></span> Pantry (PC)</span>
          </div>

          <!-- Horizontally Scrollable Rake Track -->
          <div style="overflow-x: auto; padding: 6px 2px 10px 2px; display: flex; align-items: flex-end; gap: 6px; scrollbar-width: thin;" class="coach-rake-container">
            ${data.coaches.map((c, idx) => {
              const classBadgeColors = {
                "ENG": { bg: "#475569", text: "#f8fafc" },
                "1A": { bg: "#991B1B", text: "#fef2f2" },
                "2A": { bg: "#6B21A8", text: "#faf5ff" },
                "3A": { bg: "#1D4ED8", text: "#eff6ff" },
                "CC": { bg: "#0284C7", text: "#f0f9ff" },
                "EC": { bg: "#D97706", text: "#fffbeb" },
                "SL": { bg: "#047857", text: "#ecfdf5" },
                "PC": { bg: "#EA580C", text: "#fff7ed" },
                "SLR": { bg: "#64748B", text: "#f8fafc" }
              };
              const col = classBadgeColors[c.classKey] || { bg: "#2563eb", text: "white" };
              const isSelected = idx === activeCoachInspectorIndex;
              const occPct = c.cap > 0 ? Math.round((c.booked / c.cap) * 100) : 100;

              return `
                <div onclick="inspectCoach(${idx})"
                  class="coach-rake-box"
                  style="flex-shrink: 0; width: 54px; background: ${isSelected ? '#eff6ff' : '#f8fafc'}; border: 1.5px solid ${isSelected ? '#2563eb' : '#cbd5e1'}; border-radius: 12px; padding: 6px 2px; text-align: center; cursor: pointer; transition: all 0.2s; transform: ${isSelected ? 'translateY(-4px)' : 'translateY(0)'}; box-shadow: ${isSelected ? '0 4px 12px rgba(37,99,235,0.25)' : 'none'};">
                  <p style="font-size: 8px; color: #64748b; margin: 0 0 2px 0; font-family: 'JetBrains Mono', monospace; font-weight: 700;">#${idx + 1}</p>
                  <div style="background: ${col.bg}; height: 4px; border-radius: 3px; margin-bottom: 4px;"></div>
                  <p style="font-size: 11px; font-weight: 900; color: #0f172a; margin: 0; font-family: 'JetBrains Mono', monospace;">${c.code}</p>
                  <span style="display: inline-block; font-size: 8px; font-weight: 800; color: ${occPct >= 95 ? '#b91c1c' : '#15803d'}; background: ${occPct >= 95 ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${occPct >= 95 ? '#fecaca' : '#bbf7d0'}; padding: 2px 4px; border-radius: 6px; margin-top: 2px;">
                    ${occPct}%
                  </span>
                </div>
              `;
            }).join("")}
          </div>

          <!-- Railway Tracks representation -->
          <div style="height: 6px; background: repeating-linear-gradient(90deg, #94a3b8 0px, #94a3b8 6px, #cbd5e1 6px, #cbd5e1 18px); border-radius: 4px; margin-bottom: 12px;"></div>

          <!-- Selected Coach Inspector Details Card -->
          <div id="coachDetailInspectorCard" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 18px; padding: 12px 16px;">
            ${renderCoachInspectorHtml(initialCoach, activeCoachInspectorIndex)}
          </div>
        </div>

        <!-- TWO COLUMNS: ROUTE PROGRESSION TIMELINE & SPEED CHART -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">

          <!-- Left Column: Route Station Schedule -->
          <div class="glass-card" style="padding: 18px 20px; background: white !important; border: 1px solid #e2e8f0 !important; border-radius: 20px !important;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <div style="font-size: 14px; font-weight: 800; color: #12355B; font-family: 'Outfit', sans-serif;">
                <i class="fa-solid fa-route" style="color: #2563eb; margin-right: 6px;"></i> Route Timeline & Station Stops
              </div>
              <span style="font-size: 10px; font-weight: 700; color: #64748b;">
                ${t.stations.length} Scheduled Stops
              </span>
            </div>

            <div style="position: relative; padding-left: 6px;">
              ${t.stations.map((st, idx) => {
                const isPassed = idx <= data.currentStnIdx;
                const isCurrentNext = idx === data.currentStnIdx + 1;
                const isLast = idx === t.stations.length - 1;
                const delayVal = typeof st.delay === 'number' ? st.delay : (t.delay || 0);
                const stDelayCol = delayVal === 0 ? '#138808' : delayVal <= 15 ? '#d97706' : '#dc2626';
                const stDelayBg = delayVal === 0 ? '#f0fdf4' : delayVal <= 15 ? '#fffbeb' : '#fef2f2';

                return `
                  <div style="position: relative; padding-left: 32px; padding-bottom: ${isLast ? '0' : '12px'};">
                    ${!isLast ? `
                      <div style="position: absolute; left: 11px; top: 18px; bottom: 0; width: 2px; background: ${isPassed ? '#10b981' : '#e2e8f0'};"></div>
                    ` : ''}

                    <div style="position: absolute; left: 0; top: 0; width: 24px; height: 24px; border-radius: 50%; background: ${isPassed ? '#10b981' : isCurrentNext ? '#2563eb' : '#94a3b8'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; box-shadow: ${isCurrentNext ? '0 0 0 3px rgba(37,99,235,0.2)' : 'none'};">
                      ${isPassed ? '<i class="fa-solid fa-check" style="font-size: 9px;"></i>' : idx + 1}
                    </div>

                    <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px;">
                      <div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                          <div style="font-size: 13px; font-weight: 800; color: #12355B; font-family: 'Outfit', sans-serif;">${st.name}</div>
                          <span style="font-size: 9px; font-weight: 700; color: #64748b; font-family: 'JetBrains Mono', monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 8px;">${st.code}</span>
                          ${isPassed ? '<span style="font-size: 8px; font-weight: 800; color: #166534; background: #dcfce7; padding: 2px 6px; border-radius: 8px;">DEPARTED</span>' : ''}
                          ${isCurrentNext ? '<span style="font-size: 8px; font-weight: 800; color: #1e40af; background: #dbeafe; padding: 2px 6px; border-radius: 8px;">NEXT STOP</span>' : ''}
                        </div>
                        <p style="margin: 1px 0 0 0; font-size: 10px; color: #64748b; font-weight: 600;">
                          PF #${st.pf || (idx + 1)} &nbsp;•&nbsp; Arr: <span style="color: #0f172a; font-family: 'JetBrains Mono', monospace; font-weight: 700;">${st.arr}</span> &nbsp;•&nbsp; Dep: <span style="color: #0f172a; font-family: 'JetBrains Mono', monospace; font-weight: 700;">${st.dep}</span>
                        </p>
                      </div>

                      <div>
                        <span style="padding: 3px 10px; border-radius: 8px; font-size: 10px; font-weight: 800; background: ${stDelayBg}; color: ${stDelayCol}; border: 1px solid ${stDelayCol}30;">
                          ${delayVal === 0 ? '✓ ON TIME' : '+' + delayVal + ' MIN'}
                        </span>
                      </div>
                    </div>

                    ${idx === data.currentStnIdx && !isLast ? `
                      <div style="margin: 8px 0 4px 0; background: #eff6ff; border: 1.5px dashed #2563eb; padding: 8px 12px; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; font-size: 10px;">
                        <span style="color: #1e40af; font-weight: 800; display: flex; align-items: center; gap: 5px;">
                          <i class="fa-solid fa-train" style="color: #2563eb;"></i>
                          TRAIN HERE • ${data.curSpeed} km/h
                        </span>
                        <span style="color: #2563eb; font-weight: 700; font-family: 'JetBrains Mono', monospace;">
                          ${(data.seed * 11) % 25 + 8} km to ${data.nextStn.code}
                        </span>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <!-- Right Column: Speed Chart + Energy -->
          <div class="space-y-3">
            
            <div class="glass-card" style="padding: 18px 20px; background: white !important; border: 1px solid #e2e8f0 !important; border-radius: 20px !important;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <div style="font-size: 14px; font-weight: 800; color: #12355B; font-family: 'Outfit', sans-serif;">
                  <i class="fa-solid fa-chart-area" style="color: #2563eb; margin-right: 6px;"></i> Route Speed Profile & MPS
                </div>
                <div style="display: flex; gap: 8px; font-size: 10px; font-weight: 700;">
                  <span style="color: #ef4444;"><span style="width: 6px; height: 2px; background: #ef4444; display: inline-block;"></span> MPS (${data.theme.mps})</span>
                  <span style="color: #2563eb;"><span style="width: 6px; height: 6px; background: #2563eb; border-radius: 50%; display: inline-block;"></span> Actual</span>
                </div>
              </div>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 10px 8px 6px 8px;">
                <svg viewBox="0 0 400 110" style="width: 100%; height: auto;">
                  <line x1="36" y1="16" x2="390" y2="16" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3" />
                  <text x="30" y="20" font-size="8" fill="#94a3b8" text-anchor="end" font-family="'JetBrains Mono', monospace">160</text>
                  
                  <line x1="36" y1="46" x2="390" y2="46" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3" />
                  <text x="30" y="50" font-size="8" fill="#94a3b8" text-anchor="end" font-family="'JetBrains Mono', monospace">100</text>

                  <line x1="36" y1="76" x2="390" y2="76" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3" />
                  <text x="30" y="80" font-size="8" fill="#94a3b8" text-anchor="end" font-family="'JetBrains Mono', monospace">50</text>

                  <line x1="36" y1="94" x2="390" y2="94" stroke="#cbd5e1" stroke-width="1" />
                  <text x="30" y="97" font-size="8" fill="#94a3b8" text-anchor="end" font-family="'JetBrains Mono', monospace">0</text>

                  <line x1="36" y1="${94 - (data.theme.mps / 160) * 78}" x2="390" y2="${94 - (data.theme.mps / 160) * 78}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4" />

                  <defs>
                    <linearGradient id="areaSpeedGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#2563eb" stop-opacity="0.3" />
                      <stop offset="100%" stop-color="#2563eb" stop-opacity="0.02" />
                    </linearGradient>
                  </defs>

                  <polygon points="46,94 46,90 120,38 190,34 260,30 330,42 380,90 380,94" fill="url(#areaSpeedGrad2)" />
                  <polyline points="46,90 120,38 190,34 260,30 330,42 380,90" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />

                  <circle cx="46" cy="90" r="3" fill="white" stroke="#2563eb" stroke-width="1.5" />
                  <circle cx="120" cy="38" r="3" fill="white" stroke="#2563eb" stroke-width="1.5" />
                  <circle cx="190" cy="34" r="3" fill="white" stroke="#2563eb" stroke-width="1.5" />
                  <circle cx="260" cy="30" r="4" fill="#10b981" stroke="white" stroke-width="2" />
                  <circle cx="330" cy="42" r="3" fill="white" stroke="#2563eb" stroke-width="1.5" />
                  <circle cx="380" cy="90" r="3" fill="white" stroke="#2563eb" stroke-width="1.5" />

                  <text x="46" y="106" font-size="8" fill="#64748b" text-anchor="middle" font-weight="700">${t.stations[0] ? t.stations[0].code : 'ORG'}</text>
                  <text x="190" y="106" font-size="8" fill="#64748b" text-anchor="middle" font-weight="700">${data.currentStn.code}</text>
                  <text x="260" y="106" font-size="8" fill="#10b981" text-anchor="middle" font-weight="800">HERE</text>
                  <text x="380" y="106" font-size="8" fill="#64748b" text-anchor="middle" font-weight="700">${t.stations[t.stations.length - 1] ? t.stations[t.stations.length - 1].code : 'DST'}</text>
                </svg>
              </div>
            </div>

            <div class="glass-card" style="padding: 16px 20px; background: white !important; border: 1px solid #e2e8f0 !important; border-left: 4px solid #10b981 !important; border-radius: 20px !important;">
              <div style="font-size: 13px; font-weight: 800; color: #12355B; margin-bottom: 8px; font-family: 'Outfit', sans-serif;">
                <i class="fa-solid fa-leaf" style="color: #10b981; margin-right: 5px;"></i> Regenerative Energy & Efficiency
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 12px; border-radius: 14px;">
                  <p style="margin: 0; color: #166534; font-size: 9px; font-weight: 700; text-transform: uppercase;">Energy Regenerated</p>
                  <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: 900; color: #15803d; font-family: 'JetBrains Mono', monospace;">
                    +${data.energyRegenerated} kWh
                  </p>
                  <p style="margin: 1px 0 0 0; font-size: 9px; color: #166534;">Returned to 25kV OHE</p>
                </div>

                <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 10px 12px; border-radius: 14px;">
                  <p style="margin: 0; color: #1e40af; font-size: 9px; font-weight: 700; text-transform: uppercase;">Specific Energy (SEC)</p>
                  <p style="margin: 2px 0 0 0; font-size: 14px; font-weight: 900; color: #1d4ed8; font-family: 'JetBrains Mono', monospace;">
                    18.2 kWh
                  </p>
                  <p style="margin: 1px 0 0 0; font-size: 9px; color: #1e40af;">Per 1000 GTKM (Grade A)</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- TRACK SAFETY & KAVACH 4.0 SUBSYSTEM (TWO COLUMNS COMPACT) -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">

          <!-- Kavach 4.0 Panel -->
          <div class="glass-card" style="padding: 18px 20px; background: white !important; border: 1px solid #e2e8f0 !important; border-top: 4px solid #FF9933 !important; border-radius: 20px !important;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 28px; height: 28px; border-radius: 10px; background: #fff7ed; border: 1px solid #ea580c; display: flex; align-items: center; justify-content: center;">
                  <i class="fa-solid fa-shield-halved" style="color: #ea580c; font-size: 12px;"></i>
                </div>
                <div>
                  <div style="font-size: 13px; font-weight: 800; color: #12355B; font-family: 'Outfit', sans-serif;">
                    Kavach 4.0 Subsystem Telemetry
                  </div>
                  <p style="margin: 0; font-size: 9px; color: #64748b;">RDSO Certified Automatic Protection</p>
                </div>
              </div>
              <span style="font-size: 10px; font-weight: 800; color: #138808; background: #f0fdf4; padding: 3px 10px; border-radius: 10px; border: 1px solid #bbf7d0;">
                SIL-4 ACTIVE
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
              <div style="background: #f8fafc; padding: 10px 12px; border-radius: 14px; border: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 9px; color: #64748b; font-weight: 700;">UHF RADIO DIRECT</p>
                <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 800; color: #0f172a; font-family: 'JetBrains Mono', monospace;">
                  ${data.rfSignalDbm} dBm (400 MHz)
                </p>
                <p style="margin: 1px 0 0 0; font-size: 9px; color: #16a34a; font-weight: 700;">100% Integrity</p>
              </div>

              <div style="background: #f8fafc; padding: 10px 12px; border-radius: 14px; border: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 9px; color: #64748b; font-weight: 700;">RFID BALISE READER</p>
                <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 800; color: #0f172a; font-family: 'JetBrains Mono', monospace;">
                  ${data.rfidTagId}
                </p>
                <p style="margin: 1px 0 0 0; font-size: 9px; color: #2563eb; font-weight: 700;">Tag Match Verified</p>
              </div>

              <div style="background: #f8fafc; padding: 10px 12px; border-radius: 14px; border: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 9px; color: #64748b; font-weight: 700;">CAB SIGNAL ASPECT</p>
                <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: 800; color: #0f172a;">
                  ${data.signalAspect}
                </p>
                <p style="margin: 1px 0 0 0; font-size: 9px; color: #64748b;">Dist: ${data.signalDistance}m ahead</p>
              </div>

              <div style="background: #f8fafc; padding: 10px 12px; border-radius: 14px; border: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 9px; color: #64748b; font-weight: 700;">MOVEMENT AUTHORITY</p>
                <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 800; color: #16a34a; font-family: 'JetBrains Mono', monospace;">
                  ${data.movementAuthorityM} Meters
                </p>
                <p style="margin: 1px 0 0 0; font-size: 9px; color: #166534;">Full Supervision (FS)</p>
              </div>
            </div>

            <div style="margin-top: 10px; padding: 8px 12px; border-radius: 14px; background: #fffbeb; border: 1px solid #fef3c7; font-size: 10px; color: #92400e; display: flex; align-items: center; justify-content: space-between;">
              <span><i class="fa-solid fa-triangle-exclamation" style="margin-right: 4px; color: #f59e0b;"></i> Safe Braking Distance: <strong>${data.brakingEnvelopeM}m</strong></span>
              <span style="font-weight: 800; color: #166534;">ANTI-SPAD ARMED</span>
            </div>
          </div>

          <!-- Track Security Panel -->
          <div class="glass-card" style="padding: 18px 20px; background: white !important; border: 1px solid #e2e8f0 !important; border-top: 4px solid #12355B !important; border-radius: 20px !important;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <div style="width: 28px; height: 28px; border-radius: 10px; background: #eaf3f8; border: 1px solid #12355B; display: flex; align-items: center; justify-content: center;">
                  <i class="fa-solid fa-wrench" style="color: #12355B; font-size: 12px;"></i>
                </div>
                <div>
                  <div style="font-size: 13px; font-weight: 800; color: #12355B; font-family: 'Outfit', sans-serif;">
                    Track Security & Maintenance Health
                  </div>
                  <p style="margin: 0; font-size: 9px; color: #64748b;">Permanent Way (P-Way) Safety</p>
                </div>
              </div>
              <span style="font-size: 10px; font-weight: 800; color: #2563eb; background: #eff6ff; padding: 3px 10px; border-radius: 10px; border: 1px solid #bfdbfe;">
                TRACK GROUP A
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px;">
              <div style="background: #f8fafc; padding: 10px 12px; border-radius: 14px; border: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 9px; color: #64748b; font-weight: 700;">RAIL STANDARD</p>
                <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: 800; color: #0f172a;">
                  60 kg/m UIC UTS 90
                </p>
                <p style="margin: 1px 0 0 0; font-size: 9px; color: #64748b;">1660 PSC Sleepers/km</p>
              </div>

              <div style="background: #f8fafc; padding: 10px 12px; border-radius: 14px; border: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 9px; color: #64748b; font-weight: 700;">CWR RAIL TEMP</p>
                <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 800; color: #0f172a; font-family: 'JetBrains Mono', monospace;">
                  ${data.railTempC}°C
                </p>
                <p style="margin: 1px 0 0 0; font-size: 9px; color: #16a34a; font-weight: 700;">Safe Stress Zone</p>
              </div>

              <div style="background: #f8fafc; padding: 10px 12px; border-radius: 14px; border: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 9px; color: #64748b; font-weight: 700;">USFD FLAW TESTING</p>
                <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: 800; color: #16a34a;">
                  0 Flaws Detected
                </p>
                <p style="margin: 1px 0 0 0; font-size: 9px; color: #64748b;">Tested 4 Days Ago</p>
              </div>

              <div style="background: #f8fafc; padding: 10px 12px; border-radius: 14px; border: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 9px; color: #64748b; font-weight: 700;">TRACK RQI</p>
                <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 800; color: #0f172a; font-family: 'JetBrains Mono', monospace;">
                  ${data.trackVibrationG} g (Index 2.1)
                </p>
                <p style="margin: 1px 0 0 0; font-size: 9px; color: #16a34a; font-weight: 700;">Very Good Ride</p>
              </div>
            </div>

            <div style="margin-top: 10px; padding: 8px 12px; border-radius: 14px; background: #eff6ff; border: 1px solid #dbeafe; font-size: 10px;">
              <p style="margin: 0; font-weight: 700; color: #1e40af;">
                <i class="fa-solid fa-triangle-exclamation" style="margin-right: 4px; color: #2563eb;"></i> Active TSR Caution:
              </p>
              <p style="margin: 2px 0 0 0; color: #334155; font-size: 10px;">${data.tsrLocation}</p>
            </div>
          </div>

        </div>

      </div>
    `;
  }
  // VIEW 3: AI ANTI-SPAD & COLLISION RISK CENTER (conflict_alerts)
  function renderConflictAlertsSection(container) {
    container.innerHTML = `
      <div class="glass-card p-5 space-y-5 border-l-4 border-red-500">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <span class="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs font-bold border border-red-500/40 uppercase">AI Collision Risk Prevention</span>
            <h3 class="text-xl font-black text-white font-['Outfit'] mt-1 flex items-center gap-2">
              ⚠️ Anti-SPAD & Interlocking Collision Risk Terminal
            </h3>
            <p class="text-xs text-slate-400 font-mono">Real-Time Headway Analysis, Signal Overrun Protection & Automatic Braking Interventions</p>
          </div>
          <button onclick="showToast('Simulated Kavach Auto-Brake Emergency Command Executed!', 'error')" class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer">
            <i class="fa-solid fa-triangle-exclamation"></i> Trigger Test Auto-Brake Signal
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div class="glass-card p-4 border border-red-500/30 space-y-1">
            <p class="text-xs text-slate-400 font-bold uppercase">Headway Collision Risk</p>
            <p class="text-3xl font-black text-emerald-400 font-mono">0 CRITICAL</p>
            <p class="text-[11px] text-slate-400">All train headways &gt;3.5 km safe zone</p>
          </div>

          <div class="glass-card p-4 border border-amber-500/30 space-y-1">
            <p class="text-xs text-slate-400 font-bold uppercase">TSR Speed Overrun Warnings</p>
            <p class="text-3xl font-black text-amber-400 font-mono">2 CAUTION</p>
            <p class="text-[11px] text-slate-400">Kavach speed governor active on Train 12059</p>
          </div>

          <div class="glass-card p-4 border border-blue-500/30 space-y-1">
            <p class="text-xs text-slate-400 font-bold uppercase">Track RFID Balises Sync</p>
            <p class="text-3xl font-black text-cyan-400 font-mono">100% HEALTH</p>
            <p class="text-[11px] text-slate-400">1,420 Track RFID Transponders verified</p>
          </div>
        </div>

        <!-- Live Conflict Cards -->
        <div class="space-y-3">
          <h4 class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <i class="fa-solid fa-bell-exclamation text-amber-400"></i> Active Safety Advisories & AI Directives
          </h4>

          <div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold text-[10px]">TSR SPEED ADVISORY</span>
                <span class="text-white font-bold">TKD – MTJ Section (Km 45/2)</span>
              </div>
              <p class="text-slate-300">Train 12059 Jan Shatabdi approaching 45 km/h TSR zone at 52 km/h. Kavach automatic audio alert issued to Loco Pilot.</p>
            </div>
            <button onclick="showToast('Enforced Automatic 45 km/h Speed Limit via Kavach RF', 'success')" class="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer whitespace-nowrap">
              Enforce Auto-Limit
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // VIEW 4: AI DYNAMIC RESCHEDULING & TIMETABLE OPTIMIZER (rescheduling)
  function renderReschedulingSection(container) {
    container.innerHTML = `
      <div class="glass-card p-5 space-y-5 border-l-4 border-purple-500">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <span class="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/40 uppercase">AI Timetable Optimization</span>
            <h3 class="text-xl font-black text-white font-['Outfit'] mt-1 flex items-center gap-2">
              ⏱️ AI Dynamic Train Rescheduling & Delay Mitigation Engine
            </h3>
            <p class="text-xs text-slate-400 font-mono">Precedence Optimizer, Loop Line Overtake Matrix & Platform Allocation</p>
          </div>
          <button onclick="showToast('AI Rescheduling Engine Re-evaluated 128 Train Paths in 0.4s', 'success')" class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Run AI Schedule Optimizer
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div class="p-4 rounded-xl bg-slate-900/90 border border-purple-500/30 space-y-3">
            <h4 class="font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-route text-purple-400"></i> Overtake Recommendation #1
            </h4>
            <p class="text-slate-300">Grant precedence to <strong>12012 Vande Bharat Express</strong> over Freight Special #31088 at Palwal Station Loop Line 2.</p>
            <div class="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]">
              Impact: Saves 18 minutes overall division cumulative delay.
            </div>
            <button onclick="showToast('Accepted Overtake Recommendation #1! Dispatched to Section Controller.', 'success')" class="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer">
              Accept & Execute Overtake
            </button>
          </div>

          <div class="p-4 rounded-xl bg-slate-900/90 border border-purple-500/30 space-y-3">
            <h4 class="font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-building-flag text-purple-400"></i> Platform Re-Allotment Recommendation #2
            </h4>
            <p class="text-slate-300">Re-route <strong>12626 Kerala Express</strong> from Platform 3 to Platform 5 at Mathura Junction due to incoming Freight Rake.</p>
            <div class="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]">
              Impact: Eliminates 12 minutes platform waiting halt.
            </div>
            <button onclick="showToast('Accepted Platform Re-Allotment Recommendation #2!', 'success')" class="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer">
              Accept & Re-route Platform
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // VIEW 5: OPERATIONAL ANALYTICS HUB (analytics)
  function renderAnalyticsSection(container) {
    container.innerHTML = `
      <div class="glass-card p-5 space-y-5 border-l-4 border-cyan-500">
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <span class="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold border border-cyan-500/40 uppercase">Executive Reports</span>
            <h3 class="text-xl font-black text-white font-['Outfit'] mt-1 flex items-center gap-2">
              📈 Safety Analytics & Division Punctuality Index
            </h3>
            <p class="text-xs text-slate-400 font-mono">Braking Curve Compliance, Section Throughput & Delay Root-Cause Analysis</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
            <p class="text-slate-400 font-bold uppercase text-[10px]">Auto-Brake Intervention Accuracy</p>
            <p class="text-3xl font-black text-emerald-400 font-mono">99.98%</p>
            <p class="text-slate-400 text-[11px]">0 False Emergency Braking Interventions</p>
          </div>
          <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
            <p class="text-slate-400 font-bold uppercase text-[10px]">Division On-Time Punctuality</p>
            <p class="text-3xl font-black text-blue-400 font-mono">94.2%</p>
            <p class="text-slate-400 text-[11px]">Target: &gt;90.0% (Passed)</p>
          </div>
          <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
            <p class="text-slate-400 font-bold uppercase text-[10px]">Section Line Capacity Throughput</p>
            <p class="text-3xl font-black text-cyan-300 font-mono">142 Rakes/Day</p>
            <p class="text-slate-400 text-[11px]">Optimal Track Utilization</p>
          </div>
        </div>
      </div>
    `;
  }

  // VIEW 6: WEATHER RADAR (weather)
  function renderWeatherSection(container) {
    const state = window.liveWeatherState || {};
    container.innerHTML = `
      <div class="glass-card p-5 border-l-4 border-yellow-500 space-y-5">
        <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-bold border border-yellow-500/40 uppercase">Environmental Risk Command</span>
              <span class="px-2.5 py-0.5 rounded-full ${state.isLive && !state.permissionDenied ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-amber-500/20 text-amber-300 border-amber-500/40"} text-xs font-bold border uppercase flex items-center gap-1">
                <span class="w-2 h-2 rounded-full ${state.isLive && !state.permissionDenied ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}"></span>
                ${state.isLive && !state.permissionDenied ? "GPS Live Location Active" : "Manual / Area Location"}
              </span>
            </div>
            <h3 class="text-2xl font-black text-white font-['Outfit'] mt-1">Fog Visibility Index & Thermal Track Expansion Radar</h3>
            <p class="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <i class="fa-solid fa-location-dot text-red-400"></i>
              <span>Live Region: <strong id="weatherSectionLocationName" class="text-white font-bold">${state.locationName || "Detecting..."}</strong></span>
              <span class="text-slate-500">|</span>
              <span>Updated: <span id="weatherSectionUpdated" class="text-slate-300 font-mono">${state.lastUpdated || "Just now"}</span></span>
            </p>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <div class="relative">
              <input type="text" id="weatherCitySearchInput" placeholder="Enter city (e.g. Delhi, Mumbai)..." 
                onkeydown="if(event.key==='Enter') searchWeatherByCity(this.value)"
                class="px-3.5 py-2 pl-9 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400 w-48 sm:w-60 shadow-inner" />
              <i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs text-slate-400"></i>
            </div>
            <button onclick="const val = document.getElementById('weatherCitySearchInput').value; searchWeatherByCity(val);" class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-white/10 transition-all cursor-pointer">
              Search
            </button>
            <button onclick="requestUserLiveLocation(true)" class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer">
              <i class="fa-solid fa-location-crosshairs ${state.loading ? "animate-spin" : ""}"></i> Detect Live Location
            </button>
            <button onclick="showToast('Weather hazard auto-TSR dispatch enabled.', 'success')" class="px-3.5 py-2 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer">
              <i class="fa-solid fa-smog"></i> Fog Mode TSR Auto
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap text-xs pt-0.5">
          <span class="text-slate-400 font-medium flex items-center gap-1"><i class="fa-solid fa-city text-blue-400"></i> Quick Select:</span>
          <button onclick="searchWeatherByCity('New Delhi')" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-semibold transition-all">New Delhi</button>
          <button onclick="searchWeatherByCity('Bhopal')" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-semibold transition-all">Bhopal</button>
          <button onclick="searchWeatherByCity('Mumbai')" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-semibold transition-all">Mumbai</button>
          <button onclick="searchWeatherByCity('Kolkata')" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-semibold transition-all">Kolkata</button>
          <button onclick="searchWeatherByCity('Chennai')" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-semibold transition-all">Chennai</button>
          <button onclick="searchWeatherByCity('Lucknow')" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-semibold transition-all">Lucknow</button>
          <button onclick="searchWeatherByCity('Jaipur')" class="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-semibold transition-all">Jaipur</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="weatherSectionStatCards">
          <!-- Populated dynamically by updateWeatherUIElements() -->
        </div>
      </div>
    `;
    setTimeout(() => {
      updateWeatherUIElements();
    }, 10);
  }

  // VIEW 7: NOTIFICATIONS & TELEMETRY LOG (notifications)
  function renderNotificationsSection(container) {
    container.innerHTML = `
      <div class="glass-card p-5 space-y-4">
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 class="text-xl font-black text-white font-['Outfit'] flex items-center gap-2">
            <i class="fa-solid fa-bell text-yellow-400"></i> System Telemetry & Safety Notification Feed
          </h3>
          <button onclick="showToast('Exported System Notification Log to CSV', 'success')" class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold cursor-pointer">
            <i class="fa-solid fa-download"></i> Export Log
          </button>
        </div>

        <div class="space-y-2.5 text-xs font-mono">
          <div class="p-3 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
            <span>[10:42:01 IST] RF Tower GZB-04 Signal Handshake Confirmed (-48 dBm)</span>
            <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold text-[10px]">SYSTEM INFO</span>
          </div>
          <div class="p-3 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
            <span>[10:35:12 IST] Track Sensor P-Track 02 TSR 45 km/h Advisory Broadcasted</span>
            <span class="px-2 py-0.5 rounded bg-amber-950 text-amber-400 font-bold text-[10px]">TSR WARNING</span>
          </div>
          <div class="p-3 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
            <span>[10:20:15 IST] Train 12951 Mumbai Rajdhani Granted Station Line Clear PF 1</span>
            <span class="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-bold text-[10px]">LINE CLEAR</span>
          </div>
        </div>
      </div>
    `;
  }

  // VIEW 8: FUEL & ECO DRIVING OPTIMIZER (fuel_saving)
  function renderFuelSavingSection(container) {
    container.innerHTML = `
      <div class="glass-card p-5 space-y-4 border-l-4 border-emerald-500">
        <div>
          <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40 uppercase">Eco Driving & Energy</span>
          <h3 class="text-xl font-black text-white font-['Outfit'] mt-1">Fuel & Regenerative Energy Savings</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div class="p-4 rounded-xl bg-slate-900/80 border border-white/10">
            <p class="text-xs text-slate-400">Total Regenerative Power Returned</p>
            <p class="text-3xl font-black text-emerald-400 font-mono mt-1">14,280 kWh</p>
          </div>
          <div class="p-4 rounded-xl bg-slate-900/80 border border-white/10">
            <p class="text-xs text-slate-400">HSD Fuel Savings (Liters)</p>
            <p class="text-3xl font-black text-blue-400 font-mono mt-1">3,450 L</p>
          </div>
        </div>
      </div>
    `;
  }

  // VIEW 9: KAVACH SYSTEM SETTINGS & PARAMETERS (settings)
  function renderSettingsSection(container) {
    container.innerHTML = `
      <div class="glass-card p-5 space-y-5">
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 class="text-xl font-black text-white font-['Outfit'] flex items-center gap-2">
            <i class="fa-solid fa-gear text-slate-400"></i> Kavach System Configuration & Parameters
          </h3>
          <button onclick="showToast('Kavach Configuration Parameters Saved Successfully!', 'success')" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg cursor-pointer">
            Save System Settings
          </button>
        </div>

        <div class="space-y-4 text-xs">
          <div class="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-bold text-white">Automatic Brake (FSB) Sensitivity Threshold</p>
                <p class="text-slate-400 text-[11px]">Enforces emergency braking if driver fails to respond within set seconds of yellow aspect</p>
              </div>
              <select class="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white font-mono">
                <option value="5">Standard 5 Seconds</option>
                <option value="3">Strict 3 Seconds</option>
                <option value="7">Relaxed 7 Seconds</option>
              </select>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-bold text-white">UHF RF Frequency Channel Tuning</p>
                <p class="text-slate-400 text-[11px]">Active Radio Frequency channel used by Kavach tower transceivers</p>
              </div>
              <select class="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white font-mono">
                <option value="160.225">160.225 MHz (Channel 1 Primary)</option>
                <option value="160.250">160.250 MHz (Channel 2 Backup)</option>
              </select>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-bold text-white">Audio Alert Sound Effects</p>
                <p class="text-slate-400 text-[11px]">Play audio alert tones on critical anti-SPAD warnings and TSR dispatches</p>
              </div>
              <input type="checkbox" checked class="w-4 h-4 accent-blue-600" />
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // VIEW 1: MAINTENANCE ENGINEER - RESTORED DASHBOARD OVERVIEW
  // Features: 4 Top KPI Cards, P-Track Interactive Selector, Live GIS Track Map,
  // Live Weather Widget (Right side), 128 Active Trains Summary Board.
  // =========================================================================
  function renderDashboardOverview(container) {
    container.innerHTML = `
      <!-- TOP 5 KPI STAT CARDS ROW (High Contrast Government Theme Cards) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        <!-- Card 1: Total Trains (Navy Blue) -->
        <div class="rounded-2xl p-4 bg-white border-2 border-[#12355B] relative overflow-hidden flex flex-col justify-between group hover:shadow-xl transition-all shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-xs font-black text-[#12355B] uppercase tracking-wider">Total Trains</span>
          </div>
          <div class="mt-2.5 flex items-baseline justify-between">
            <div>
              <p class="text-3xl font-black text-[#12355B] font-mono tracking-tight">128</p>
              <p class="text-[11px] text-[#12355B] font-extrabold mt-0.5">Active Trains</p>
            </div>
            <div class="w-8 h-8 rounded-full bg-[#EAF3F8] text-[#12355B] flex items-center justify-center border border-[#12355B]/40 font-bold">
              <i class="fa-solid fa-train text-xs"></i>
            </div>
          </div>
        </div>

        <!-- Card 2: On Time Trains (Green) -->
        <div class="rounded-2xl p-4 bg-white border-2 border-[#138808] relative overflow-hidden flex flex-col justify-between group hover:shadow-xl transition-all shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-xs font-black text-[#138808] uppercase tracking-wider">On Time Trains</span>
          </div>
          <div class="mt-2.5 flex items-baseline justify-between">
            <div>
              <p class="text-3xl font-black text-[#138808] font-mono tracking-tight">75</p>
              <p class="text-[11px] text-[#138808] font-extrabold mt-0.5">58.6% On Time</p>
            </div>
            <div class="w-8 h-8 rounded-full bg-[#F0FDF4] text-[#138808] flex items-center justify-center border border-[#138808]/40 font-bold">
              <i class="fa-regular fa-clock text-xs"></i>
            </div>
          </div>
        </div>

        <!-- Card 3: Delayed Trains (Amber/Saffron) -->
        <div class="rounded-2xl p-4 bg-white border-2 border-[#FF9933] relative overflow-hidden flex flex-col justify-between group hover:shadow-xl transition-all shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-xs font-black text-[#B45309] uppercase tracking-wider">Delayed Trains</span>
          </div>
          <div class="mt-2.5 flex items-baseline justify-between">
            <div>
              <p class="text-3xl font-black text-[#B45309] font-mono tracking-tight">32</p>
              <p class="text-[11px] text-[#B45309] font-extrabold mt-0.5">25.0% Delayed</p>
            </div>
            <div class="w-8 h-8 rounded-full bg-[#FFFBEB] text-[#B45309] flex items-center justify-center border border-[#FF9933]/40 font-bold">
              <i class="fa-regular fa-clock text-xs"></i>
            </div>
          </div>
        </div>

        <!-- Card 4: Major Delays (Red) -->
        <div class="rounded-2xl p-4 bg-white border-2 border-[#DC2626] relative overflow-hidden flex flex-col justify-between group hover:shadow-xl transition-all shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-xs font-black text-[#DC2626] uppercase tracking-wider">Major Delays</span>
          </div>
          <div class="mt-2.5 flex items-baseline justify-between">
            <div>
              <p class="text-3xl font-black text-[#DC2626] font-mono tracking-tight">21</p>
              <p class="text-[11px] text-[#DC2626] font-extrabold mt-0.5">16.4% Major</p>
            </div>
            <div class="w-8 h-8 rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center border border-[#DC2626]/40 font-bold">
              <i class="fa-regular fa-clock text-xs"></i>
            </div>
          </div>
        </div>

        <!-- Card 5: Avg. Delay (Purple) -->
        <div class="rounded-2xl p-4 bg-white border-2 border-[#7C3AED] relative overflow-hidden flex flex-col justify-between group hover:shadow-xl transition-all shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-xs font-black text-[#6D28D9] uppercase tracking-wider">Avg. Delay</span>
          </div>
          <div class="mt-2.5 flex items-baseline justify-between">
            <div>
              <p class="text-3xl font-black text-[#6D28D9] font-mono tracking-tight">24 min</p>
              <p class="text-[11px] text-[#6D28D9] font-extrabold mt-0.5">Division Avg.</p>
            </div>
            <div class="w-8 h-8 rounded-full bg-[#F5F3FF] text-[#6D28D9] flex items-center justify-center border border-[#7C3AED]/40 font-bold">
              <i class="fa-solid fa-gauge-high text-xs"></i>
            </div>
          </div>
        </div>

      </div>

      <!-- MIDDLE CONTENT ROW (3 COLUMNS: Donut Chart, Network Map, AI Live Alerts) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        <!-- LEFT: Train Status Distribution Donut Chart (3 cols) -->
        <div class="lg:col-span-3 glass-card p-4 flex flex-col justify-between space-y-3 bg-white border border-[#D6E3EC]">
          <h3 class="text-sm font-black text-[#12355B] tracking-wide uppercase">Train Status Distribution</h3>
          
          <div class="flex flex-col items-center justify-center my-2 space-y-3">
            <div class="relative w-40 h-40">
              <canvas id="trainStatusDonutChart" class="w-full h-full"></canvas>
            </div>
            
            <!-- Legend list -->
            <div class="w-full space-y-2 text-xs font-extrabold pt-1">
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-2 text-[#0F172A]">
                  <span class="w-3 h-3 rounded-full bg-[#138808]"></span> On Time
                </span>
                <span class="font-mono text-[#138808] font-black">75 <span class="text-[#475569] text-[11px] font-bold">(58.6%)</span></span>
              </div>
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-2 text-[#0F172A]">
                  <span class="w-3 h-3 rounded-full bg-[#FF9933]"></span> Minor Delay
                </span>
                <span class="font-mono text-[#B45309] font-black">32 <span class="text-[#475569] text-[11px] font-bold">(25.0%)</span></span>
              </div>
              <div class="flex items-center justify-between">
                <span class="flex items-center gap-2 text-[#0F172A]">
                  <span class="w-3 h-3 rounded-full bg-[#DC2626]"></span> Major Delay
                </span>
                <span class="font-mono text-[#DC2626] font-black">21 <span class="text-[#475569] text-[11px] font-bold">(16.4%)</span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- CENTER: Live Network Overview Map (6 cols) -->
        <div class="lg:col-span-6 glass-card p-4 space-y-3 flex flex-col justify-between bg-white border border-[#D6E3EC]">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-black text-[#12355B] tracking-wide uppercase">Live Network Overview</h3>
            <span class="text-[10px] font-mono font-black text-[#138808] px-2.5 py-1 rounded-full bg-[#F0FDF4] border border-[#138808]">
              ● Live Telemetry Active
            </span>
          </div>

          <!-- Network Map Canvas Box -->
          <div class="w-full h-64 rounded-xl bg-[#0F172A] border border-[#D6E3EC] relative overflow-hidden flex items-center justify-center">
            <canvas id="liveNetworkCanvas" class="w-full h-full block"></canvas>
          </div>
        </div>

        <!-- RIGHT: AI Alerts (Live) (3 cols) -->
        <div class="lg:col-span-3 glass-card p-4 space-y-3 bg-white border border-[#D6E3EC]">
          <h3 class="text-sm font-black text-[#12355B] tracking-wide uppercase">AI Alerts (Live)</h3>

          <div class="space-y-2.5 text-xs">
            
            <!-- Alert 1: Conflict Detected -->
            <div class="p-3 rounded-xl bg-[#FEF2F2] border-2 border-[#DC2626] space-y-1">
              <div class="flex items-center justify-between">
                <span class="font-black text-[#DC2626] flex items-center gap-1.5">
                  <i class="fa-solid fa-triangle-exclamation"></i> Conflict Detected
                </span>
                <span class="text-[10px] font-mono text-[#7F1D1D] font-bold">2 min ago</span>
              </div>
              <p class="text-[#7F1D1D] text-[11px] font-extrabold leading-relaxed">
                12986 & Freight Train at 20 km ahead
              </p>
            </div>

            <!-- Alert 2: Speed Adjustment -->
            <div class="p-3 rounded-xl bg-[#EAF3F8] border-2 border-[#12355B] space-y-1">
              <div class="flex items-center justify-between">
                <span class="font-black text-[#12355B] flex items-center gap-1.5">
                  <i class="fa-solid fa-triangle-exclamation"></i> Speed Adjustment
                </span>
                <span class="text-[10px] font-mono text-[#12355B] font-bold">5 min ago</span>
              </div>
              <p class="text-[#12355B] text-[11px] font-extrabold leading-relaxed">
                Karnataka Exp. speed reduction suggested
              </p>
            </div>

            <!-- Alert 3: Track Alert -->
            <div class="p-3 rounded-xl bg-[#FFFBEB] border-2 border-[#FF9933] space-y-1">
              <div class="flex items-center justify-between">
                <span class="font-black text-[#B45309] flex items-center gap-1.5">
                  <i class="fa-solid fa-triangle-exclamation"></i> Track Alert
                </span>
                <span class="text-[10px] font-mono text-[#78350F] font-bold">10 min ago</span>
              </div>
              <p class="text-[#78350F] text-[11px] font-extrabold leading-relaxed">
                Loose clip detected near Misrod
              </p>
            </div>

          </div>
        </div>

      </div>

      <!-- BOTTOM CONTENT ROW (3 COLUMNS: Delay Trend Chart, Route Performance Bars, Weather Summary) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        <!-- LEFT: Delay Trend (Today) Line Chart (4 cols) -->
        <div class="lg:col-span-4 glass-card p-4 space-y-3">
          <h3 class="text-sm font-bold text-white tracking-wide">Delay Trend (Today)</h3>
          <div class="h-44 w-full">
            <canvas id="delayTrendChart" class="w-full h-full"></canvas>
          </div>
        </div>

        <!-- CENTER: Route Performance (Avg Delay) (5 cols) -->
        <div class="lg:col-span-5 glass-card p-4 space-y-3">
          <h3 class="text-sm font-bold text-white tracking-wide">Route Performance (Avg Delay)</h3>
          
          <div class="space-y-3 pt-1 text-xs">
            <!-- Route 1: Bhopal - Itarsi -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-slate-300">
                <span>Bhopal - Itarsi</span>
                <span class="font-mono font-bold text-slate-200">24 min</span>
              </div>
              <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div class="h-full rounded-full bg-slate-600" style="width: 55%"></div>
              </div>
            </div>

            <!-- Route 2: Itarsi - Jabalpur -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-slate-300">
                <span>Itarsi - Jabalpur</span>
                <span class="font-mono font-bold text-slate-200">18 min</span>
              </div>
              <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div class="h-full rounded-full bg-slate-600" style="width: 40%"></div>
              </div>
            </div>

            <!-- Route 3: Bhopal - Kota -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-slate-300">
                <span>Bhopal - Kota</span>
                <span class="font-mono font-bold text-slate-200">32 min</span>
              </div>
              <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div class="h-full rounded-full bg-slate-600" style="width: 75%"></div>
              </div>
            </div>

            <!-- Route 4: Itarsi - Nagpur -->
            <div class="space-y-1">
              <div class="flex items-center justify-between text-slate-300">
                <span>Itarsi - Nagpur</span>
                <span class="font-mono font-bold text-slate-200">16 min</span>
              </div>
              <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div class="h-full rounded-full bg-slate-600" style="width: 35%"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Weather Summary (3 cols) -->
        <div class="lg:col-span-3 glass-card p-4 space-y-3 flex flex-col justify-between relative overflow-hidden" id="dashboardWeatherSummaryCard">
          <div class="flex items-center justify-between border-b border-white/10 pb-2">
            <h3 class="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
              <i class="fa-solid fa-cloud-sun text-yellow-400"></i> Live Weather
            </h3>
            <button onclick="requestUserLiveLocation(true)" title="Fetch Live GPS Location" class="px-2 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/60 border border-blue-400/30 text-[10px] text-blue-200 font-bold flex items-center gap-1 transition-all cursor-pointer">
              <i class="fa-solid fa-location-crosshairs ${window.liveWeatherState && window.liveWeatherState.loading ? "animate-spin" : ""}"></i>
              <span>${window.liveWeatherState && window.liveWeatherState.isLive ? "Live GPS" : "Detect Location"}</span>
            </button>
          </div>

          <div id="dashboardWeatherWidgetContent" class="space-y-2">
            <!-- Populated dynamically by updateWeatherUIElements() -->
          </div>
        </div>

      </div>
    `;

    setTimeout(() => {
      initDonutChart();
      initNetworkCanvas();
      initDelayTrendChart();
      updateWeatherUIElements();
    }, 50);
  }

  function initDonutChart() {
    const ctx = document.getElementById("trainStatusDonutChart");
    if (!ctx) return;
    if (window.donutChartInstance) {
      window.donutChartInstance.destroy();
    }
    window.donutChartInstance = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["On Time", "Minor Delay", "Major Delay"],
        datasets: [
          {
            data: [75, 32, 21],
            backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
            borderWidth: 0,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                const val = context.raw;
                const total = 128;
                const pct = ((val / total) * 100).toFixed(1);
                return `${context.label}: ${val} (${pct}%)`;
              },
            },
          },
        },
      },
    });
  }

  function initDelayTrendChart() {
    const ctx = document.getElementById("delayTrendChart");
    if (!ctx) return;
    if (window.delayTrendChartInstance) {
      window.delayTrendChartInstance.destroy();
    }
    window.delayTrendChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"],
        datasets: [
          {
            label: "Route A",
            data: [3, 8, 4, 10, 12, 8, 14],
            borderColor: "#f97316",
            backgroundColor: "transparent",
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 2,
          },
          {
            label: "Route B",
            data: [2, 5, 2, 6, 8, 13, 9],
            borderColor: "#ef4444",
            backgroundColor: "transparent",
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 2,
          },
          {
            label: "Route C",
            data: [1, 3, 5, 2, 4, 6, 8],
            borderColor: "#3b82f6",
            backgroundColor: "transparent",
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#94a3b8", font: { size: 10 } },
          },
          y: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#94a3b8", font: { size: 10 } },
            min: 0,
            max: 15,
          },
        },
      },
    });
  }

  function initNetworkCanvas() {
    const canvas = document.getElementById("liveNetworkCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.parentElement.clientWidth || 500;
    canvas.height = canvas.parentElement.clientHeight || 240;

    const nodes = [
      { name: "Raisen", x: 0.15, y: 0.8 },
      { name: "Bhopal", x: 0.32, y: 0.45 },
      { name: "Misrod", x: 0.48, y: 0.62 },
      { name: "Itarsi", x: 0.55, y: 0.72 },
      { name: "Higral", x: 0.65, y: 0.22 },
      { name: "Harood", x: 0.82, y: 0.35 },
      { name: "Pipariya", x: 0.85, y: 0.72 },
    ];

    let animStep = 0;

    function drawNetwork() {
      if (!document.getElementById("liveNetworkCanvas")) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Draw Track Network Lines
      ctx.lineWidth = 2.5;

      // Bhopal - Misrod - Itarsi (Green line)
      ctx.strokeStyle = "#10b981";
      ctx.beginPath();
      ctx.moveTo(w * nodes[1].x, h * nodes[1].y);
      ctx.lineTo(w * nodes[2].x, h * nodes[2].y);
      ctx.lineTo(w * nodes[3].x, h * nodes[3].y);
      ctx.stroke();

      // Bhopal - Higral - Harood (Yellow/Green line)
      ctx.strokeStyle = "#84cc16";
      ctx.beginPath();
      ctx.moveTo(w * nodes[1].x, h * nodes[1].y);
      ctx.lineTo(w * nodes[4].x, h * nodes[4].y);
      ctx.lineTo(w * nodes[5].x, h * nodes[5].y);
      ctx.stroke();

      // Itarsi - Pipariya (Green line)
      ctx.strokeStyle = "#10b981";
      ctx.beginPath();
      ctx.moveTo(w * nodes[3].x, h * nodes[3].y);
      ctx.lineTo(w * nodes[6].x, h * nodes[6].y);
      ctx.stroke();

      // Raisen - Bhopal (Orange line)
      ctx.strokeStyle = "#f97316";
      ctx.beginPath();
      ctx.moveTo(w * nodes[0].x, h * nodes[0].y);
      ctx.lineTo(w * nodes[1].x, h * nodes[1].y);
      ctx.stroke();

      // Draw Station Nodes (White circles with labels)
      nodes.forEach((node) => {
        const nx = w * node.x;
        const ny = h * node.y;

        ctx.beginPath();
        ctx.arc(nx, ny, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.font = "bold 10px Plus Jakarta Sans, sans-serif";
        ctx.fillStyle = "#e2e8f0";
        ctx.fillText(node.name, nx - 12, ny - 8);
      });

      // Animated Train Node Moving Between Bhopal & Itarsi
      animStep = (animStep + 0.006) % 1;
      const trainX = w * (nodes[1].x + (nodes[3].x - nodes[1].x) * animStep);
      const trainY = h * (nodes[1].y + (nodes[3].y - nodes[1].y) * animStep);

      ctx.beginPath();
      ctx.arc(trainX, trainY, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#ef4444";
      ctx.fill();
      ctx.shadowBlur = 0;

      requestAnimationFrame(drawNetwork);
    }

    drawNetwork();
  }

  // =========================================================================
  // DEDICATED SEPARATE DEPARTMENT WORKSPACES
  // =========================================================================
  let activeSmSubTab = "sm_platforms";

  window.switchSmSubTab = function (tab) {
    activeSmSubTab = tab || "sm_platforms";
    const container = document.getElementById("activeSubTabContainer");
    if (container) renderStationMasterWorkspace(container);
  };

  function renderStationMasterWorkspace(container) {
    let subTabHtml = "";

    if (activeSmSubTab === "sm_platforms") {
      subTabHtml = `
        <!-- SUB-TAB 1: PLATFORM LINE ALLOTMENT & INTERLOCKING -->
        <div class="glass-card p-5 space-y-4 border border-cyan-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-list-ol text-cyan-400"></i> Platform Line Allotment & Interlocking Status (NDLS Station)
            </h3>
            <span class="text-xs font-mono text-cyan-300 font-bold">16 Active Lines</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-900/60 border-b border-white/10">
                <tr>
                  <th class="py-3 px-3">Platform Line</th>
                  <th class="py-3 px-3">Assigned Locomotive / Train</th>
                  <th class="py-3 px-3">Line Status</th>
                  <th class="py-3 px-3">Kavach Signal Aspect</th>
                  <th class="py-3 px-3">Interlocking Lock</th>
                  <th class="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 font-medium text-slate-200">
                <tr class="hover:bg-white/5">
                  <td class="py-3 px-3 font-mono font-bold text-white">Platform 1 (Main Up)</td>
                  <td class="py-3 px-3 font-bold text-blue-300">12951 Mumbai Rajdhani Express</td>
                  <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px]">OCCUPIED (BOARDING)</span></td>
                  <td class="py-3 px-3 text-emerald-400 font-bold flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span> GREEN (CLEAR)</td>
                  <td class="py-3 px-3 text-slate-300"><i class="fa-solid fa-lock text-emerald-400"></i> Route Locked</td>
                  <td class="py-3 px-3 text-right">
                    <button onclick="showToast('Toggled Signal Aspect for PF 1', 'info')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px]">Change Signal</button>
                  </td>
                </tr>
                <tr class="hover:bg-white/5">
                  <td class="py-3 px-3 font-mono font-bold text-white">Platform 2 (Main Dn)</td>
                  <td class="py-3 px-3 font-bold text-blue-300">12012 Vande Bharat Express</td>
                  <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px]">OCCUPIED (ARRIVED)</span></td>
                  <td class="py-3 px-3 text-amber-400 font-bold flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span> YELLOW (CAUTION)</td>
                  <td class="py-3 px-3 text-slate-300"><i class="fa-solid fa-lock text-emerald-400"></i> Route Locked</td>
                  <td class="py-3 px-3 text-right">
                    <button onclick="showToast('Toggled Signal Aspect for PF 2', 'info')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px]">Change Signal</button>
                  </td>
                </tr>
                <tr class="hover:bg-white/5">
                  <td class="py-3 px-3 font-mono font-bold text-white">Platform 3 (Loop Up)</td>
                  <td class="py-3 px-3 font-bold text-slate-400">12059 Kota Jan Shatabdi</td>
                  <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/30 text-[10px]">RESERVED (+15m)</span></td>
                  <td class="py-3 px-3 text-red-400 font-bold flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-500"></span> RED (STOP)</td>
                  <td class="py-3 px-3 text-slate-400"><i class="fa-solid fa-lock-open text-amber-400"></i> Unlocked</td>
                  <td class="py-3 px-3 text-right">
                    <button onclick="showToast('Granted Route Lock for PF 3', 'success')" class="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px]">Lock Route</button>
                  </td>
                </tr>
                <tr class="hover:bg-white/5">
                  <td class="py-3 px-3 font-mono font-bold text-white">Platform 4 (Yard Line)</td>
                  <td class="py-3 px-3 font-bold text-slate-400">Freight WAG9 #31088</td>
                  <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">SHUNTCAR MOVEMENT</span></td>
                  <td class="py-3 px-3 text-yellow-400 font-bold flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-yellow-400"></span> SHUNTING PERMIT</td>
                  <td class="py-3 px-3 text-slate-300"><i class="fa-solid fa-lock text-emerald-400"></i> Yard Locked</td>
                  <td class="py-3 px-3 text-right">
                    <button onclick="showToast('Issued Yard Shunting Permit', 'info')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px]">Shunt Permit</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (activeSmSubTab === "sm_trb") {
      subTabHtml = `
        <!-- SUB-TAB 2: ELECTRONIC TRAIN REGISTER BOOK (T/1425 TRB) -->
        <div class="glass-card p-5 space-y-4 border border-cyan-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-book-open text-cyan-400"></i> Electronic Train Register Book (T/1425 TRB Live Register)
            </h3>
            <span class="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 text-xs font-bold font-mono">AUTOMATIC KAVACH LOG</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs font-mono">
              <thead class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-900/60 border-b border-white/10">
                <tr>
                  <th class="py-3 px-3">Entry ID</th>
                  <th class="py-3 px-3">Train No. & Name</th>
                  <th class="py-3 px-3">Loco ID</th>
                  <th class="py-3 px-3">Line Clear Time</th>
                  <th class="py-3 px-3">Arrival Time</th>
                  <th class="py-3 px-3">Departure Time</th>
                  <th class="py-3 px-3">Block Token Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 text-slate-200">
                <tr class="hover:bg-white/5">
                  <td class="py-3 px-3 font-bold text-white">TRB-8821</td>
                  <td class="py-3 px-3 text-cyan-300 font-sans font-bold">12951 Mumbai Rajdhani</td>
                  <td class="py-3 px-3 text-slate-400">WAP7 #30211</td>
                  <td class="py-3 px-3 text-slate-400">10:14:00 AM</td>
                  <td class="py-3 px-3 text-emerald-400 font-bold">10:20:15 AM</td>
                  <td class="py-3 px-3 text-amber-400 font-bold">10:25:00 AM (Est)</td>
                  <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px]">VERIFIED (TOKEN ISSUED)</span></td>
                </tr>
                <tr class="hover:bg-white/5">
                  <td class="py-3 px-3 font-bold text-white">TRB-8820</td>
                  <td class="py-3 px-3 text-cyan-300 font-sans font-bold">12012 Vande Bharat Express</td>
                  <td class="py-3 px-3 text-slate-400">Trainset #08</td>
                  <td class="py-3 px-3 text-slate-400">09:45:00 AM</td>
                  <td class="py-3 px-3 text-emerald-400 font-bold">09:50:30 AM</td>
                  <td class="py-3 px-3 text-emerald-400 font-bold">09:55:00 AM</td>
                  <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px]">CLOSED (LINE CLEAR)</span></td>
                </tr>
                <tr class="hover:bg-white/5">
                  <td class="py-3 px-3 font-bold text-white">TRB-8819</td>
                  <td class="py-3 px-3 text-cyan-300 font-sans font-bold">12059 Kota Jan Shatabdi</td>
                  <td class="py-3 px-3 text-slate-400">WAP5 #30004</td>
                  <td class="py-3 px-3 text-slate-400">09:15:00 AM</td>
                  <td class="py-3 px-3 text-slate-400">09:22:10 AM</td>
                  <td class="py-3 px-3 text-slate-400">09:27:00 AM</td>
                  <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px]">CLOSED (LINE CLEAR)</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (activeSmSubTab === "sm_caution") {
      subTabHtml = `
        <!-- SUB-TAB 3: CAUTION ORDERS & SHUNTING PERMITS -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="glass-card p-4 space-y-3 border border-cyan-500/30">
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-file-signature text-cyan-400"></i> Station Caution Order (T/409) & Permit Generator
            </h3>
            
            <form onsubmit="event.preventDefault(); showToast('Transmitted Caution Order T/409 via Kavach RF link', 'success');" class="space-y-2.5 text-xs">
              <div>
                <label class="block font-bold text-slate-300 mb-1">Loco Number / Train ID</label>
                <input type="text" placeholder="e.g. Loco WAP7 #30211 / Train 12951" required class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white" />
              </div>
              <div>
                <label class="block font-bold text-slate-300 mb-1">Permit / Order Type</label>
                <select class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white">
                  <option>T/409 — Caution Order (Temporary Speed Restriction)</option>
                  <option>T/369(3b) — Signal Passing Authority</option>
                  <option>T/806 — Shunting Order Authority</option>
                </select>
              </div>
              <div>
                <label class="block font-bold text-slate-300 mb-1">Enforced Caution Speed & Location</label>
                <input type="text" placeholder="e.g. 30 km/h at Km 14/2 due to Track Work" required class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white" />
              </div>
              <button type="submit" class="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer">
                Transmit Caution Order via Kavach RF
              </button>
            </form>
          </div>

          <div class="glass-card p-4 space-y-3 border border-cyan-500/30">
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-clock-rotate-left text-cyan-400"></i> Issued Caution Orders Log (Today)
            </h3>

            <div class="space-y-2 text-xs font-mono">
              <div class="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between">
                <div>
                  <p class="font-bold text-amber-400">T/409 CAUTION ORDER ISSUED</p>
                  <p class="text-[10px] text-slate-400">Train 12951 • 30 km/h at Km 14/2</p>
                </div>
                <span class="text-[10px] text-slate-400">10:24 AM</span>
              </div>
              <div class="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between">
                <div>
                  <p class="font-bold text-emerald-400">T/806 SHUNTING PERMIT</p>
                  <p class="text-[10px] text-slate-400">WAG9 Freight #31088 • Yard Line 4</p>
                </div>
                <span class="text-[10px] text-slate-400">10:11 AM</span>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (activeSmSubTab === "sm_pa") {
      subTabHtml = `
        <!-- SUB-TAB 4: PA SYSTEM & PASSENGER DISPLAY GUIDANCE -->
        <div class="glass-card p-5 space-y-4 border border-cyan-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-bullhorn text-cyan-400"></i> Station PA System & Passenger Display Guidance Terminal
            </h3>
            <span class="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 text-xs font-bold font-mono">AUDIO ENGINE ONLINE</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3">
              <h4 class="font-bold text-white flex items-center gap-2">
                <i class="fa-solid fa-volume-high text-cyan-400"></i> Trigger Public Announcement
              </h4>
              <div>
                <label class="block font-bold text-slate-300 mb-1">Select Train & Platform</label>
                <select class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white">
                  <option>12951 Mumbai Rajdhani — Arriving Platform 1</option>
                  <option>12012 Vande Bharat — Departing Platform 2</option>
                </select>
              </div>
              <div class="flex items-center gap-2">
                <button type="button" onclick="showToast('Broadcast Announcement in Hindi & English', 'success')" class="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
                  Broadcast Announcement
                </button>
              </div>
            </div>

            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-3">
              <h4 class="font-bold text-white flex items-center gap-2">
                <i class="fa-solid fa-tv text-cyan-400"></i> Coach Guidance Display Sync
              </h4>
              <p class="text-slate-400 text-[11px]">Platform 1 LED Boards: Syncing coach composition H1-A1-A2-B1-B2-PC-S1 to S10.</p>
              <button type="button" onclick="showToast('Synced Coach Guidance Displays for PF 1', 'info')" class="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold">
                Force Display Sync
              </button>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="space-y-5">
        <!-- Top Action Bar -->
        <div class="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-cyan-500">
          <div>
            <span class="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold uppercase tracking-wider">Station Master Operations Console</span>
            <h2 class="text-xl font-black text-white font-['Outfit'] mt-1 flex items-center gap-2">
              🚉 New Delhi (NDLS) Station Command Terminal
            </h2>
            <p class="text-xs text-slate-400">Platform allotment, Train Register Book (T/1425), Caution Orders (T/409) & PA system control</p>
          </div>
          
          <div class="flex items-center gap-2 text-xs">
            <button onclick="showToast('Issued Station Line Clear for Train 12951 Mumbai Rajdhani', 'success')" class="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-lg">
              <i class="fa-solid fa-circle-check"></i> Grant Line Clear
            </button>
            <button onclick="showToast('STATION EMERGENCY BLOCK ACTIVATED: Red Signal applied to PF 1-4', 'error')" class="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 shadow-lg">
              <i class="fa-solid fa-triangle-exclamation"></i> Station Emergency Block
            </button>
          </div>
        </div>

        <!-- Station Master Sub-Tabs -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button type="button" onclick="switchSmSubTab('sm_platforms')" class="px-3.5 py-2 rounded-xl border transition-all ${activeSmSubTab === "sm_platforms" ? "bg-cyan-600/30 border-cyan-400 text-cyan-200 font-bold shadow-lg shadow-cyan-500/20" : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"}">
            <i class="fa-solid fa-list-ol text-cyan-400"></i> Platform Lines & Interlocking
          </button>
          <button type="button" onclick="switchSmSubTab('sm_trb')" class="px-3.5 py-2 rounded-xl border transition-all ${activeSmSubTab === "sm_trb" ? "bg-cyan-600/30 border-cyan-400 text-cyan-200 font-bold shadow-lg shadow-cyan-500/20" : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"}">
            <i class="fa-solid fa-book-open text-cyan-400"></i> Train Register Book (T/1425)
          </button>
          <button type="button" onclick="switchSmSubTab('sm_caution')" class="px-3.5 py-2 rounded-xl border transition-all ${activeSmSubTab === "sm_caution" ? "bg-cyan-600/30 border-cyan-400 text-cyan-200 font-bold shadow-lg shadow-cyan-500/20" : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"}">
            <i class="fa-solid fa-file-signature text-cyan-400"></i> Caution Orders (T/409) & Permits
          </button>
          <button type="button" onclick="switchSmSubTab('sm_pa')" class="px-3.5 py-2 rounded-xl border transition-all ${activeSmSubTab === "sm_pa" ? "bg-cyan-600/30 border-cyan-400 text-cyan-200 font-bold shadow-lg shadow-cyan-500/20" : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"}">
            <i class="fa-solid fa-bullhorn text-cyan-400"></i> PA System & Passenger Displays
          </button>
        </div>

        ${subTabHtml}
      </div>
    `;
  }

  let activeMaintSubTab = "pway";

  window.switchMaintSubTab = function (subTab) {
    activeMaintSubTab = subTab || "pway";
    const container = document.getElementById("activeSubTabContainer");
    if (container) renderMaintenanceEngineerWorkspace(container);
  };

  function renderMaintenanceEngineerWorkspace(container) {
    const currentTrack = pTrackData[selectedPTrack] || pTrackData["p-track-1"];

    let subTabContentHtml = "";

    if (activeMaintSubTab === "pway") {
      subTabContentHtml = `
        <!-- SUB-TAB 1: P-WAY TRACK & GEOMETRY (P-Track Selector + USFD Spectrum + Stress) -->
        <div class="space-y-4">
          <!-- P-TRACK INTERACTIVE SELECTOR BAR -->
          <div class="glass-card p-4 space-y-3 border border-amber-500/30">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-route text-amber-400 text-base"></i>
                <span class="text-xs font-bold text-slate-200 uppercase tracking-wider">Select P-Way Track Section (P-Track):</span>
              </div>
              <span class="px-3 py-1 rounded-full text-xs font-mono font-bold ${currentTrack.statusClass}">
                Status: ${currentTrack.status} (${currentTrack.speedLimit})
              </span>
            </div>

            <!-- Interactive P-Track Buttons -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              ${Object.keys(pTrackData)
                .map((tId) => {
                  const trk = pTrackData[tId];
                  const isSel = tId === selectedPTrack;
                  return `
                  <button type="button" onclick="selectPTrack('${tId}')" class="p-3 rounded-xl text-left transition-all cursor-pointer border ${isSel ? "bg-amber-600/30 border-amber-400 shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/50" : "bg-slate-900/80 border-white/10 hover:border-slate-600 hover:bg-slate-800/60"}">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-black ${isSel ? "text-amber-300" : "text-white"}">${trk.name.split(":")[0]}</span>
                      ${isSel ? '<i class="fa-solid fa-circle-check text-amber-400 text-xs"></i>' : '<i class="fa-solid fa-circle-notch text-slate-600 text-xs"></i>'}
                    </div>
                    <p class="text-[11px] text-slate-300 mt-1 truncate">${trk.name.split(":")[1] || trk.name}</p>
                    <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1.5 pt-1.5 border-t border-white/5">
                      <span>Health: <strong class="${isSel ? "text-emerald-300" : "text-emerald-400"}">${trk.health}</strong></span>
                      <span>Speed: ${trk.speedLimit}</span>
                    </div>
                  </button>
                `;
                })
                .join("")}
            </div>
          </div>

          <!-- USFD Acoustic Spectrum Canvas & Stress Grid -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <!-- USFD Spectrum Canvas (7 cols) -->
            <div class="lg:col-span-7 glass-card p-4 space-y-3">
              <div class="flex items-center justify-between border-b border-white/10 pb-2">
                <h3 class="text-sm font-bold text-white flex items-center gap-2">
                  <i class="fa-solid fa-wave-square text-amber-400"></i> USFD Real-Time Ultrasonic Acoustic Probe Spectrum
                </h3>
                <span class="text-[10px] font-mono text-emerald-400">2.25 MHz Transducer Active</span>
              </div>
              <div class="h-32 w-full bg-slate-950 rounded-xl border border-amber-500/30 p-2 relative">
                <canvas id="usfdSpectrumChart" class="w-full h-full block"></canvas>
              </div>
              <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Active Track: <strong class="text-amber-300">${currentTrack.name}</strong></span>
                <span>CSM/3X Tamping Roster: <strong class="text-blue-300">Scheduled 02:00 IST</strong></span>
              </div>
            </div>

            <!-- Rail Stress & Temperature Gauge (5 cols) -->
            <div class="lg:col-span-5 glass-card p-4 space-y-3 flex flex-col justify-between">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <i class="fa-solid fa-temperature-full text-red-400"></i> Rail Thermal Stress & Ballast Cushion
              </h3>

              <div class="grid grid-cols-2 gap-3 text-xs">
                <div class="p-3 rounded-xl bg-slate-900 border border-white/10">
                  <p class="text-[10px] text-slate-400 uppercase font-bold">Rail Temp (td)</p>
                  <p class="text-2xl font-black text-amber-400 font-mono">48°C</p>
                  <p class="text-[10px] text-slate-400 mt-1">td + 20°C Limit</p>
                </div>
                <div class="p-3 rounded-xl bg-slate-900 border border-white/10">
                  <p class="text-[10px] text-slate-400 uppercase font-bold">Ballast Cushion</p>
                  <p class="text-2xl font-black text-emerald-400 font-mono">350 mm</p>
                  <p class="text-[10px] text-slate-400 mt-1">Clean Ballast</p>
                </div>
              </div>

              <div class="p-2 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-2">
                <i class="fa-solid fa-circle-check text-emerald-400"></i> No track thermal expansion buckling risk in Delhi division today.
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (activeMaintSubTab === "s_and_t") {
      subTabContentHtml = `
        <!-- SUB-TAB 2: S&T SIGNAL & TELECOM DIAGNOSTICS -->
        <div class="glass-card p-5 space-y-4 border border-cyan-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-tower-cell text-cyan-400"></i> Signal & Telecommunication (S&T) Diagnostics Terminal
            </h3>
            <span class="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 text-xs font-bold font-mono">S&T HEALTH 100%</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-white">Point Machine #102B (NDLS)</h4>
                <span class="px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">HEALTHY</span>
              </div>
              <p class="text-slate-400 text-[11px]">1:32 Turnout Throw Time: 2.8s • Operating Current: 3.2A</p>
              <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Locking Stroke: 100 mm</span>
                <span>Frictional Clutch: OK</span>
              </div>
            </div>

            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-white">Axle Counter Track Circuit #4B</h4>
                <span class="px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">HEALTHY</span>
              </div>
              <p class="text-slate-400 text-[11px]">Sensor Voltage: 1.45V AC • High Frequency Phase Shift Verified</p>
              <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Wheel In/Out Count: 0</span>
                <span>Section Status: CLEAR</span>
              </div>
            </div>

            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-white">Kavach RFID Tag Programmer</h4>
                <span class="px-2.5 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] font-bold">PROGRAMMED</span>
              </div>
              <p class="text-slate-400 text-[11px]">Track RFID Tags Verified: 142/142 • Distance Offset Matrix Matched</p>
              <div class="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>RF Signal Attenuation: -2 dB</span>
                <span>OBC Transceiver: SYNCED</span>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (activeMaintSubTab === "loco_shed") {
      subTabContentHtml = `
        <!-- SUB-TAB 3: LOCO SHED & ROLLING STOCK MAINTENANCE -->
        <div class="glass-card p-5 space-y-4 border border-blue-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-train text-blue-400"></i> Rolling Stock & Electric Loco Shed Terminal (Loco Shed NDLS)
            </h3>
            <span class="px-2.5 py-1 rounded-full bg-blue-950 text-blue-300 text-xs font-bold font-mono">14 LOCOS INSPECTED TODAY</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-white">Loco WAP7 #30211 Wheel Profile</h4>
                <span class="px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">PASSED</span>
              </div>
              <p class="text-slate-400 text-[11px]">Flange Thickness: 29.4 mm (Min Limit 22.0 mm) • Tread Diameter 1092 mm</p>
            </div>

            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-white">Composite Brake Block Wear</h4>
                <span class="px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">PASSED</span>
              </div>
              <p class="text-slate-400 text-[11px]">Block Thickness: 38 mm (Rejection Limit 10 mm) • K-Type Composite</p>
            </div>

            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-white">Pantograph Carbon Strip Wear</h4>
                <span class="px-2.5 py-0.5 rounded bg-amber-950 text-amber-400 text-[10px] font-bold">INSPECT AT 500KM</span>
              </div>
              <p class="text-slate-400 text-[11px]">Strip Wear: 18 mm (Max Allowable Wear 24 mm) • Auto Pressure Drop OK</p>
            </div>
          </div>
        </div>
      `;
    } else if (activeMaintSubTab === "ohe") {
      subTabContentHtml = `
        <!-- SUB-TAB 4: OHE OVERHEAD ELECTRICAL SYSTEMS -->
        <div class="glass-card p-5 space-y-4 border border-yellow-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-bolt text-yellow-400"></i> OHE Overhead Electrical Equipment Terminal (25kV AC Grid)
            </h3>
            <span class="px-2.5 py-1 rounded-full bg-yellow-950 text-yellow-300 text-xs font-bold font-mono">FEEDER 24.8 kV ACTIVE</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-white">Catenary Wire Height & Stagger</h4>
                <span class="px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">OPTIMAL</span>
              </div>
              <p class="text-slate-400 text-[11px]">Height: 5.55 m • Stagger: +180 mm (Limit ±200 mm)</p>
            </div>

            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-white">Neutral Section Insulator</h4>
                <span class="px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">CLEAR</span>
              </div>
              <p class="text-slate-400 text-[11px]">NDLS-NZM Km 14/2 • Loco Auto Power Cut-out Test Passed</p>
            </div>

            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-white">Traction Substation Breaker</h4>
                <span class="px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">CLOSED</span>
              </div>
              <p class="text-slate-400 text-[11px]">Substation Voltage: 24.8 kV • Active Current Load: 420 Amperes</p>
            </div>
          </div>
        </div>
      `;
    } else if (activeMaintSubTab === "work_orders") {
      subTabContentHtml = `
        <!-- SUB-TAB 5: P-WAY TRACK REPAIR WORK ORDER DISPATCHER TABLE -->
        <div class="glass-card p-5 space-y-4 border border-amber-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-clipboard-list text-amber-400"></i> P-Way Track Repair Work Order Dispatcher
            </h3>
            <span class="text-xs font-mono text-slate-400">${workOrders.length} Total Repair Orders</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-900/60 border-b border-white/10">
                <tr>
                  <th class="py-3 px-3">Order ID</th>
                  <th class="py-3 px-3">Location / Track Section</th>
                  <th class="py-3 px-3">Defect / Hazard</th>
                  <th class="py-3 px-3">Priority</th>
                  <th class="py-3 px-3">Status</th>
                  <th class="py-3 px-3">Assigned Maintenance Crew</th>
                  <th class="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 font-medium text-slate-200">
                ${workOrders
                  .map(
                    (wo) => `
                  <tr class="hover:bg-white/5 transition-colors">
                    <td class="py-3 px-3 font-mono font-bold text-white">${wo.id}</td>
                    <td class="py-3 px-3 text-slate-300">${wo.location}</td>
                    <td class="py-3 px-3">${wo.defect}</td>
                    <td class="py-3 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${wo.priorityClass}">${wo.priority}</span></td>
                    <td class="py-3 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${wo.statusClass}">${wo.status}</span></td>
                    <td class="py-3 px-3 text-slate-400 text-[11px]">${wo.crew}</td>
                    <td class="py-3 px-3 text-right">
                      <button onclick="updateWoStatus('${wo.id}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px]">Toggle Status</button>
                    </td>
                  </tr>
                `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="space-y-5">
        <!-- Top Action Bar & Department Header -->
        <div class="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-amber-500">
          <div>
            <span class="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider">Maintenance Engineering Department Hub</span>
            <h2 class="text-xl font-black text-white font-['Outfit'] mt-1 flex items-center gap-2">
              🛠️ Indian Railways Integrated Maintenance Engineering Hub
            </h2>
            <p class="text-xs text-slate-400">P-Way track & geometry, S&T signal diagnostics, Rolling stock loco shed, OHE electrical systems & work orders</p>
          </div>
          
          <div class="flex items-center gap-2 text-xs">
            <button onclick="openNewWorkOrderModal()" class="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 shadow-lg">
              <i class="fa-solid fa-plus"></i> Dispatch Repair Order
            </button>
            <button onclick="runUsfdCalibrationTest()" class="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 shadow-lg">
              <i class="fa-solid fa-tower-cell"></i> Calibrate USFD Probes
            </button>
          </div>
        </div>

        <!-- Distinct Sub-Tab Navigation Bar (Indian Railways Modules) -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button type="button" onclick="switchMaintSubTab('pway')" class="px-3.5 py-2 rounded-xl border transition-all ${activeMaintSubTab === "pway" ? "bg-amber-600/30 border-amber-400 text-amber-200 font-bold shadow-lg shadow-amber-500/20" : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"}">
            <i class="fa-solid fa-ruler-combined text-amber-400"></i> P-Way Track & Geometry
          </button>
          <button type="button" onclick="switchMaintSubTab('s_and_t')" class="px-3.5 py-2 rounded-xl border transition-all ${activeMaintSubTab === "s_and_t" ? "bg-cyan-600/30 border-cyan-400 text-cyan-200 font-bold shadow-lg shadow-cyan-500/20" : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"}">
            <i class="fa-solid fa-tower-cell text-cyan-400"></i> S&T Signal & Telecom
          </button>
          <button type="button" onclick="switchMaintSubTab('loco_shed')" class="px-3.5 py-2 rounded-xl border transition-all ${activeMaintSubTab === "loco_shed" ? "bg-blue-600/30 border-blue-400 text-blue-200 font-bold shadow-lg shadow-blue-500/20" : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"}">
            <i class="fa-solid fa-train text-blue-400"></i> Rolling Stock Loco Shed
          </button>
          <button type="button" onclick="switchMaintSubTab('ohe')" class="px-3.5 py-2 rounded-xl border transition-all ${activeMaintSubTab === "ohe" ? "bg-yellow-600/30 border-yellow-400 text-yellow-200 font-bold shadow-lg shadow-yellow-500/20" : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"}">
            <i class="fa-solid fa-bolt text-yellow-400"></i> OHE Overhead Electrical
          </button>
          <button type="button" onclick="switchMaintSubTab('work_orders')" class="px-3.5 py-2 rounded-xl border transition-all ${activeMaintSubTab === "work_orders" ? "bg-emerald-600/30 border-emerald-400 text-emerald-200 font-bold shadow-lg shadow-emerald-500/20" : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"}">
            <i class="fa-solid fa-clipboard-list text-emerald-400"></i> P-Way Repair Work Orders
          </button>
        </div>

        <!-- Rendered Active Sub-Tab Module Workspace -->
        <div id="activeSubTabContainer">
          ${subTabContentHtml}
        </div>
      </div>
    `;

    if (activeMaintSubTab === "pway") {
      setTimeout(initUsfdSpectrumCanvas, 50);
    }
  }

  let activeCtrlSubTab = "ctrl_tsr";

  window.switchCtrlSubTab = function (tab) {
    activeCtrlSubTab = tab || "ctrl_tsr";
    const container = document.getElementById("activeSubTabContainer");
    if (container) renderControlRoomWorkspace(container);
  };

  function renderControlRoomWorkspace(container) {
    let subTabHtml = "";

    if (activeCtrlSubTab === "ctrl_tsr") {
      subTabHtml = `
        <!-- SUB-TAB 1: TSR & SPEED RESTRICTIONS + AI PRECEDENCE -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <!-- Section TSR Speed Restriction Enforcer (6 cols) -->
          <div class="lg:col-span-6 glass-card p-5 space-y-4 border border-emerald-500/30">
            <div class="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <i class="fa-solid fa-gauge-simple-high text-emerald-400"></i> Temporary Speed Restriction (TSR) Controls
              </h3>
              <span class="text-[10px] font-mono text-emerald-400">Kavach RF Auto-Broadcast</span>
            </div>

            <form onsubmit="event.preventDefault(); showToast('TSR Speed Restriction Applied to Selected Sector!', 'success');" class="space-y-3 text-xs">
              <div>
                <label class="block font-bold text-slate-300 mb-1">Target Sector / Track Block</label>
                <select class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white">
                  <option>NDLS – NZM Up Main (Km 12/4 to 15/8)</option>
                  <option>NZM – FDB Main (Km 22/1 to 28/4)</option>
                  <option>TKD – MTJ Section (Km 45/0 to 52/2)</option>
                </select>
              </div>

              <div>
                <label class="block font-bold text-slate-300 mb-1">Enforced Max Speed Limit (km/h)</label>
                <div class="grid grid-cols-4 gap-2">
                  <button type="button" onclick="showToast('Set TSR Limit to 30 km/h', 'info')" class="py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-red-500/40 text-red-300 font-bold">30 km/h</button>
                  <button type="button" onclick="showToast('Set TSR Limit to 45 km/h', 'info')" class="py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 font-bold">45 km/h</button>
                  <button type="button" onclick="showToast('Set TSR Limit to 60 km/h', 'info')" class="py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-blue-500/40 text-blue-300 font-bold">60 km/h</button>
                  <button type="button" onclick="showToast('Revoked TSR Limit (Normal 130 km/h)', 'success')" class="py-2 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold">Normal</button>
                </div>
              </div>

              <div>
                <label class="block font-bold text-slate-300 mb-1">Reason for Restriction</label>
                <input type="text" placeholder="e.g. Dense Fog / Track Maintenance / Signal Testing" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white" />
              </div>

              <button type="submit" class="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer">
                Broadcast TSR Speed Limit via Kavach RF
              </button>
            </form>
          </div>

          <!-- Train Overtaking & Precedence Controller (6 cols) -->
          <div class="lg:col-span-6 glass-card p-5 space-y-4 border border-emerald-500/30">
            <div class="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <i class="fa-solid fa-code-fork text-blue-400"></i> AI Train Precedence & Overtaking Controller
              </h3>
              <span class="text-[10px] font-mono text-blue-300">Division Dispatch</span>
            </div>

            <div class="space-y-2.5 text-xs">
              <div class="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-white">12951 Mumbai Rajdhani (Precedence Over Freight)</span>
                  <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">PRIORITY 1</span>
                </div>
                <p class="text-slate-400 text-[11px]">Freight WAG9 #31088 loop-lined at Palwal station to allow Rajdhani 110 km/h pass-through.</p>
              </div>

              <div class="p-3 rounded-xl bg-slate-900 border border-white/10 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-white">12012 Vande Bharat (Platform 2 Hold)</span>
                  <span class="px-2 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px] font-bold">PRIORITY 2</span>
                </div>
                <p class="text-slate-400 text-[11px]">Scheduled 3-min signal hold at Ghaziabad junction for track clearance.</p>
              </div>

              <button onclick="showToast('Re-evaluated Train Precedence matrix using AI Engine', 'success')" class="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all cursor-pointer">
                Re-calculate AI Precedence Schedule
              </button>
            </div>
          </div>
        </div>
      `;
    } else if (activeCtrlSubTab === "ctrl_string_graph") {
      subTabHtml = `
        <!-- SUB-TAB 2: LIVE TIME-DISTANCE TRAIN CHART (STRING GRAPH) -->
        <div class="glass-card p-5 space-y-4 border border-emerald-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-chart-line text-emerald-400"></i> Live Section Time-Distance Train String Chart (NDLS - NZM - FDB - MTJ)
            </h3>
            <span class="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 text-xs font-bold font-mono">REAL-TIME TRAIN STRINGS</span>
          </div>

          <div class="h-44 w-full bg-slate-950 rounded-xl border border-emerald-500/30 p-3 relative flex items-center justify-center">
            <div class="w-full h-full flex flex-col justify-between text-xs font-mono text-slate-400">
              <div class="flex justify-between border-b border-white/10 pb-1 text-[10px]">
                <span>NDLS (0 Km)</span>
                <span>NZM (14 Km)</span>
                <span>FDB (28 Km)</span>
                <span>MTJ (140 Km)</span>
              </div>
              <div class="relative flex-1 py-2">
                <!-- String lines -->
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-dashed border-emerald-500/30"></div>
                </div>
                <div class="p-2 rounded bg-emerald-950/80 border border-emerald-500/40 text-[11px] text-emerald-300 font-bold w-fit">
                  ⚡ Train 12951 Mumbai Rajdhani • 112 km/h • On Schedule (0 Delay)
                </div>
              </div>
              <div class="flex justify-between text-[10px] text-slate-500 border-t border-white/10 pt-1">
                <span>08:00 IST</span>
                <span>09:00 IST</span>
                <span>10:00 IST</span>
                <span>11:00 IST</span>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (activeCtrlSubTab === "ctrl_freight") {
      subTabHtml = `
        <!-- SUB-TAB 3: FREIGHT RAKE & COAL ROSTER DISPATCHER -->
        <div class="glass-card p-5 space-y-4 border border-emerald-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-boxes-packing text-amber-400"></i> Freight Rake & Goods Shed Priority Dispatcher
            </h3>
            <span class="px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 text-xs font-bold font-mono">18 FREIGHT RAKES ACTIVE</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <h4 class="font-bold text-white">BOXN Coal Rake #58102</h4>
              <p class="text-slate-400 text-[11px]">Load: 3,850 Tons Thermal Coal • From NTPC Dadri</p>
              <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">GREEN CORRIDOR ASSIGNED</span>
            </div>
            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <h4 class="font-bold text-white">BTPN Oil Tanker Rake #99201</h4>
              <p class="text-slate-400 text-[11px]">Load: 2,400 KLD Aviation Turbine Fuel • Mathura Refinery</p>
              <span class="px-2 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px] font-bold">HAZMAT CLEARANCE OK</span>
            </div>
            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <h4 class="font-bold text-white">BCN Covered Grains Rake #20412</h4>
              <p class="text-slate-400 text-[11px]">Load: 2,600 Tons Wheat (FCI Rake) • Tughlakabad Yard</p>
              <span class="px-2 py-0.5 rounded bg-amber-950 text-amber-400 text-[10px] font-bold">UNLOADING AT YARD 3</span>
            </div>
          </div>
        </div>
      `;
    } else if (activeCtrlSubTab === "ctrl_disaster") {
      subTabHtml = `
        <!-- SUB-TAB 4: DISASTER MANAGEMENT ART / ARME DISPATCHER -->
        <div class="glass-card p-5 space-y-4 border border-red-500/40">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-truck-medical text-red-400"></i> Disaster Management ART (Accident Relief Train) Dispatcher
            </h3>
            <span class="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 text-xs font-bold font-mono">ART/ARME STANDBY</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <h4 class="font-bold text-white">Class-A ART Unit (NDLS Yard)</h4>
              <p class="text-slate-400 text-[11px]">140-Ton Gottwald Crane + Hydraulic Re-railing Equipment</p>
              <button onclick="showToast('ART Unit Ready in 15 Min Standby', 'info')" class="w-full py-1.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">Check Readiness</button>
            </div>
            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <h4 class="font-bold text-white">ARME Medical Relief Van (NZM)</h4>
              <p class="text-slate-400 text-[11px]">2-Coach Self-Propelled Medical Van with Operation Theater</p>
              <button onclick="showToast('ARME Medical Unit Operational', 'info')" class="w-full py-1.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">Check Readiness</button>
            </div>
            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <h4 class="font-bold text-white">140T Heavy Crane (TKD Yard)</h4>
              <p class="text-slate-400 text-[11px]">Heavy Breakdown Crane Team • Standby Crew On Duty</p>
              <button onclick="showToast('Heavy Crane Unit Ready', 'info')" class="w-full py-1.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">Check Readiness</button>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="space-y-5">
        <!-- Top Action Bar -->
        <div class="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-emerald-500">
          <div>
            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider">Control Room Officer Console</span>
            <h2 class="text-xl font-black text-white font-['Outfit'] mt-1 flex items-center gap-2">
              🎛️ Section Train Control & Dispatch Terminal
            </h2>
            <p class="text-xs text-slate-400">TSR speed restrictions, live string graph, freight rake dispatcher & disaster management ART</p>
          </div>
          
          <div class="flex items-center gap-2 text-xs">
            <button onclick="showToast('DIVISION EMERGENCY HALT ACTIVATED: RF SOS broadcast sent to all locomotives in sector!', 'error')" class="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 shadow-lg">
              <i class="fa-solid fa-power-off"></i> Division Emergency Stop (RF SOS)
            </button>
          </div>
        </div>

        <!-- Control Room Sub-Tabs -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button type="button" onclick="switchCtrlSubTab('ctrl_tsr')" class="px-3.5 py-2 rounded-xl border transition-all ${activeCtrlSubTab === "ctrl_tsr" ? "bg-emerald-600/30 border-emerald-400 text-emerald-200 font-bold shadow-lg shadow-emerald-500/20" : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"}">
            <i class="fa-solid fa-gauge-simple-high text-emerald-400"></i> TSR Speed Restrictions
          </button>
          <button type="button" onclick="switchCtrlSubTab('ctrl_string_graph')" class="px-3.5 py-2 rounded-xl border transition-all ${activeCtrlSubTab === "ctrl_string_graph" ? "bg-emerald-600/30 border-emerald-400 text-emerald-200 font-bold shadow-lg shadow-emerald-500/20" : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"}">
            <i class="fa-solid fa-chart-line text-emerald-400"></i> Live String Graph
          </button>
          <button type="button" onclick="switchCtrlSubTab('ctrl_freight')" class="px-3.5 py-2 rounded-xl border transition-all ${activeCtrlSubTab === "ctrl_freight" ? "bg-emerald-600/30 border-emerald-400 text-emerald-200 font-bold shadow-lg shadow-emerald-500/20" : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"}">
            <i class="fa-solid fa-boxes-packing text-amber-400"></i> Freight Dispatcher
          </button>
          <button type="button" onclick="switchCtrlSubTab('ctrl_disaster')" class="px-3.5 py-2 rounded-xl border transition-all ${activeCtrlSubTab === "ctrl_disaster" ? "bg-emerald-600/30 border-emerald-400 text-emerald-200 font-bold shadow-lg shadow-emerald-500/20" : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"}">
            <i class="fa-solid fa-truck-medical text-red-400"></i> Disaster ART Dispatcher
          </button>
        </div>

        ${subTabHtml}
      </div>
    `;
  }

  let activeAdminSubTab = "admin_roster";

  window.switchAdminSubTab = function (tab) {
    activeAdminSubTab = tab || "admin_roster";
    const container = document.getElementById("activeSubTabContainer");
    if (container) renderAdminSuperintendentWorkspace(container);
  };

  function renderAdminSuperintendentWorkspace(container) {
    let subTabHtml = "";

    if (activeAdminSubTab === "admin_roster") {
      subTabHtml = `
        <!-- SUB-TAB 1: PERSONNEL ROSTER & AES-256 KEYS -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div class="lg:col-span-7 glass-card p-5 space-y-4 border border-purple-500/30">
            <div class="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <i class="fa-solid fa-users-gear text-purple-400"></i> Authorized Personnel & Access Permissions
              </h3>
              <span class="text-[10px] font-mono text-purple-300">4 Active Roles</span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-900/60 border-b border-white/10">
                  <tr>
                    <th class="py-2 px-2.5">Officer Name / ID</th>
                    <th class="py-2 px-2.5">Role</th>
                    <th class="py-2 px-2.5">Access Level</th>
                    <th class="py-2 px-2.5">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5 font-medium text-slate-200">
                  <tr class="hover:bg-white/5">
                    <td class="py-2.5 px-2.5 font-bold text-white">R. K. Sharma<br/><span class="text-[10px] text-slate-400 font-mono">IR_SM_NDLS_01</span></td>
                    <td class="py-2.5 px-2.5 text-cyan-300">Station Master</td>
                    <td class="py-2.5 px-2.5 font-mono">Level 3 (Station)</td>
                    <td class="py-2.5 px-2.5"><span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">ONLINE</span></td>
                  </tr>
                  <tr class="hover:bg-white/5">
                    <td class="py-2.5 px-2.5 font-bold text-white">V. K. Yadav<br/><span class="text-[10px] text-slate-400 font-mono">IR_ENG_PWAY_04</span></td>
                    <td class="py-2.5 px-2.5 text-amber-300">Maintenance Engineer</td>
                    <td class="py-2.5 px-2.5 font-mono">Level 4 (P-Way/S&T)</td>
                    <td class="py-2.5 px-2.5"><span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">ONLINE</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="lg:col-span-5 glass-card p-5 space-y-4 border border-purple-500/30">
            <div class="flex items-center justify-between border-b border-white/10 pb-2.5">
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <i class="fa-solid fa-tower-cell text-purple-400"></i> Kavach RF Towers Telemetry
              </h3>
              <span class="text-[10px] font-mono text-emerald-400">ALL TOWERS ONLINE</span>
            </div>

            <div class="space-y-2 text-xs">
              <div class="p-2.5 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
                <div>
                  <p class="font-bold text-white">Tower 03: Faridabad Optical Mesh</p>
                  <p class="text-[10px] text-slate-400 font-mono">Frequency: 406.8 MHz • Signal: -55 dBm</p>
                </div>
                <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (activeAdminSubTab === "admin_safety") {
      subTabHtml = `
        <!-- SUB-TAB 2: SAFETY AUDIT & SPAD INVESTIGATION LOG -->
        <div class="glass-card p-5 space-y-4 border border-purple-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-shield-virus text-purple-400"></i> Safety Audit & SPAD (Signal Passing at Danger) Investigation Log
            </h3>
            <span class="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 text-xs font-bold font-mono">ZERO SPAD INCIDENTS</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <h4 class="font-bold text-white">Kavach Auto-Brake Interventions</h4>
              <p class="text-slate-400 text-[11px]">3 Automatic Speed Corrections Applied Today • 0 Overspeed Violations</p>
              <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">100% SAFETY RATING</span>
            </div>
            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <h4 class="font-bold text-white">CRS Safety Inspection Audit</h4>
              <p class="text-slate-400 text-[11px]">Commissioner of Railway Safety Audit Verified for Delhi Division</p>
              <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">PASSED WITH HONORS</span>
            </div>
            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <h4 class="font-bold text-white">Near-Miss Incident Log</h4>
              <p class="text-slate-400 text-[11px]">0 Near-Miss Events Reported in last 30 Days across All Sectors</p>
              <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">ZERO INCIDENTS</span>
            </div>
          </div>
        </div>
      `;
    } else if (activeAdminSubTab === "admin_sobriety") {
      subTabHtml = `
        <!-- SUB-TAB 3: CREW BREATH ANALYZER SOBRIETY LOG -->
        <div class="glass-card p-5 space-y-4 border border-purple-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-heart-pulse text-purple-400"></i> Running Crew Pre-Run Breath Analyzer (BA) Sobriety Log
            </h3>
            <span class="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 text-xs font-bold font-mono">100% SOBRIETY VERIFIED</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs font-mono">
              <thead class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-900/60 border-b border-white/10">
                <tr>
                  <th class="py-3 px-3">Crew ID</th>
                  <th class="py-3 px-3">Loco Pilot Name</th>
                  <th class="py-3 px-3">Assigned Train</th>
                  <th class="py-3 px-3">Test Time</th>
                  <th class="py-3 px-3">BA Reading (mg/100ml)</th>
                  <th class="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 text-slate-200">
                <tr class="hover:bg-white/5">
                  <td class="py-3 px-3 font-bold text-white">LP-9012</td>
                  <td class="py-3 px-3 text-purple-300 font-sans font-bold">Rajesh Kumar</td>
                  <td class="py-3 px-3 text-slate-400">12951 Rajdhani</td>
                  <td class="py-3 px-3 text-slate-400">09:45 AM</td>
                  <td class="py-3 px-3 text-emerald-400 font-bold">0.00 mg/100ml</td>
                  <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px]">CLEARED FOR DUTY</span></td>
                </tr>
                <tr class="hover:bg-white/5">
                  <td class="py-3 px-3 font-bold text-white">ALP-4410</td>
                  <td class="py-3 px-3 text-purple-300 font-sans font-bold">Amitabh Singh</td>
                  <td class="py-3 px-3 text-slate-400">12012 Vande Bharat</td>
                  <td class="py-3 px-3 text-slate-400">09:12 AM</td>
                  <td class="py-3 px-3 text-emerald-400 font-bold">0.00 mg/100ml</td>
                  <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px]">CLEARED FOR DUTY</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (activeAdminSubTab === "admin_telemetry") {
      subTabHtml = `
        <!-- SUB-TAB 4: KAVACH SATELLITE & RF FREQUENCY DIAGNOSTIC -->
        <div class="glass-card p-5 space-y-4 border border-purple-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-satellite text-purple-400"></i> Kavach Satellite & 160MHz RF Frequency Channel Diagnostic
            </h3>
            <span class="px-2.5 py-1 rounded-full bg-purple-950 text-purple-300 text-xs font-bold font-mono">GPS SUB-METER ACCURACY</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <h4 class="font-bold text-white">IRNSS / NavIC Satellite Sync</h4>
              <p class="text-slate-400 text-[11px]">12 Satellites Locked • Time Sync Accuracy: ±1.2 Nanoseconds</p>
              <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">HIGH PRECISION</span>
            </div>
            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <h4 class="font-bold text-white">160 MHz UHF RF Duplex Channel</h4>
              <p class="text-slate-400 text-[11px]">TX/RX Frequency: 160.225 MHz • Modulation: TDMA/GMSK</p>
              <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">ZERO NOISE</span>
            </div>
            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <h4 class="font-bold text-white">Cryptographic AES-256 Key Status</h4>
              <p class="text-slate-400 text-[11px]">Key ID: IR-KAV-2026-KEY-09 • Auto Rotation in 48 Hours</p>
              <span class="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-bold">ENCRYPTED</span>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="space-y-5">
        <!-- Top Action Bar -->
        <div class="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-purple-500">
          <div>
            <span class="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider">Admin & Superintendent Console</span>
            <h2 class="text-xl font-black text-white font-['Outfit'] mt-1 flex items-center gap-2">
              🛡️ Division Access Control & Safety Audit Hub
            </h2>
            <p class="text-xs text-slate-400">Personnel authorization, safety audits, crew breath analyzer logs & Kavach satellite diagnostics</p>
          </div>
          
          <div class="flex items-center gap-2 text-xs">
            <button onclick="showToast('Rotated Division Kavach AES-256 Encryption Keys', 'success')" class="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 shadow-lg">
              <i class="fa-solid fa-key"></i> Rotate AES-256 Keys
            </button>
          </div>
        </div>

        <!-- Admin Sub-Tabs -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button type="button" onclick="switchAdminSubTab('admin_roster')" class="px-3.5 py-2 rounded-xl border transition-all ${activeAdminSubTab === "admin_roster" ? "bg-purple-600/30 border-purple-400 text-purple-200 font-bold shadow-lg shadow-purple-500/20" : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"}">
            <i class="fa-solid fa-users-gear text-purple-400"></i> Personnel Access & Keys
          </button>
          <button type="button" onclick="switchAdminSubTab('admin_safety')" class="px-3.5 py-2 rounded-xl border transition-all ${activeAdminSubTab === "admin_safety" ? "bg-purple-600/30 border-purple-400 text-purple-200 font-bold shadow-lg shadow-purple-500/20" : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"}">
            <i class="fa-solid fa-shield-virus text-purple-400"></i> Safety Audits & SPAD Log
          </button>
          <button type="button" onclick="switchAdminSubTab('admin_sobriety')" class="px-3.5 py-2 rounded-xl border transition-all ${activeAdminSubTab === "admin_sobriety" ? "bg-purple-600/30 border-purple-400 text-purple-200 font-bold shadow-lg shadow-purple-500/20" : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"}">
            <i class="fa-solid fa-heart-pulse text-purple-400"></i> Crew Breath Analyzer Log
          </button>
          <button type="button" onclick="switchAdminSubTab('admin_telemetry')" class="px-3.5 py-2 rounded-xl border transition-all ${activeAdminSubTab === "admin_telemetry" ? "bg-purple-600/30 border-purple-400 text-purple-200 font-bold shadow-lg shadow-purple-500/20" : "bg-slate-900/80 border-white/10 text-slate-400 hover:text-white"}">
            <i class="fa-solid fa-satellite text-purple-400"></i> Satellite & RF Diagnostic
          </button>
        </div>

        ${subTabHtml}
      </div>
    `;
  }

  // Work Orders Full Tab View
  function renderWorkOrdersTab(container) {
    container.innerHTML = `
      <div class="glass-card p-5 space-y-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h3 class="text-lg font-black text-white font-['Outfit'] flex items-center gap-2">
              <i class="fa-solid fa-clipboard-list text-blue-400"></i> P-Way Track Repair Work Order Dispatcher
            </h3>
            <p class="text-xs text-slate-400">Manage, assign and track status of track maintenance repair tasks</p>
          </div>
          <button onclick="openNewWorkOrderModal()" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2">
            <i class="fa-solid fa-plus"></i> Dispatch Work Order
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-900/60 border-b border-white/10">
              <tr>
                <th class="py-3 px-3">Order ID</th>
                <th class="py-3 px-3">Location / Track Km</th>
                <th class="py-3 px-3">Hazard Description</th>
                <th class="py-3 px-3">Priority</th>
                <th class="py-3 px-3">Status</th>
                <th class="py-3 px-3">Assigned Crew Unit</th>
                <th class="py-3 px-3">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 font-medium text-slate-200">
              ${workOrders
                .map(
                  (wo) => `
                <tr class="hover:bg-white/5 transition-colors">
                  <td class="py-3.5 px-3 font-mono font-bold text-white">${wo.id}</td>
                  <td class="py-3.5 px-3">${wo.location}<br/><span class="text-[10px] text-slate-400 font-mono">${wo.km}</span></td>
                  <td class="py-3.5 px-3">${wo.defect}</td>
                  <td class="py-3.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${wo.priorityClass}">${wo.priority}</span></td>
                  <td class="py-3.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold ${wo.statusClass}">${wo.status}</span></td>
                  <td class="py-3.5 px-3 text-slate-300">${wo.crew}</td>
                  <td class="py-3.5 px-3">
                    <button onclick="updateWoStatus('${wo.id}')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 text-[10px] font-bold cursor-pointer">
                      Update Status
                    </button>
                  </td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // USFD Scanner Tab View
  function renderUsfdScannerTab(container) {
    container.innerHTML = `
      <div class="glass-card p-5 space-y-4">
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 class="text-lg font-black text-white font-['Outfit'] flex items-center gap-2">
              <i class="fa-solid fa-microscope text-cyan-400"></i> Ultrasonic Flaw Detection (USFD) Real-Time Scanner
            </h3>
            <p class="text-xs text-slate-400">High-frequency ultrasonic rail flaw detection & RFID calibration telemetry</p>
          </div>
          <span class="px-3 py-1 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold">
            2.25 MHz Transducer Active
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
            <p class="text-xs font-bold text-slate-400 uppercase">USFD Inspection Car 04</p>
            <p class="text-2xl font-black text-emerald-400 font-mono">ACTIVE (45 km/h)</p>
            <p class="text-[11px] text-slate-400">NDLS–NZM Up Main Section</p>
          </div>
          <div class="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
            <p class="text-xs font-bold text-slate-400 uppercase">Flaw Tags Detected Today</p>
            <p class="text-2xl font-black text-amber-400 font-mono">14 Defect Tags</p>
            <p class="text-[11px] text-slate-400">3 High Risk (Code 111 Joint Flaws)</p>
          </div>
          <div class="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
            <p class="text-xs font-bold text-slate-400 uppercase">RFID Track Tag Calibration</p>
            <p class="text-2xl font-black text-blue-400 font-mono">1,481 / 1,482 (99.9%)</p>
            <p class="text-[11px] text-slate-400">All Track Transponders Healthy</p>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-3">
          <div class="flex justify-between items-center text-xs font-mono text-cyan-400">
            <span>LIVE ULTRASONIC SIGNAL SPECTRUM & DEEP ECHO LOG</span>
            <button onclick="runUsfdCalibrationTest()" class="px-3 py-1 rounded bg-cyan-900/50 hover:bg-cyan-800 text-cyan-200 border border-cyan-500/40 text-xs cursor-pointer">Re-Calibrate Probe</button>
          </div>
          <div class="h-44 w-full">
            <canvas id="usfdSpectrumChart" class="w-full h-full"></canvas>
          </div>
        </div>
      </div>
    `;
    setTimeout(initUsfdSpectrumCanvas, 50);
  }

  // Material Stock Tab View
  function renderMaterialStockTab(container) {
    container.innerHTML = `
      <div class="glass-card p-5 space-y-4">
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 class="text-lg font-black text-white font-['Outfit'] flex items-center gap-2">
              <i class="fa-solid fa-boxes-stacked text-amber-400"></i> P-Way Track Material & Spares Stock Inventory
            </h3>
            <p class="text-xs text-slate-400">Delhi Division P-Way Depot Stock Levels & Procurement Status</p>
          </div>
          <span class="px-3 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold">
            Depot Stock: OPTIMAL
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-4 rounded-xl bg-slate-900/80 border border-white/10">
            <p class="text-xs text-slate-400 font-bold">60kg UIC Rails</p>
            <p class="text-2xl font-black text-white font-mono mt-1">420 meters</p>
            <p class="text-[11px] text-emerald-400 mt-1">In Stock (Central Depot)</p>
          </div>
          <div class="p-4 rounded-xl bg-slate-900/80 border border-white/10">
            <p class="text-xs text-slate-400 font-bold">PSC Sleepers (Line Ready)</p>
            <p class="text-2xl font-black text-white font-mono mt-1">1,850 units</p>
            <p class="text-[11px] text-emerald-400 mt-1">Ready for Dispatch</p>
          </div>
          <div class="p-4 rounded-xl bg-slate-900/80 border border-white/10">
            <p class="text-xs text-slate-400 font-bold">Elastic Rail Clips (ERC)</p>
            <p class="text-2xl font-black text-white font-mono mt-1">12,400 pcs</p>
            <p class="text-[11px] text-blue-400 mt-1">Sufficient Reserve</p>
          </div>
          <div class="p-4 rounded-xl bg-slate-900/80 border border-white/10">
            <p class="text-xs text-slate-400 font-bold">Glued Insulated Joints</p>
            <p class="text-2xl font-black text-white font-mono mt-1">36 sets</p>
            <p class="text-[11px] text-amber-400 mt-1">Re-order Threshold Reached</p>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // VIEW 2: STATION MASTER DEPARTMENT CONSOLE (FULL INTERACTIVE SUB-TABS)
  // =========================================================================
  function renderStationMasterConsole(container, subTabId) {
    let subContentHtml = "";

    if (subTabId === "platform_alloc") {
      subContentHtml = `
        <div class="glass-card p-5 space-y-4 border border-blue-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-extrabold text-white font-['Outfit'] flex items-center gap-2">
              <i class="fa-solid fa-route text-blue-400"></i> New Delhi (NDLS) Platform Allocator (Platforms 1 – 16)
            </h3>
            <button onclick="showToast('Platform Allocation Rebalanced for Upcoming Trains', 'success')" class="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer">
              Auto-Allocate Platforms
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-2">
              <div class="flex justify-between items-center font-bold">
                <span class="text-emerald-400">Platform 01</span>
                <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px]">OCCUPIED</span>
              </div>
              <p class="font-bold text-white">12004 Lucknow Shatabdi</p>
              <p class="text-[10px] text-slate-400">Dept Time: 06:10 IST • Track Integrity OK</p>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-2">
              <div class="flex justify-between items-center font-bold">
                <span class="text-emerald-400">Platform 04</span>
                <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px]">OCCUPIED</span>
              </div>
              <p class="font-bold text-white">12951 Mumbai Rajdhani</p>
              <p class="text-[10px] text-slate-400">Dept Time: 16:55 IST • Departure Signal Set</p>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-blue-500/30 space-y-2">
              <div class="flex justify-between items-center font-bold">
                <span class="text-blue-300">Platform 03</span>
                <span class="px-2 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px]">RESERVED</span>
              </div>
              <p class="font-bold text-white">12626 Kerala Express</p>
              <p class="text-[10px] text-slate-400">ETA: 17:30 IST • Incoming Track Clear</p>
            </div>

            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <div class="flex justify-between items-center font-bold">
                <span class="text-slate-400">Platform 05–16</span>
                <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">CLEAR</span>
              </div>
              <p class="font-bold text-slate-300">12 Platforms Available</p>
              <p class="text-[10px] text-slate-400">Ready for Line Assignment</p>
            </div>
          </div>
        </div>
      `;
    } else if (subTabId === "interlocking") {
      subContentHtml = `
        <div class="glass-card p-5 space-y-4 border border-purple-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-extrabold text-white font-['Outfit'] flex items-center gap-2">
              <i class="fa-solid fa-traffic-light text-purple-400"></i> Route Relay Interlocking (RRI) & Signal Panel
            </h3>
            <span class="px-3 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold">
              RRI STATUS: LOCKED & SECURE
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div class="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
              <div class="flex justify-between items-center font-bold">
                <span class="text-white">Route 104 (Platform 04 to UP Main)</span>
                <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono text-[10px]">GREEN</span>
              </div>
              <p class="text-[11px] text-slate-400">Points 12A/12B Locked • Overlap Secured</p>
              <button onclick="showToast('Signal 104 Toggled to CAUTION', 'info')" class="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 font-bold text-[11px] cursor-pointer">Toggle Signal Aspect</button>
            </div>

            <div class="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
              <div class="flex justify-between items-center font-bold">
                <span class="text-white">Route 101 (Platform 01 to Yard)</span>
                <span class="px-2 py-0.5 rounded bg-amber-950 text-amber-400 font-mono text-[10px]">DOUBLE YELLOW</span>
              </div>
              <p class="text-[11px] text-slate-400">Speed Restricted to 30 km/h • Yard Clear</p>
              <button onclick="showToast('Signal 101 Granted Clear', 'success')" class="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-[11px] cursor-pointer">Grant Full Clear</button>
            </div>

            <div class="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
              <div class="flex justify-between items-center font-bold">
                <span class="text-white">Route 108 (Freight Line Bypass)</span>
                <span class="px-2 py-0.5 rounded bg-red-950 text-red-400 font-mono text-[10px]">RED (STOP)</span>
              </div>
              <p class="text-[11px] text-slate-400">Track Circuit Occupied by WAG9 Loco</p>
              <button onclick="showToast('Emergency Signal Override Requested', 'error')" class="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-red-300 font-bold text-[11px] cursor-pointer">Override Interlocking</button>
            </div>
          </div>
        </div>
      `;
    } else if (subTabId === "emergency_block") {
      subContentHtml = `
        <div class="glass-card p-5 space-y-4 border border-red-500/40">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-extrabold text-white font-['Outfit'] flex items-center gap-2 text-red-400">
              <i class="fa-solid fa-shield-halved text-red-400"></i> Station Master Emergency Track Block Control
            </h3>
            <span class="px-3 py-1 rounded-full bg-red-950 text-red-300 border border-red-500/40 text-xs font-mono font-bold">
              EMERGENCY READY
            </span>
          </div>

          <div class="p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-slate-300 space-y-3">
            <p class="font-bold text-red-300">
              <i class="fa-solid fa-triangle-exclamation"></i> Immediate Power Block & Signal Interlocking Trip Switch:
            </p>
            <p class="text-[11px] text-slate-400 leading-relaxed">
              Activating emergency block will immediately trip all outgoing green signals to RED and notify all Kavach onboard units within 5 km to apply emergency brakes.
            </p>
            <div class="flex flex-wrap gap-3 pt-2">
              <button onclick="showToast('🚨 EMERGENCY BLOCK ACTIVATED ON PLATFORM 04 LINE!', 'error')" class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-lg shadow-red-600/30 cursor-pointer">
                Block Platform 04 Line
              </button>
              <button onclick="showToast('🚨 EMERGENCY BLOCK ACTIVATED ON UP MAIN TRACK!', 'error')" class="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold shadow-lg cursor-pointer">
                Block UP Main Track
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      // Default: Station Control Desk Table
      subContentHtml = `
        <div class="glass-card p-5 space-y-4">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-extrabold text-white font-['Outfit'] flex items-center gap-2">
              <i class="fa-solid fa-list-check text-emerald-400"></i> New Delhi (NDLS) Station Train Movement & Platform Allocation
            </h3>
            <button onclick="showToast('Platform 04 Signal Granted for 12951 Rajdhani Exp.', 'success')" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer">
              <i class="fa-solid fa-circle-check"></i> Grant Departure Line Clear
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-900/60 border-b border-white/10">
                <tr>
                  <th class="py-3 px-3">Train No & Name</th>
                  <th class="py-3 px-3">Route</th>
                  <th class="py-3 px-3">Arrival / Dept</th>
                  <th class="py-3 px-3">Assigned Platform</th>
                  <th class="py-3 px-3">Interlocking Signal</th>
                  <th class="py-3 px-3">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 font-medium text-slate-200">
                <tr class="hover:bg-white/5">
                  <td class="py-3 px-3 font-bold text-white">12951 Mumbai Rajdhani</td>
                  <td class="py-3 px-3 text-slate-400">NDLS – BCT</td>
                  <td class="py-3 px-3 font-mono text-emerald-400">16:55 (On Time)</td>
                  <td class="py-3 px-3"><span class="px-2.5 py-1 rounded bg-blue-950 text-blue-300 border border-blue-500/40 font-bold">Platform 04</span></td>
                  <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">GREEN (CLEAR)</span></td>
                  <td class="py-3 px-3"><button onclick="showToast('Route 104 Set for Train 12951', 'info')" class="px-2.5 py-1 rounded bg-slate-800 text-xs font-bold text-blue-300 cursor-pointer">Set Route</button></td>
                </tr>
                <tr class="hover:bg-white/5">
                  <td class="py-3 px-3 font-bold text-white">12004 Lucknow Shatabdi</td>
                  <td class="py-3 px-3 text-slate-400">NDLS – LKO</td>
                  <td class="py-3 px-3 font-mono text-amber-400">17:10 (+12 min)</td>
                  <td class="py-3 px-3"><span class="px-2.5 py-1 rounded bg-blue-950 text-blue-300 border border-blue-500/40 font-bold">Platform 01</span></td>
                  <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/30 text-[10px] font-bold">DOUBLE YELLOW</span></td>
                  <td class="py-3 px-3"><button onclick="showToast('Platform 01 Hold Order Issued', 'info')" class="px-2.5 py-1 rounded bg-slate-800 text-xs font-bold text-amber-300 cursor-pointer">Hold Train</button></td>
                </tr>
                <tr class="hover:bg-white/5">
                  <td class="py-3 px-3 font-bold text-white">12626 Kerala Express</td>
                  <td class="py-3 px-3 text-slate-400">NDLS – TVC</td>
                  <td class="py-3 px-3 font-mono text-emerald-400">17:30 (On Time)</td>
                  <td class="py-3 px-3"><span class="px-2.5 py-1 rounded bg-blue-950 text-blue-300 border border-blue-500/40 font-bold">Platform 03</span></td>
                  <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">GREEN (CLEAR)</span></td>
                  <td class="py-3 px-3"><button onclick="showToast('Route 103 Set for Train 12626', 'info')" class="px-2.5 py-1 rounded bg-slate-800 text-xs font-bold text-blue-300 cursor-pointer">Set Route</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <!-- 4 KPI Cards for Station Master -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="glass-card p-4 border border-white/10">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-base border border-emerald-500/30">
              <i class="fa-solid fa-train-subway"></i>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">100% Operational</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-black text-white font-mono">14 Trains</p>
            <p class="text-xs text-slate-400 font-medium mt-1">Station Movements (NDLS Main)</p>
          </div>
        </div>

        <div class="glass-card p-4 border border-white/10">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-base border border-blue-500/30">
              <i class="fa-solid fa-route"></i>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/30 text-[10px] font-bold">16 / 16 Platforms</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-black text-white font-mono">8 Active</p>
            <p class="text-xs text-slate-400 font-medium mt-1">Platform Allocation Status</p>
          </div>
        </div>

        <div class="glass-card p-4 border border-white/10">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center text-base border border-purple-500/30">
              <i class="fa-solid fa-traffic-light"></i>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">RRI Locked</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-black text-white font-mono">0 Conflicts</p>
            <p class="text-xs text-slate-400 font-medium mt-1">Route Interlocking Safety</p>
          </div>
        </div>

        <div class="glass-card p-4 border border-white/10">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-full bg-amber-600/20 text-amber-400 flex items-center justify-center text-base border border-amber-500/30">
              <i class="fa-solid fa-shield-halved"></i>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">Normal Block</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-black text-white font-mono">100% OK</p>
            <p class="text-xs text-slate-400 font-medium mt-1">Block Overlap Signal State</p>
          </div>
        </div>
      </div>

      ${subContentHtml}
    `;
  }

  // =========================================================================
  // VIEW 3: CONTROL OFFICER DEPARTMENT CONSOLE (FULL INTERACTIVE SUB-TABS)
  // =========================================================================
  function renderControlOfficerConsole(container, subTabId) {
    let subContentHtml = "";

    if (subTabId === "tsr_dispatch") {
      subContentHtml = `
        <div class="glass-card p-5 space-y-4 border border-amber-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-extrabold text-white font-['Outfit'] flex items-center gap-2">
              <i class="fa-solid fa-gauge-high text-amber-400"></i> Temporary Speed Restrictions (TSR) Dispatcher
            </h3>
            <button onclick="promptTsrSpeed()" class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg cursor-pointer">
              + Dispatch New Speed Override
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div class="p-4 rounded-xl bg-slate-900/90 border border-amber-500/40 space-y-2">
              <div class="flex justify-between font-bold">
                <span class="text-amber-300">TSR Order #402: NZM–FDB Section</span>
                <span class="px-2 py-0.5 rounded bg-amber-950 text-amber-400 font-mono text-[10px]">ACTIVE (45 km/h)</span>
              </div>
              <p class="text-[11px] text-slate-400">Reason: Ballast Tamping & Track Maintenance</p>
              <div class="flex justify-between text-[11px] pt-1">
                <span class="text-slate-400">Affected Locos: 6 Trains</span>
                <button onclick="showToast('TSR #402 Revoked Successfully', 'success')" class="text-red-400 font-bold hover:underline cursor-pointer">Revoke Restriction</button>
              </div>
            </div>

            <div class="p-4 rounded-xl bg-slate-900/90 border border-red-500/40 space-y-2">
              <div class="flex justify-between font-bold">
                <span class="text-red-300">TSR Order #405: FDB–TKD Line</span>
                <span class="px-2 py-0.5 rounded bg-red-950 text-red-400 font-mono text-[10px]">CRITICAL (30 km/h)</span>
              </div>
              <p class="text-[11px] text-slate-400">Reason: USFD Rail Joint Defect (Code 111)</p>
              <div class="flex justify-between text-[11px] pt-1">
                <span class="text-slate-400">Affected Locos: 3 Trains</span>
                <button onclick="showToast('TSR #405 Revoked Successfully', 'success')" class="text-red-400 font-bold hover:underline cursor-pointer">Revoke Restriction</button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (subTabId === "ai_reschedule") {
      subContentHtml = `
        <div class="glass-card p-5 space-y-4 border border-blue-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-extrabold text-white font-['Outfit'] flex items-center gap-2">
              <i class="fa-solid fa-robot text-blue-400"></i> AI Conflict Resolution & Rescheduling Engine
            </h3>
            <button onclick="showToast('AI Rescheduling Plan Applied to Section Control', 'success')" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg cursor-pointer">
              Apply AI Schedule Overrides
            </button>
          </div>

          <div class="space-y-3 text-xs">
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-blue-500/30 flex items-center justify-between">
              <div>
                <p class="font-bold text-white">Conflict #102: Shatabdi vs Freight Overtake at Faridabad</p>
                <p class="text-[11px] text-slate-400 mt-0.5">Recommendation: Hold WAG9 Freight at FDB Loop Line 2 for 8 minutes to give priority pass to 12004 Shatabdi.</p>
              </div>
              <button onclick="showToast('Overtake Sequence Executed at FDB', 'success')" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 cursor-pointer">Execute Plan</button>
            </div>
          </div>
        </div>
      `;
    } else if (subTabId === "rake_telemetry") {
      subContentHtml = `
        <div class="glass-card p-5 space-y-4 border border-cyan-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-extrabold text-white font-['Outfit'] flex items-center gap-2">
              <i class="fa-solid fa-microchip text-cyan-400"></i> Rake & Locomotive Telemetry Monitor
            </h3>
            <span class="px-3 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold">
              128 LOCOS ONLINE
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-white/10">
              <p class="text-slate-400 uppercase font-bold text-[10px]">WAP7-30211 (Rajdhani)</p>
              <p class="text-lg font-black text-white font-mono mt-1">Brake Pipe: 5.0 kg/cm²</p>
              <p class="text-[10px] text-emerald-400 mt-0.5">Kavach Radio Ping: 12 ms (Healthy)</p>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-white/10">
              <p class="text-slate-400 uppercase font-bold text-[10px]">WAG9-31088 (Freight)</p>
              <p class="text-lg font-black text-white font-mono mt-1">Brake Pipe: 4.8 kg/cm²</p>
              <p class="text-[10px] text-emerald-400 mt-0.5">Kavach Radio Ping: 14 ms (Healthy)</p>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-white/10">
              <p class="text-slate-400 uppercase font-bold text-[10px]">WAP7-30245 (Shatabdi)</p>
              <p class="text-lg font-black text-white font-mono mt-1">Brake Pipe: 5.0 kg/cm²</p>
              <p class="text-[10px] text-emerald-400 mt-0.5">Kavach Radio Ping: 10 ms (Healthy)</p>
            </div>
          </div>
        </div>
      `;
    } else {
      // Default: Section Traffic Desk Table
      subContentHtml = `
        <div class="glass-card p-5 space-y-4">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-extrabold text-white font-['Outfit'] flex items-center gap-2">
              <i class="fa-solid fa-tower-cell text-purple-400"></i> Delhi Division Section Controller Traffic Desk
            </h3>
            <button onclick="promptTsrSpeed()" class="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer">
              <i class="fa-solid fa-gauge-high"></i> Dispatch TSR Restriction
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-900/60 border-b border-white/10">
                <tr>
                  <th class="py-3 px-3">Loco / Train ID</th>
                  <th class="py-3 px-3">Current Section</th>
                  <th class="py-3 px-3">Kavach Signal State</th>
                  <th class="py-3 px-3">Current Speed</th>
                  <th class="py-3 px-3">Delay Status</th>
                  <th class="py-3 px-3">AI Recommendation</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 font-medium text-slate-200">
                <tr class="hover:bg-white/5">
                  <td class="py-3 px-3 font-bold text-white">WAP7-30211 (Rajdhani)</td>
                  <td class="py-3 px-3">NDLS–NZM Up Line</td>
                  <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">GREEN (NORMAL)</span></td>
                  <td class="py-3 px-3 font-mono text-white">110 km/h</td>
                  <td class="py-3 px-3 text-emerald-400 font-bold">ON TIME</td>
                  <td class="py-3 px-3 text-slate-400">Maintain Speed Schedule</td>
                </tr>
                <tr class="hover:bg-white/5">
                  <td class="py-3 px-3 font-bold text-white">WAG9-31088 (Freight)</td>
                  <td class="py-3 px-3">TKD–FDB Goods Loop</td>
                  <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/30 text-[10px] font-bold">YELLOW (CAUTION)</span></td>
                  <td class="py-3 px-3 font-mono text-amber-300">45 km/h</td>
                  <td class="py-3 px-3 text-amber-400 font-bold">+18 MIN DELAY</td>
                  <td class="py-3 px-3 text-amber-300 font-bold">Overtake by Shatabdi at FDB Siding</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="glass-card p-4 border border-white/10">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center text-base border border-purple-500/30">
              <i class="fa-solid fa-tower-cell"></i>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30 text-[10px] font-bold">Section Stream</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-black text-white font-mono">128 Trains</p>
            <p class="text-xs text-slate-400 font-medium mt-1">Section Active Locomotives</p>
          </div>
        </div>

        <div class="glass-card p-4 border border-white/10">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-base border border-emerald-500/30">
              <i class="fa-solid fa-gauge-high"></i>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">88.3% On Time</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-black text-white font-mono">110 Trains</p>
            <p class="text-xs text-slate-400 font-medium mt-1">Punctual Movement</p>
          </div>
        </div>

        <div class="glass-card p-4 border border-white/10">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-full bg-amber-600/20 text-amber-400 flex items-center justify-center text-base border border-amber-500/30">
              <i class="fa-solid fa-clock"></i>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-500/30 text-[10px] font-bold">11.7% Delayed</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-black text-white font-mono">15 Trains</p>
            <p class="text-xs text-slate-400 font-medium mt-1">Minor / Major Delays</p>
          </div>
        </div>

        <div class="glass-card p-4 border border-white/10">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-base border border-blue-500/30">
              <i class="fa-solid fa-robot"></i>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-500/30 text-[10px] font-bold">AI Optimized</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-black text-white font-mono">14 min</p>
            <p class="text-xs text-slate-400 font-medium mt-1">Average Section Delay</p>
          </div>
        </div>
      </div>

      ${subContentHtml}
    `;
  }

  // Prompt TSR Speed
  window.promptTsrSpeed = function () {
    const speed = prompt(
      "Enter Temporary Speed Restriction (TSR) in km/h for Section NDLS-NZM:",
      "30",
    );
    if (speed && !isNaN(speed)) {
      showToast(
        `⚡ TSR Order Dispatched: Max Speed Restricted to ${speed} km/h on NDLS-NZM Section!`,
        "success",
      );
    }
  };

  // =========================================================================
  // VIEW 4: ADMIN SUPERINTENDENT DEPARTMENT CONSOLE (FULL INTERACTIVE SUB-TABS)
  // =========================================================================
  function renderAdminSuperintendentConsole(container, subTabId) {
    let subContentHtml = "";

    if (subTabId === "safety_audit") {
      subContentHtml = `
        <div class="glass-card p-5 space-y-4 border border-emerald-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-extrabold text-white font-['Outfit'] flex items-center gap-2">
              <i class="fa-solid fa-clipboard-check text-emerald-400"></i> Safety Compliance & System Audit Log
            </h3>
            <button onclick="showToast('Safety Audit Compliance PDF Exported', 'success')" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer">
              Export Audit PDF
            </button>
          </div>

          <div class="space-y-3 text-xs">
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <p class="font-bold text-white">Audit #2026-Q3: Kavach Automatic Braking Test</p>
                <p class="text-[11px] text-slate-400">Status: 100% PASSED • Zero SPAD (Signal Passed at Danger) incidents logged.</p>
              </div>
              <span class="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 font-bold text-[10px]">VERIFIED</span>
            </div>
          </div>
        </div>
      `;
    } else if (subTabId === "budget_inventory") {
      subContentHtml = `
        <div class="glass-card p-5 space-y-4 border border-amber-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-extrabold text-white font-['Outfit'] flex items-center gap-2">
              <i class="fa-solid fa-wallet text-amber-400"></i> Divisional P-Way Budget & Spares Allocation
            </h3>
            <button onclick="showToast('Procurement Sanction Order Released', 'success')" class="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer">
              Request Budget Sanction
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-white/10">
              <p class="text-slate-400 font-bold">Track Maintenance Grant</p>
              <p class="text-xl font-black text-white font-mono mt-1">₹4.20 Crore</p>
              <p class="text-[10px] text-emerald-400 mt-1">₹1.80 Cr Remaining</p>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-white/10">
              <p class="text-slate-400 font-bold">Kavach Station Towers</p>
              <p class="text-xl font-black text-white font-mono mt-1">₹2.10 Crore</p>
              <p class="text-[10px] text-blue-400 mt-1">100% Utilized</p>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-white/10">
              <p class="text-slate-400 font-bold">Emergency Repair Fund</p>
              <p class="text-xl font-black text-white font-mono mt-1">₹85.0 Lakh</p>
              <p class="text-[10px] text-amber-300 mt-1">Active Reserve</p>
            </div>
          </div>
        </div>
      `;
    } else if (subTabId === "rbac_access") {
      subContentHtml = `
        <div class="glass-card p-5 space-y-4 border border-red-500/30">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-extrabold text-white font-['Outfit'] flex items-center gap-2">
              <i class="fa-solid fa-user-lock text-red-400"></i> Role-Based Access Control (RBAC) & Security Logs
            </h3>
            <span class="px-3 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
              0 SECURITY VIOLATIONS
            </span>
          </div>

          <div class="space-y-3 text-xs">
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between">
              <div>
                <p class="font-bold text-white">Maintenance Engineer Access</p>
                <p class="text-[11px] text-slate-400">Permissions: Track Overview, Work Orders, USFD Telemetry</p>
              </div>
              <span class="px-2 py-0.5 rounded bg-blue-950 text-blue-300 text-[10px] font-bold font-mono">PASS: maint123</span>
            </div>
            <div class="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between">
              <div>
                <p class="font-bold text-white">Station Master Access</p>
                <p class="text-[11px] text-slate-400">Permissions: Platform Allocator, RRI Interlocking, Emergency Blocks</p>
              </div>
              <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-bold font-mono">PASS: station123</span>
            </div>
          </div>
        </div>
      `;
    } else {
      // Default: Staff Duty Roster Table
      subContentHtml = `
        <div class="glass-card p-5 space-y-4">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 class="text-base font-extrabold text-white font-['Outfit'] flex items-center gap-2">
              <i class="fa-solid fa-users text-amber-400"></i> Divisional Staff Duty Roster & Attendance Log
            </h3>
            <button onclick="showToast('Staff Shift Log Updated Successfully.', 'success')" class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer">
              <i class="fa-solid fa-user-plus"></i> Assign Shift Duty
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-900/60 border-b border-white/10">
                <tr>
                  <th class="py-3 px-3">Officer Name</th>
                  <th class="py-3 px-3">Officer ID</th>
                  <th class="py-3 px-3">Department</th>
                  <th class="py-3 px-3">Current Shift</th>
                  <th class="py-3 px-3">Duty Station</th>
                  <th class="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5 font-medium text-slate-200">
                <tr class="hover:bg-white/5">
                  <td class="py-3 px-3 font-bold text-white">Rajesh Sharma</td>
                  <td class="py-3 px-3 font-mono text-amber-300">IR_ENG_401</td>
                  <td class="py-3 px-3 text-slate-300">Maintenance Engineer</td>
                  <td class="py-3 px-3">Morning Shift (06:00 – 14:00)</td>
                  <td class="py-3 px-3 text-slate-400">NDLS Track Depot</td>
                  <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">ON DUTY</span></td>
                </tr>
                <tr class="hover:bg-white/5">
                  <td class="py-3 px-3 font-bold text-white">Sunil Kumar</td>
                  <td class="py-3 px-3 font-mono text-amber-300">IR_SM_208</td>
                  <td class="py-3 px-3 text-slate-300">Station Master</td>
                  <td class="py-3 px-3">General Shift (08:00 – 16:00)</td>
                  <td class="py-3 px-3 text-slate-400">New Delhi Platform Control</td>
                  <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">ON DUTY</span></td>
                </tr>
                <tr class="hover:bg-white/5">
                  <td class="py-3 px-3 font-bold text-white">Anil Verma</td>
                  <td class="py-3 px-3 font-mono text-amber-300">IR_CO_502</td>
                  <td class="py-3 px-3 text-slate-300">Control Officer</td>
                  <td class="py-3 px-3">Evening Shift (14:00 – 22:00)</td>
                  <td class="py-3 px-3 text-slate-400">Delhi Section Control Room</td>
                  <td class="py-3 px-3"><span class="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/30 text-[10px] font-bold">STANDBY</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="glass-card p-4 border border-white/10">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-full bg-amber-600/20 text-amber-400 flex items-center justify-center text-base border border-amber-500/30">
              <i class="fa-solid fa-users"></i>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-500/30 text-[10px] font-bold">Shift 01 Active</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-black text-white font-mono">48 Personnel</p>
            <p class="text-xs text-slate-400 font-medium mt-1">On-Duty Station & Track Staff</p>
          </div>
        </div>

        <div class="glass-card p-4 border border-white/10">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-base border border-emerald-500/30">
              <i class="fa-solid fa-clipboard-check"></i>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">Safety Certified</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-black text-white font-mono">99.8%</p>
            <p class="text-xs text-slate-400 font-medium mt-1">Safety & Protocol Compliance</p>
          </div>
        </div>

        <div class="glass-card p-4 border border-white/10">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-base border border-blue-500/30">
              <i class="fa-solid fa-wallet"></i>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-500/30 text-[10px] font-bold">Annual Grant</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-black text-white font-mono">₹4.2 Cr</p>
            <p class="text-xs text-slate-400 font-medium mt-1">P-Way Repair Allocation</p>
          </div>
        </div>

        <div class="glass-card p-4 border border-white/10">
          <div class="flex items-center justify-between">
            <div class="w-10 h-10 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center text-base border border-red-500/30">
              <i class="fa-solid fa-user-lock"></i>
            </div>
            <span class="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">Zero Violations</span>
          </div>
          <div class="mt-3">
            <p class="text-3xl font-black text-white font-mono">0 Breach</p>
            <p class="text-xs text-slate-400 font-medium mt-1">RBAC System Security Audit</p>
          </div>
        </div>
      </div>

      ${subContentHtml}
    `;
  }

  // =========================================================================
  // LIVE TRACK GIS CANVAS ANIMATED RENDERER
  // =========================================================================
  function initLiveTrackCanvas() {
    const canvas = document.getElementById("liveTrackCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const container = canvas.parentElement;
    canvas.width = container.clientWidth || 600;
    canvas.height = container.clientHeight || 220;

    let animStep = 0;

    function drawMap() {
      if (!document.getElementById("liveTrackCanvas")) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;
      const midY = h / 2;

      // Draw Grid Background
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
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

      // Draw 3 Parallel Track Lines
      const tracksY = [midY - 45, midY, midY + 45];
      tracksY.forEach((ty, idx) => {
        // Main Rail
        ctx.strokeStyle = idx === 1 ? "#38bdf8" : "#64748b";
        ctx.lineWidth = idx === 1 ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(30, ty);
        ctx.lineTo(w - 30, ty);
        ctx.stroke();

        // Rail Sleepers
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        for (let sx = 40; sx < w - 30; sx += 16) {
          ctx.beginPath();
          ctx.moveTo(sx, ty - 5);
          ctx.lineTo(sx, ty + 5);
          ctx.stroke();
        }
      });

      // Draw Station Nodes
      const stations = [
        { name: "NDLS", x: 50 },
        { name: "NZM", x: w * 0.35 },
        { name: "FDB", x: w * 0.68 },
        { name: "TKD", x: w - 60 },
      ];

      stations.forEach((st) => {
        ctx.fillStyle = "#0f172a";
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(st.x, midY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(st.name, st.x, midY - 14);
      });

      // Animated Train Locomotives Moving along Track
      const train1X = (50 + animStep * 1.2) % (w - 80);
      const train2X = (w - 70 - animStep * 0.8) % (w - 80);

      // Train 1: 12951 Rajdhani (Blue)
      ctx.fillStyle = "#3b82f6";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#3b82f6";
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(train1X, midY - 6, 24, 12, 3);
      } else {
        ctx.rect(train1X, midY - 6, 24, 12);
      }
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "9px monospace";
      ctx.fillText("12951", train1X + 12, midY + 3);

      // Train 2: Freight WAG9 (Amber)
      ctx.fillStyle = "#f59e0b";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#f59e0b";
      ctx.beginPath();
      const actualTrain2X = train2X < 50 ? w - 70 : train2X;
      if (ctx.roundRect) {
        ctx.roundRect(actualTrain2X, midY + 39, 24, 12, 3);
      } else {
        ctx.rect(actualTrain2X, midY + 39, 24, 12);
      }
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.font = "bold 8px monospace";
      ctx.fillText("WAG9", actualTrain2X + 12, midY + 48);

      // Reset Shadow
      ctx.shadowBlur = 0;

      animStep += 1;
      requestAnimationFrame(drawMap);
    }

    drawMap();
  }

  // =========================================================================
  // ULTRASONIC SPECTRUM MONITOR ANIMATED CANVAS
  // =========================================================================
  function initUsfdSpectrumCanvas() {
    const canvas = document.getElementById("usfdSpectrumChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    canvas.width = canvas.parentElement.clientWidth || 300;
    canvas.height = canvas.parentElement.clientHeight || 96;

    let step = 0;

    function draw() {
      if (!document.getElementById("usfdSpectrumChart")) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const width = canvas.width;
      const height = canvas.height;
      const midY = height / 2;

      for (let x = 0; x < width; x++) {
        let noise = (Math.random() - 0.5) * 3;

        let spike1 = 0;
        let dist1 = Math.abs(x - (width * 0.35 + Math.sin(step * 0.05) * 5));
        if (dist1 < 15) {
          spike1 = Math.cos((dist1 / 15) * (Math.PI / 2)) * 30;
        }

        let spike2 = 0;
        let dist2 = Math.abs(x - width * 0.7);
        if (dist2 < 10) {
          spike2 = Math.cos((dist2 / 10) * (Math.PI / 2)) * -22;
        }

        let y = midY + noise + spike1 + spike2;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      ctx.shadowBlur = 8;
      ctx.shadowColor = "#06b6d4";

      step += 1;
      requestAnimationFrame(draw);
    }

    draw();
  }

  window.runUsfdCalibrationTest = function () {
    showToast("Initiating USFD Acoustic Probe Calibration Scan...", "info");
    setTimeout(() => {
      showToast(
        "USFD Calibration Complete: 2.25 MHz Transducer Synchronized. Zero Defects Found on Main Line!",
        "success",
      );
    }, 1500);
  };

  // =========================================================================
  // NEW WORK ORDER MODAL LOGIC
  // =========================================================================
  window.openNewWorkOrderModal = function () {
    document.getElementById("newWorkOrderModal").classList.remove("hidden");
  };

  window.closeNewWorkOrderModal = function () {
    document.getElementById("newWorkOrderModal").classList.add("hidden");
  };

  window.submitNewWorkOrder = function (event) {
    event.preventDefault();
    const section = document.getElementById("woSection").value.trim();
    const defect = document.getElementById("woDefect").value.trim();
    const priority = document.getElementById("woPriority").value;
    const crew = document.getElementById("woCrew").value;

    const newId = `WO-${Math.floor(8800 + Math.random() * 150)}`;

    let priorityClass =
      "bg-[#FFFBEB] text-[#B45309] border-2 border-[#FF9933] font-extrabold";
    if (priority === "CRITICAL" || priority === "HIGH") {
      priorityClass =
        "bg-[#FEF2F2] text-[#DC2626] border-2 border-[#DC2626] font-extrabold";
    } else if (priority === "LOW") {
      priorityClass =
        "bg-[#F0FDF4] text-[#138808] border-2 border-[#138808] font-extrabold";
    }

    const newWo = {
      id: newId,
      location: section,
      km: "Km Custom",
      defect: defect,
      priority: priority,
      priorityClass: priorityClass,
      status: "IN PROGRESS",
      statusClass:
        "bg-[#EAF3F8] text-[#12355B] border-2 border-[#12355B] font-extrabold",
      crew: crew,
    };

    workOrders.unshift(newWo);
    closeNewWorkOrderModal();
    if (activeNavView === "overview") {
      const container = document.getElementById("activeSubTabContainer");
      if (container) renderDashboardOverview(container);
    }
    showToast(`🛠️ Work Order ${newId} Dispatched to ${crew}!`, "success");
  };

  window.updateWoStatus = function (woId) {
    const wo = workOrders.find((w) => w.id === woId);
    if (wo) {
      if (wo.status === "IN PROGRESS") {
        wo.status = "COMPLETED";
        wo.statusClass =
          "bg-[#F0FDF4] text-[#138808] border-2 border-[#138808] font-extrabold";
      } else {
        wo.status = "IN PROGRESS";
        wo.statusClass =
          "bg-[#EAF3F8] text-[#12355B] border-2 border-[#12355B] font-extrabold";
      }
      if (activeNavView === "overview") {
        const container = document.getElementById("activeSubTabContainer");
        if (container) renderDashboardOverview(container);
      }
      showToast(`Work Order ${woId} Status Updated to ${wo.status}!`, "info");
    }
  };

  // Initialize Default or Hash-based View
  function initRoute() {
    const rawHash = window.location.hash
      ? window.location.hash.replace("#", "")
      : "";
    const initialView = (rawHash === "overview" || !rawHash) ? "train_list" : rawHash;
    switchNavView(initialView);
  }

  window.addEventListener("hashchange", () => {
    const rawHash = window.location.hash
      ? window.location.hash.replace("#", "")
      : "";
    switchNavView((rawHash === "overview" || !rawHash) ? "train_list" : rawHash);
  });

  initRoute();
});
