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
    activeNavView = viewName || "overview";

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
        "sidebar-link text-slate-400 hover:text-slate-200 flex items-center gap-3 px-3.5 py-2 rounded-xl";
    });

    // Update active class on sidebar
    const navLinks = document.querySelectorAll("#mainSidebarNav a");
    navLinks.forEach((link) => {
      if (link.id === `nav_${activeNavView}`) {
        link.className =
          "sidebar-link active flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-white font-bold bg-blue-600/30 border border-blue-400";
      } else {
        link.className =
          "sidebar-link text-slate-400 hover:text-slate-200 flex items-center gap-3 px-3.5 py-2.5 rounded-xl";
      }
    });

    const container = document.getElementById("activeSubTabContainer");
    if (!container) return;

    if (activeNavView === "overview") {
      renderDashboardOverview(container);
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

  function renderLiveMapSection(container) {
    container.innerHTML = `
      <div class="space-y-5">
        <!-- Top Map Header Bar -->
        <div class="glass-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-l-4 border-emerald-500">
          <div>
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider">Geographic GIS Command Map</span>
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <h2 class="text-xl font-black text-white font-['Outfit'] mt-1 flex items-center gap-2">
              🗺️ Indian Railways Active Locomotive GIS Network Map
            </h2>
            <p class="text-xs text-slate-400 font-mono">Delhi - Agra - Bhopal Trunk Route • 160 MHz Kavach RF Mesh Telemetry</p>
          </div>

          <div class="flex flex-wrap items-center gap-2 text-xs">
            <button onclick="filterMapTrains('all')" class="px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${activeMapTrainFilter === "all" ? "bg-emerald-600/30 border-emerald-400 text-emerald-200 font-bold" : "bg-slate-900 border-white/10 text-slate-400"}">
              All Trains (14)
            </button>
            <button onclick="filterMapTrains('express')" class="px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${activeMapTrainFilter === "express" ? "bg-blue-600/30 border-blue-400 text-blue-200 font-bold" : "bg-slate-900 border-white/10 text-slate-400"}">
              🚅 Vande Bharat / Rajdhani (130 km/h)
            </button>
            <button onclick="filterMapTrains('freight')" class="px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${activeMapTrainFilter === "freight" ? "bg-amber-600/30 border-amber-400 text-amber-200 font-bold" : "bg-slate-900 border-white/10 text-slate-400"}">
              📦 Freight WAG9
            </button>
            <button onclick="showToast('Re-centered Map to New Delhi (NDLS) Main Station', 'info')" class="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold border border-white/10 cursor-pointer">
              <i class="fa-solid fa-crosshairs"></i> Center NDLS
            </button>
          </div>
        </div>

        <!-- Realistic Geographic Railway Track & Route Canvas Container -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          <!-- Realistic Interactive Route Map Viewport (8 cols) -->
          <div class="lg:col-span-8 glass-card p-4 space-y-3 relative overflow-hidden border border-emerald-500/30">
            <div class="flex items-center justify-between border-b border-white/10 pb-2.5 text-xs">
              <div class="flex items-center gap-2">
                <span class="font-mono text-emerald-400 font-bold">LIVE GIS NETWORK OVERLAY</span>
                <span class="text-slate-500">•</span>
                <span class="text-slate-400">Section: NDLS - NZM - FDB - MTJ - BPL - ET</span>
              </div>
              <span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px]">100% KAVACH COVERAGE</span>
            </div>

            <!-- Canvas Viewport with Grid Overlay -->
            <div class="h-[440px] w-full bg-slate-950 rounded-xl border border-white/10 relative overflow-hidden flex items-center justify-center p-2">
              <canvas id="gisNetworkMapCanvas" class="w-full h-full block cursor-crosshair"></canvas>
            </div>

            <!-- Map Legend Bar -->
            <div class="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-300 bg-slate-900/90 p-2.5 rounded-xl border border-white/10">
              <div class="flex items-center gap-3">
                <span><strong class="text-emerald-400">━━━</strong> Up Main Line (Clear)</span>
                <span><strong class="text-amber-400">━━━</strong> Down Main Line (Caution)</span>
                <span><strong class="text-cyan-400">╍╍╍</strong> Loop Siding</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-emerald-400 font-bold">● Green Signal</span>
                <span class="text-amber-400 font-bold">● Yellow Aspect</span>
                <span class="text-red-400 font-bold">● Red Danger</span>
              </div>
            </div>
          </div>

          <!-- Selected Locomotive Inspector & Live Telemetry Card (4 cols) -->
          <div class="lg:col-span-4 glass-card p-5 space-y-4 border border-blue-500/40 flex flex-col justify-between">
            <div class="space-y-3">
              <div class="flex items-center justify-between border-b border-white/10 pb-2.5">
                <h3 class="text-sm font-extrabold text-white font-['Outfit'] flex items-center gap-2">
                  <i class="fa-solid fa-train text-blue-400"></i> Locomotive Telemetry Inspector
                </h3>
                <span class="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-mono text-[10px] font-bold">LIVE OBC LINK</span>
              </div>

              <div class="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-2 text-xs">
                <div class="flex items-center justify-between">
                  <span class="text-slate-400">Train Number & Name:</span>
                  <span class="font-bold text-cyan-300 font-mono">12012 Vande Bharat</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-400">Current Speed:</span>
                  <span class="font-bold text-emerald-400 font-mono text-sm">130 km/h</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-400">Track Section:</span>
                  <span class="font-bold text-white">NDLS - GZB Up Main</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-400">Braking Distance Margin:</span>
                  <span class="font-bold text-emerald-300 font-mono">1,450 meters (Safe)</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-400">Loco Pilot Name:</span>
                  <span class="font-bold text-purple-300">Rajesh Kumar (HQ NDLS)</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-400">Cab Signal Aspect:</span>
                  <span class="font-bold text-emerald-400 flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> PROCEED (GREEN)</span>
                </div>
              </div>

              <div class="space-y-2 text-xs font-mono">
                <div class="p-2.5 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
                  <span class="text-slate-400">Kavach RF Transceiver:</span>
                  <span class="text-emerald-400 font-bold">160.225 MHz (-48 dBm)</span>
                </div>
                <div class="p-2.5 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
                  <span class="text-slate-400">GPS Satellites Locked:</span>
                  <span class="text-cyan-300 font-bold">12 NavIC Satellites</span>
                </div>
              </div>
            </div>

            <div class="pt-3 border-t border-white/10 space-y-2">
              <button onclick="showToast('Issued Priority Green Signal Advisory for 12012 Vande Bharat', 'success')" class="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition-all cursor-pointer">
                Issue Direct Speed Advisory
              </button>
              <button onclick="showToast('Kavach OBC Telemetry Diagnostics Transmitted to Loco 12012', 'info')" class="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer">
                Full OBC Telemetry Log
              </button>
            </div>
          </div>

        </div>
      </div>
    `;

    setTimeout(initGisMapCanvas, 50);
  }

  function initGisMapCanvas() {
    const canvas = document.getElementById("gisNetworkMapCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.parentElement.clientWidth || 700;
    canvas.height = canvas.parentElement.clientHeight || 420;

    const stations = [
      { name: "NDLS (New Delhi)", x: 0.12, y: 0.35, code: "PF 1-16" },
      { name: "NZM (Nizamuddin)", x: 0.28, y: 0.55, code: "PF 1-8" },
      { name: "FDB (Faridabad)", x: 0.45, y: 0.4, code: "PF 1-4" },
      { name: "MTJ (Mathura Jdn)", x: 0.62, y: 0.65, code: "PF 1-10" },
      { name: "BPL (Bhopal)", x: 0.8, y: 0.3, code: "PF 1-6" },
      { name: "ET (Itarsi Jdn)", x: 0.92, y: 0.7, code: "PF 1-7" },
    ];

    let animProgress = 0;

    function renderGisLoop() {
      if (!document.getElementById("gisNetworkMapCanvas")) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Grid background lines
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

      // Draw Main Track Lines (Broad Gauge Up & Down Lines)
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#10b981"; // Green Up Main
      ctx.beginPath();
      ctx.moveTo(w * stations[0].x, h * stations[0].y);
      for (let i = 1; i < stations.length; i++) {
        ctx.lineTo(w * stations[i].x, h * stations[i].y);
      }
      ctx.stroke();

      // Parallel Down Main Line (Amber)
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(w * stations[0].x, h * stations[0].y + 12);
      for (let i = 1; i < stations.length; i++) {
        ctx.lineTo(w * stations[i].x, h * stations[i].y + 12);
      }
      ctx.stroke();

      // Draw Stations Nodes
      stations.forEach((stn) => {
        const sx = w * stn.x;
        const sy = h * stn.y;

        // Station Halo Circle
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#06b6d4";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        // Label
        ctx.font = "bold 11px Outfit, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(stn.name, sx - 25, sy - 14);

        ctx.font = "9px JetBrains Mono, monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(stn.code, sx - 15, sy + 24);
      });

      // Animated Train Nodes
      animProgress = (animProgress + 0.003) % 1;

      // Train 1: Vande Bharat (NDLS -> MTJ)
      const t1Seg = animProgress * 3; // 0 to 3
      const t1Idx = Math.floor(t1Seg);
      const t1Frac = t1Seg - t1Idx;
      if (t1Idx < stations.length - 1) {
        const p1 = stations[t1Idx];
        const p2 = stations[t1Idx + 1];
        const tx = w * (p1.x + (p2.x - p1.x) * t1Frac);
        const ty = h * (p1.y + (p2.y - p1.y) * t1Frac);

        // Radar pulses
        ctx.beginPath();
        ctx.arc(tx, ty, 14, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(tx, ty, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#10b981";
        ctx.fill();

        ctx.font = "bold 10px Plus Jakarta Sans, sans-serif";
        ctx.fillStyle = "#34d399";
        ctx.fillText("🚅 12012 Vande Bharat (130 km/h)", tx + 10, ty - 6);
      }

      // Train 2: Rajdhani Express (NZM -> BPL)
      const t2Frac = (animProgress + 0.4) % 1;
      const t2Seg = t2Frac * 4;
      const t2Idx = Math.floor(t2Seg);
      const t2F = t2Seg - t2Idx;
      if (t2Idx < stations.length - 1) {
        const p1 = stations[t2Idx];
        const p2 = stations[t2Idx + 1];
        const tx = w * (p1.x + (p2.x - p1.x) * t2F);
        const ty = h * (p1.y + (p2.y - p1.y) * t2F) + 12;

        ctx.beginPath();
        ctx.arc(tx, ty, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#3b82f6";
        ctx.fill();

        ctx.font = "bold 10px Plus Jakarta Sans, sans-serif";
        ctx.fillStyle = "#60a5fa";
        ctx.fillText("⚡ 12951 Rajdhani (110 km/h)", tx + 8, ty + 14);
      }

      requestAnimationFrame(renderGisLoop);
    }

    renderGisLoop();
  }

  // VIEW 2: SEARCHABLE INTERACTIVE TRAIN ROSTER (train_list)
  let trainListSearchQuery = "";
  let trainListFilter = "all";

  window.setTrainSearchQuery = function (query) {
    trainListSearchQuery = query.toLowerCase();
    const container = document.getElementById("activeSubTabContainer");
    if (container && activeNavView === "train_list") {
      renderTrainListSection(container);
    }
  };

  window.setTrainFilter = function (filter) {
    trainListFilter = filter;
    const container = document.getElementById("activeSubTabContainer");
    if (container && activeNavView === "train_list") {
      renderTrainListSection(container);
    }
  };

  function renderTrainListSection(container) {
    const trains = [
      {
        id: "12012",
        name: "Vande Bharat Express",
        route: "NDLS – GZB Up Main",
        speed: "130 km/h",
        delay: "ON TIME",
        delayClass: "bg-emerald-950 text-emerald-400 border-emerald-500/30",
        kavach: "Opto-Isolated RF Mesh",
        loc: "28.6139° N, 77.2090° E",
      },
      {
        id: "12951",
        name: "Mumbai Rajdhani Express",
        route: "NZM – FDB Main",
        speed: "110 km/h",
        delay: "ON TIME",
        delayClass: "bg-emerald-950 text-emerald-400 border-emerald-500/30",
        kavach: "Automatic Brake (FSB)",
        loc: "28.4089° N, 77.3178° E",
      },
      {
        id: "12059",
        name: "Kota Jan Shatabdi",
        route: "TKD – MTJ Section",
        speed: "45 km/h (TSR)",
        delay: "+12 MIN",
        delayClass: "bg-amber-950 text-amber-400 border-amber-500/30",
        kavach: "TSR Target Enforced",
        loc: "27.4924° N, 77.6737° E",
      },
      {
        id: "12626",
        name: "Kerala Express",
        route: "MTJ – BPL Line",
        speed: "105 km/h",
        delay: "+28 MIN",
        delayClass: "bg-red-950 text-red-400 border-red-500/30",
        kavach: "Cab Signal Proceed",
        loc: "26.2183° N, 78.1828° E",
      },
      {
        id: "31088",
        name: "Freight BOXN Coal Special",
        route: "NDLS Yard Line 4",
        speed: "30 km/h",
        delay: "ON TIME",
        delayClass: "bg-slate-800 text-slate-300 border-slate-700",
        kavach: "Shunting Permit Active",
        loc: "28.6448° N, 77.2150° E",
      },
    ];

    const filteredTrains = trains.filter((t) => {
      const matchQuery =
        t.id.toLowerCase().includes(trainListSearchQuery) ||
        t.name.toLowerCase().includes(trainListSearchQuery) ||
        t.route.toLowerCase().includes(trainListSearchQuery);
      if (trainListFilter === "ontime")
        return matchQuery && t.delay === "ON TIME";
      if (trainListFilter === "delayed")
        return matchQuery && t.delay !== "ON TIME";
      return matchQuery;
    });

    container.innerHTML = `
      <div class="glass-card p-5 space-y-4">
        <!-- Top Action Bar -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h3 class="text-base font-extrabold text-white font-['Outfit'] flex items-center gap-2">
              <i class="fa-solid fa-list-check text-blue-400"></i> Active Locomotive & Train Roster
            </h3>
            <p class="text-xs text-slate-400">128 Total Trains Monitored • Real-Time GPS & Kavach OBC Interlocking</p>
          </div>

          <div class="flex items-center gap-2">
            <input type="text" value="${trainListSearchQuery}" oninput="setTrainSearchQuery(this.value)" placeholder="Search Train No / Name..." class="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
          </div>
        </div>

        <!-- Filter Pills -->
        <div class="flex items-center gap-2 text-xs">
          <button onclick="setTrainFilter('all')" class="px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${trainListFilter === "all" ? "bg-blue-600/30 border-blue-400 text-blue-200 font-bold" : "bg-slate-900 border-white/10 text-slate-400"}">
            All Trains (128)
          </button>
          <button onclick="setTrainFilter('ontime')" class="px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${trainListFilter === "ontime" ? "bg-emerald-600/30 border-emerald-400 text-emerald-200 font-bold" : "bg-slate-900 border-white/10 text-slate-400"}">
            On-Time (75)
          </button>
          <button onclick="setTrainFilter('delayed')" class="px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${trainListFilter === "delayed" ? "bg-amber-600/30 border-amber-400 text-amber-200 font-bold" : "bg-slate-900 border-white/10 text-slate-400"}">
            Delayed (32)
          </button>
        </div>

        <!-- Table View -->
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-white/10 text-slate-400 uppercase font-mono text-[10px]">
                <th class="py-3 px-3">Train No & Name</th>
                <th class="py-3 px-3">Route Section</th>
                <th class="py-3 px-3">Current Speed</th>
                <th class="py-3 px-3">Schedule Status</th>
                <th class="py-3 px-3">Kavach Interlocking</th>
                <th class="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-white/5 font-medium text-slate-200">
              ${filteredTrains
                .map(
                  (t) => `
                <tr class="hover:bg-white/5 transition-colors">
                  <td class="py-3.5 px-3">
                    <p class="font-bold text-white font-mono">${t.id}</p>
                    <p class="text-slate-300 text-[11px] font-sans font-bold">${t.name}</p>
                  </td>
                  <td class="py-3.5 px-3 text-slate-300">${t.route}<br/><span class="text-[10px] text-slate-400 font-mono">${t.loc}</span></td>
                  <td class="py-3.5 px-3 font-bold text-emerald-400 font-mono">${t.speed}</td>
                  <td class="py-3.5 px-3"><span class="px-2 py-0.5 rounded border text-[10px] font-bold ${t.delayClass}">${t.delay}</span></td>
                  <td class="py-3.5 px-3 text-cyan-300 font-mono text-[11px]">${t.kavach}</td>
                  <td class="py-3.5 px-3 text-right">
                    <button onclick="showToast('OBC Telemetry Log for Train ${t.id} ${t.name} Loaded', 'info')" class="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 text-[10px] font-bold cursor-pointer">
                      View Telemetry
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
    const initialView = rawHash || "overview";
    switchNavView(initialView);
  }

  window.addEventListener("hashchange", () => {
    const rawHash = window.location.hash
      ? window.location.hash.replace("#", "")
      : "";
    switchNavView(rawHash || "overview");
  });

  initRoute();
});
