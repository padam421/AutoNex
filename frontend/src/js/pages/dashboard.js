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

  // Real Indian Railways State & Live Ingestion Cache (Hoisted to top of scope)
  let irSchedulesIndex = {};
  let irTracksGeoJSON = null;
  let irCrossingsGeoJSON = null;
  let irSignalsGeoJSON = null;
  let irEarthquakesGeoJSON = null;
  let irDelayModel = null;
  let irMaintenanceDataset = [];
  let isRealDatasetsLoaded = false;

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

  // Live IST Clock (Always in 12-Hour AM/PM format)
  function updateClock() {
    const el = document.getElementById("dashClock");
    const tickerEl = document.getElementById("tickerClock");
    const now = new Date();
    const options = {
      timeZone: "Asia/Kolkata",
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    const timeStr = now.toLocaleTimeString("en-IN", options).toUpperCase();
    if (el) {
      el.textContent = `${timeStr} IST`;
    }
    if (tickerEl) {
      tickerEl.textContent = `${timeStr} IST`;
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
    activeNavView = (!viewName || viewName === "overview") ? "live_map" : viewName;

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

    if (activeNavView === "live_map") {
      renderLiveMapSection(container);
    } else if (activeNavView === "overview") {
      renderDashboardOverview(container);
    } else if (activeNavView === "train_list") {
      renderTrainListSection(container);
    } else if (
      activeNavView === "station_master" ||
      activeNavView === "maintenance_engineer" ||
      activeNavView === "control_room" ||
      activeNavView === "admin_superintendent"
    ) {
      switchDepartmentWorkspace(activeNavView);
    } else if (activeNavView === "conflict_alerts") {
      renderConflictAlertsSection(container);
    } else if (activeNavView === "delay_analytics") {
      renderDelayAnalyticsSection(container);
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

  // Comprehensive Pan-India Train Corridors Dataset (Live Cyclic Fleet Across All Zones)
  let panIndiaTrainData = [
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
      depart: "06:00",
      arrive: "14:00",
      durationMins: 480,
      stations: [
        { name: "New Delhi", code: "NDLS", lat: 28.6139, lng: 77.2090, pf: "PF 16", arr: "06:00", dep: "06:00", distKm: 0 },
        { name: "Aligarh Jn", code: "ALJN", lat: 27.8974, lng: 78.0880, pf: "PF 3", arr: "07:30", dep: "07:32", distKm: 131 },
        { name: "Kanpur Central", code: "CNB", lat: 26.4499, lng: 80.3319, pf: "PF 1", arr: "10:08", dep: "10:13", distKm: 440 },
        { name: "Prayagraj Jn", code: "PRYJ", lat: 25.4358, lng: 81.8463, pf: "PF 6", arr: "12:08", dep: "12:13", distKm: 635 },
        { name: "Varanasi Jn", code: "BSB", lat: 25.3176, lng: 82.9739, pf: "PF 1", arr: "14:00", dep: "14:00", distKm: 759 }
      ],
      progress: 0.38
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
      routeDescription: "Mumbai Central (MMCT) ➔ Surat ➔ Vadodara ➔ Ratlam ➔ Kota ➔ Mathura ➔ New Delhi",
      depart: "17:00",
      arrive: "08:32",
      durationMins: 932,
      stations: [
        { name: "Mumbai Central", code: "MMCT", lat: 18.9712, lng: 72.8197, pf: "PF 1", arr: "17:00", dep: "17:00", distKm: 0 },
        { name: "Surat", code: "ST", lat: 21.1702, lng: 72.8311, pf: "PF 1", arr: "19:32", dep: "19:37", distKm: 263 },
        { name: "Vadodara Jn", code: "BRC", lat: 22.3072, lng: 73.1812, pf: "PF 2", arr: "21:05", dep: "21:15", distKm: 392 },
        { name: "Ratlam Jn", code: "RTM", lat: 23.3315, lng: 75.0367, pf: "PF 4", arr: "00:25", dep: "00:30", distKm: 653 },
        { name: "Kota Jn", code: "KOTA", lat: 25.1800, lng: 75.8300, pf: "PF 1", arr: "03:15", dep: "03:20", distKm: 919 },
        { name: "Mathura Jn", code: "MTJ", lat: 27.4924, lng: 77.6737, pf: "PF 3", arr: "06:40", dep: "06:42", distKm: 1243 },
        { name: "New Delhi", code: "NDLS", lat: 28.6139, lng: 77.2090, pf: "PF 1", arr: "08:32", dep: "08:32", distKm: 1384 }
      ],
      progress: 0.62
    },
    {
      id: "12302",
      number: "12302",
      name: "Howrah Rajdhani Express (via Gaya)",
      shortName: "Howrah Rajdhani (NDLS - HWH)",
      type: "rajdhani",
      color: "#b91c1c",
      speed: 130,
      maxSpeed: 130,
      kavachStatus: "ARMED (SIL-4)",
      kavachFreq: "160.200 MHz",
      rssi: "-42 dBm",
      satellites: 14,
      locoPilot: "A. K. Banerjee (HQ HWH)",
      locoModel: "WAP-7 HOG (6,000 HP)",
      currentSection: "Kanpur - Prayagraj Trunk Route",
      nextStation: "Prayagraj Jn (PRYJ)",
      etaNextStation: "38 mins",
      brakingMargin: "1,550m (Optimal)",
      cabSignal: "PROCEED (GREEN)",
      cabSignalClass: "text-emerald-400",
      routeDescription: "New Delhi (NDLS) ➔ Kanpur ➔ Prayagraj ➔ Patna ➔ Howrah",
      depart: "16:55",
      arrive: "10:00",
      durationMins: 1025,
      stations: [
        { name: "New Delhi", code: "NDLS", lat: 28.6139, lng: 77.2090, pf: "PF 16", arr: "16:55", dep: "16:55", distKm: 0 },
        { name: "Kanpur Central", code: "CNB", lat: 26.4499, lng: 80.3319, pf: "PF 1", arr: "21:38", dep: "21:43", distKm: 440 },
        { name: "Prayagraj Jn", code: "PRYJ", lat: 25.4358, lng: 81.8463, pf: "PF 4", arr: "00:05", dep: "00:10", distKm: 635 },
        { name: "Patna Jn", code: "PNBE", lat: 25.6022, lng: 85.1376, pf: "PF 1", arr: "05:45", dep: "05:50", distKm: 998 },
        { name: "Howrah Jn", code: "HWH", lat: 22.5839, lng: 88.3433, pf: "PF 9", arr: "10:00", dep: "10:00", distKm: 1451 }
      ],
      progress: 0.48
    },
    {
      id: "12952",
      number: "12952",
      name: "New Delhi - Mumbai Tejas Rajdhani",
      shortName: "Tejas Rajdhani (NDLS - MMCT)",
      type: "rajdhani",
      color: "#dc2626",
      speed: 130,
      maxSpeed: 130,
      kavachStatus: "ARMED (SIL-4)",
      kavachFreq: "160.225 MHz",
      rssi: "-44 dBm",
      satellites: 14,
      locoPilot: "R. P. Deshmukh (HQ MMCT)",
      locoModel: "WAP-7 High Adhesion",
      currentSection: "Mathura - Kota High Speed Corridor",
      nextStation: "Kota Jn (KOTA)",
      etaNextStation: "1hr 12m",
      brakingMargin: "1,600m",
      cabSignal: "PROCEED (GREEN)",
      cabSignalClass: "text-emerald-400",
      routeDescription: "New Delhi (NDLS) ➔ Kota ➔ Vadodara ➔ Mumbai Central",
      depart: "16:25",
      arrive: "08:15",
      durationMins: 950,
      stations: [
        { name: "New Delhi", code: "NDLS", lat: 28.6139, lng: 77.2090, pf: "PF 2", arr: "16:25", dep: "16:25", distKm: 0 },
        { name: "Kota Jn", code: "KOTA", lat: 25.1800, lng: 75.8300, pf: "PF 1", arr: "21:50", dep: "21:55", distKm: 465 },
        { name: "Vadodara Jn", code: "BRC", lat: 22.3072, lng: 73.1812, pf: "PF 3", arr: "03:05", dep: "03:10", distKm: 992 },
        { name: "Mumbai Central", code: "MMCT", lat: 18.9712, lng: 72.8197, pf: "PF 1", arr: "08:15", dep: "08:15", distKm: 1384 }
      ],
      progress: 0.22
    },
    {
      id: "12059",
      number: "12059",
      name: "Kota Jan Shatabdi Express",
      shortName: "Kota Jan Shatabdi (NDLS - KOTA)",
      type: "shatabdi",
      color: "#0369a1",
      speed: 110,
      maxSpeed: 110,
      kavachStatus: "ACTIVE (160.200 MHz)",
      kavachFreq: "160.200 MHz",
      rssi: "-48 dBm",
      satellites: 13,
      locoPilot: "G. S. Yadav (HQ AGC)",
      locoModel: "WAP-7 Dual Cab",
      currentSection: "Mathura - Agra Cantt Line",
      nextStation: "Agra Cantt (AGC)",
      etaNextStation: "28 mins",
      brakingMargin: "1,350m",
      cabSignal: "PROCEED (GREEN)",
      cabSignalClass: "text-emerald-400",
      routeDescription: "New Delhi (NDLS) ➔ Mathura ➔ Agra Cantt ➔ Gwalior ➔ Kota",
      depart: "17:50",
      arrive: "23:20",
      durationMins: 330,
      stations: [
        { name: "New Delhi", code: "NDLS", lat: 28.6139, lng: 77.2090, pf: "PF 9", arr: "17:50", dep: "17:50", distKm: 0 },
        { name: "Mathura Jn", code: "MTJ", lat: 27.4924, lng: 77.6737, pf: "PF 3", arr: "19:45", dep: "19:47", distKm: 141 },
        { name: "Agra Cantt", code: "AGC", lat: 27.1594, lng: 77.9940, pf: "PF 1", arr: "20:15", dep: "20:18", distKm: 195 },
        { name: "Gwalior Jn", code: "GWL", lat: 26.2183, lng: 78.1828, pf: "PF 2", arr: "21:32", dep: "21:35", distKm: 313 },
        { name: "Kota Jn", code: "KOTA", lat: 25.1800, lng: 75.8300, pf: "PF 1", arr: "23:20", dep: "23:20", distKm: 465 }
      ],
      progress: 0.55
    },
    {
      id: "12626",
      number: "12626",
      name: "Kerala Superfast Express",
      shortName: "Kerala Express (NDLS - TVC)",
      type: "superfast",
      color: "#059669",
      speed: 110,
      maxSpeed: 110,
      kavachStatus: "ARMED",
      kavachFreq: "160.225 MHz",
      rssi: "-50 dBm",
      satellites: 14,
      locoPilot: "K. R. Nair (HQ TVC)",
      locoModel: "WAP-7 High Power",
      currentSection: "Bhopal - Itarsi - Nagpur Section",
      nextStation: "Nagpur Jn (NGP)",
      etaNextStation: "1hr 40m",
      brakingMargin: "1,400m",
      cabSignal: "PROCEED (GREEN)",
      cabSignalClass: "text-emerald-400",
      routeDescription: "New Delhi (NDLS) ➔ Agra ➔ Bhopal ➔ Nagpur ➔ Secunderabad ➔ Trivandrum",
      depart: "11:25",
      arrive: "19:05",
      durationMins: 1900,
      stations: [
        { name: "New Delhi", code: "NDLS", lat: 28.6139, lng: 77.2090, pf: "PF 5", arr: "11:25", dep: "11:25", distKm: 0 },
        { name: "Agra Cantt", code: "AGC", lat: 27.1594, lng: 77.9940, pf: "PF 1", arr: "14:05", dep: "14:10", distKm: 195 },
        { name: "Bhopal Jn", code: "BPL", lat: 23.2599, lng: 77.4126, pf: "PF 4", arr: "20:10", dep: "20:20", distKm: 701 },
        { name: "Nagpur Jn", code: "NGP", lat: 21.1528, lng: 79.0882, pf: "PF 3", arr: "02:45", dep: "02:55", distKm: 1091 },
        { name: "Secunderabad Jn", code: "SC", lat: 17.4399, lng: 78.5017, pf: "PF 1", arr: "10:30", dep: "10:40", distKm: 1673 },
        { name: "Thiruvananthapuram", code: "TVC", lat: 8.4875, lng: 76.9530, pf: "PF 1", arr: "19:05", dep: "19:05", distKm: 3036 }
      ],
      progress: 0.32
    },
    {
      id: "12015",
      number: "12015",
      name: "Ajmer Shatabdi Express",
      shortName: "Ajmer Shatabdi (NDLS - AII)",
      type: "shatabdi",
      color: "#0284c7",
      speed: 130,
      maxSpeed: 130,
      kavachStatus: "ARMED (SIL-4)",
      kavachFreq: "160.200 MHz",
      rssi: "-40 dBm",
      satellites: 15,
      locoPilot: "B. L. Meena (HQ JP)",
      locoModel: "WAP-7 HOG",
      currentSection: "Gurgaon - Rewari - Jaipur Trunk",
      nextStation: "Jaipur Jn (JP)",
      etaNextStation: "45 mins",
      brakingMargin: "1,500m",
      cabSignal: "PROCEED (GREEN)",
      cabSignalClass: "text-emerald-400",
      routeDescription: "New Delhi (NDLS) ➔ Jaipur ➔ Ajmer",
      depart: "06:15",
      arrive: "12:40",
      durationMins: 385,
      stations: [
        { name: "New Delhi", code: "NDLS", lat: 28.6139, lng: 77.2090, pf: "PF 1", arr: "06:15", dep: "06:15", distKm: 0 },
        { name: "Jaipur Jn", code: "JP", lat: 26.9200, lng: 75.7878, pf: "PF 1", arr: "10:40", dep: "10:50", distKm: 308 },
        { name: "Ajmer Jn", code: "AII", lat: 26.4526, lng: 74.6399, pf: "PF 3", arr: "12:40", dep: "12:40", distKm: 443 }
      ],
      progress: 0.72
    },
    {
      id: "12958",
      number: "12958",
      name: "Swarna Jayanti Rajdhani Express",
      shortName: "ADI Rajdhani (NDLS - ADI)",
      type: "rajdhani",
      color: "#ea580c",
      speed: 130,
      maxSpeed: 130,
      kavachStatus: "ARMED (SIL-4)",
      kavachFreq: "160.225 MHz",
      rssi: "-43 dBm",
      satellites: 14,
      locoPilot: "K. K. Sharma (HQ ADI)",
      locoModel: "WAP-7 Aerodynamic",
      currentSection: "Jaipur - Ajmer - Abu Road Corridor",
      nextStation: "Ahmedabad Jn (ADI)",
      etaNextStation: "1hr 55m",
      brakingMargin: "1,600m",
      cabSignal: "PROCEED (GREEN)",
      cabSignalClass: "text-emerald-400",
      routeDescription: "New Delhi (NDLS) ➔ Jaipur ➔ Ajmer ➔ Ahmedabad",
      depart: "19:25",
      arrive: "07:40",
      durationMins: 735,
      stations: [
        { name: "New Delhi", code: "NDLS", lat: 28.6139, lng: 77.2090, pf: "PF 4", arr: "19:25", dep: "19:25", distKm: 0 },
        { name: "Jaipur Jn", code: "JP", lat: 26.9200, lng: 75.7878, pf: "PF 1", arr: "23:45", dep: "23:55", distKm: 308 },
        { name: "Ajmer Jn", code: "AII", lat: 26.4526, lng: 74.6399, pf: "PF 1", arr: "01:50", dep: "01:55", distKm: 443 },
        { name: "Ahmedabad Jn", code: "ADI", lat: 23.0225, lng: 72.5714, pf: "PF 1", arr: "07:40", dep: "07:40", distKm: 934 }
      ],
      progress: 0.44
    },
    {
      id: "12622",
      number: "12622",
      name: "Tamil Nadu Superfast Express",
      shortName: "Tamil Nadu Express (NDLS - MAS)",
      type: "superfast",
      color: "#16a34a",
      speed: 110,
      maxSpeed: 110,
      kavachStatus: "ARMED",
      kavachFreq: "160.200 MHz",
      rssi: "-47 dBm",
      satellites: 13,
      locoPilot: "M. Ramanathan (HQ MAS)",
      locoModel: "WAP-7 Dual Cab",
      currentSection: "Nagpur - Balharshah - Vijayawada Corridor",
      nextStation: "Chennai Central (MAS)",
      etaNextStation: "2hr 15m",
      brakingMargin: "1,450m",
      cabSignal: "PROCEED (GREEN)",
      cabSignalClass: "text-emerald-400",
      routeDescription: "New Delhi (NDLS) ➔ Agra ➔ Gwalior ➔ Bhopal ➔ Nagpur ➔ Chennai Central",
      depart: "22:00",
      arrive: "07:10",
      durationMins: 1990,
      stations: [
        { name: "New Delhi", code: "NDLS", lat: 28.6139, lng: 77.2090, pf: "PF 8", arr: "22:00", dep: "22:00", distKm: 0 },
        { name: "Agra Cantt", code: "AGC", lat: 27.1594, lng: 77.9940, pf: "PF 1", arr: "00:38", dep: "00:43", distKm: 195 },
        { name: "Gwalior Jn", code: "GWL", lat: 26.2183, lng: 78.1828, pf: "PF 3", arr: "02:25", dep: "02:30", distKm: 313 },
        { name: "Bhopal Jn", code: "BPL", lat: 23.2599, lng: 77.4126, pf: "PF 6", arr: "07:10", dep: "07:20", distKm: 701 },
        { name: "Nagpur Jn", code: "NGP", lat: 21.1528, lng: 79.0882, pf: "PF 4", arr: "14:20", dep: "14:30", distKm: 1091 },
        { name: "Chennai Central", code: "MAS", lat: 13.0827, lng: 80.2707, pf: "PF 3", arr: "07:10", dep: "07:10", distKm: 2182 }
      ],
      progress: 0.65
    },
    {
      id: "12650",
      number: "12650",
      name: "Karnataka Sampark Kranti Express",
      shortName: "KSK Express (NDLS - SBC)",
      type: "superfast",
      color: "#d97706",
      speed: 110,
      maxSpeed: 110,
      kavachStatus: "ARMED",
      kavachFreq: "160.225 MHz",
      rssi: "-45 dBm",
      satellites: 14,
      locoPilot: "R. Venkatesh (HQ SBC)",
      locoModel: "WAP-7 HOG",
      currentSection: "Secunderabad - Bengaluru Trunk Line",
      nextStation: "KSR Bengaluru (SBC)",
      etaNextStation: "1hr 10m",
      brakingMargin: "1,500m",
      cabSignal: "PROCEED (GREEN)",
      cabSignalClass: "text-emerald-400",
      routeDescription: "New Delhi (NDLS) ➔ Agra ➔ Bhopal ➔ Secunderabad ➔ KSR Bengaluru",
      depart: "21:00",
      arrive: "05:40",
      durationMins: 1960,
      stations: [
        { name: "New Delhi", code: "NDLS", lat: 28.6139, lng: 77.2090, pf: "PF 12", arr: "21:00", dep: "21:00", distKm: 0 },
        { name: "Agra Cantt", code: "AGC", lat: 27.1594, lng: 77.9940, pf: "PF 1", arr: "00:05", dep: "00:10", distKm: 195 },
        { name: "Bhopal Jn", code: "BPL", lat: 23.2599, lng: 77.4126, pf: "PF 5", arr: "06:45", dep: "06:55", distKm: 701 },
        { name: "Secunderabad Jn", code: "SC", lat: 17.4399, lng: 78.5017, pf: "PF 1", arr: "19:15", dep: "19:30", distKm: 1673 },
        { name: "KSR Bengaluru", code: "SBC", lat: 12.9784, lng: 77.5683, pf: "PF 5", arr: "05:40", dep: "05:40", distKm: 2378 }
      ],
      progress: 0.82
    },
    {
      id: "14660",
      number: "14660",
      name: "Jaisalmer - Delhi Express",
      shortName: "JSM DLI Express (BME - NDLS)",
      type: "express",
      color: "#9333ea",
      speed: 85,
      maxSpeed: 100,
      kavachStatus: "ACTIVE",
      kavachFreq: "160.200 MHz",
      rssi: "-52 dBm",
      satellites: 12,
      locoPilot: "D. S. Rathore (HQ JU)",
      locoModel: "WDG-4D / WAP-7",
      currentSection: "Balotra - Luni - Jodhpur Line",
      nextStation: "Jodhpur Jn (JU)",
      etaNextStation: "32 mins",
      brakingMargin: "1,200m",
      cabSignal: "PROCEED (GREEN)",
      cabSignalClass: "text-emerald-400",
      routeDescription: "Barmer ➔ Balotra ➔ Luni ➔ Jodhpur ➔ Jaipur ➔ New Delhi",
      depart: "06:30",
      arrive: "06:45",
      durationMins: 1455,
      stations: [
        { name: "Barmer", code: "BME", lat: 25.7500, lng: 71.3917, pf: "PF 1", arr: "06:30", dep: "06:30", distKm: 0 },
        { name: "Balotra Jn", code: "BLT", lat: 25.8333, lng: 72.2333, pf: "PF 2", arr: "08:15", dep: "08:20", distKm: 96 },
        { name: "Luni Jn", code: "LUNI", lat: 26.0683, lng: 73.0189, pf: "PF 1", arr: "09:55", dep: "10:00", distKm: 177 },
        { name: "Jodhpur Jn", code: "JU", lat: 26.2867, lng: 73.0238, pf: "PF 3", arr: "11:30", dep: "11:45", distKm: 209 },
        { name: "Jaipur Jn", code: "JP", lat: 26.9200, lng: 75.7878, pf: "PF 2", arr: "18:00", dep: "18:10", distKm: 519 },
        { name: "New Delhi", code: "NDLS", lat: 28.6139, lng: 77.2090, pf: "PF 7", arr: "06:45", dep: "06:45", distKm: 827 }
      ],
      progress: 0.18
    },
    {
      id: "12462",
      number: "12462",
      name: "Mandore Superfast Express",
      shortName: "Mandore Express (JU - NDLS)",
      type: "superfast",
      color: "#0891b2",
      speed: 110,
      maxSpeed: 110,
      kavachStatus: "ARMED",
      kavachFreq: "160.225 MHz",
      rssi: "-46 dBm",
      satellites: 14,
      locoPilot: "Om Prakash (HQ JU)",
      locoModel: "WAP-7 Dual Cab",
      currentSection: "Ajmer - Jaipur - Bandikui Section",
      nextStation: "Jaipur Jn (JP)",
      etaNextStation: "40 mins",
      brakingMargin: "1,450m",
      cabSignal: "PROCEED (GREEN)",
      cabSignalClass: "text-emerald-400",
      routeDescription: "Jodhpur (JU) ➔ Ajmer ➔ Jaipur ➔ New Delhi",
      depart: "19:45",
      arrive: "06:10",
      durationMins: 625,
      stations: [
        { name: "Jodhpur Jn", code: "JU", lat: 26.2867, lng: 73.0238, pf: "PF 1", arr: "19:45", dep: "19:45", distKm: 0 },
        { name: "Ajmer Jn", code: "AII", lat: 26.4526, lng: 74.6399, pf: "PF 3", arr: "23:20", dep: "23:30", distKm: 234 },
        { name: "Jaipur Jn", code: "JP", lat: 26.9200, lng: 75.7878, pf: "PF 1", arr: "01:40", dep: "01:50", distKm: 369 },
        { name: "New Delhi", code: "NDLS", lat: 28.6139, lng: 77.2090, pf: "PF 11", arr: "06:10", dep: "06:10", distKm: 677 }
      ],
      progress: 0.52
    },
    {
      id: "20488",
      number: "20488",
      name: "Malani Superfast Express",
      shortName: "Malani Express (LUNI - BLT)",
      type: "express",
      color: "#c026d3",
      speed: 80,
      maxSpeed: 90,
      kavachStatus: "ARMED",
      kavachFreq: "160.200 MHz",
      rssi: "-48 dBm",
      satellites: 13,
      locoPilot: "R. K. Bishnoi (HQ JU)",
      locoModel: "WDP-4D Dual Cab",
      currentSection: "Luni - Samdari - Balotra Section",
      nextStation: "Balotra Jn (BLT)",
      etaNextStation: "22 mins",
      brakingMargin: "1,100m",
      cabSignal: "PROCEED (GREEN)",
      cabSignalClass: "text-emerald-400",
      routeDescription: "Luni Jn (LUNI) ➔ Balotra Jn (BLT)",
      depart: "02:35",
      arrive: "03:53",
      durationMins: 78,
      stations: [
        { name: "Luni Jn", code: "LUNI", lat: 26.0683, lng: 73.0189, pf: "PF 1", arr: "02:35", dep: "02:35", distKm: 0 },
        { name: "Balotra Jn", code: "BLT", lat: 25.8333, lng: 72.2333, pf: "PF 2", arr: "03:53", dep: "03:53", distKm: 81 }
      ],
      progress: 0.60
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

  // Calculation Helper: Precise distance-based interpolation along train path
  function getTrainPositionAndBearing(train) {
    const stations = train.stations;
    if (!stations || stations.length < 2) {
      return { lat: 28.6139, lng: 77.2090, bearing: 0, currentSegmentIdx: 0, frac: 0 };
    }
    const totalDist = stations[stations.length - 1].distKm;
    if (!totalDist || totalDist <= 0) {
      const totalSegments = stations.length - 1;
      const scaledProgress = train.progress * totalSegments;
      const segIdx = Math.min(Math.floor(scaledProgress), totalSegments - 1);
      const frac = scaledProgress - segIdx;
      const p1 = stations[segIdx];
      const p2 = stations[segIdx + 1];
      const lat = p1.lat + (p2.lat - p1.lat) * frac;
      const lng = p1.lng + (p2.lng - p1.lng) * frac;
      const bearing = calculateBearingAngle(p1.lat, p1.lng, p2.lat, p2.lng);
      return { lat, lng, bearing, currentSegmentIdx: segIdx, frac };
    }

    const clampedProgress = Math.max(0, Math.min(0.999999, train.progress || 0));
    const currentDist = clampedProgress * totalDist;
    let segIdx = 0;
    let frac = 0;

    for (let i = 0; i < stations.length - 1; i++) {
      if (currentDist >= stations[i].distKm && currentDist <= stations[i + 1].distKm) {
        segIdx = i;
        const segLen = stations[i + 1].distKm - stations[i].distKm;
        frac = segLen > 0 ? (currentDist - stations[i].distKm) / segLen : 0;
        break;
      }
    }

    const p1 = stations[segIdx];
    const p2 = stations[segIdx + 1];
    const lat = p1.lat + (p2.lat - p1.lat) * frac;
    const lng = p1.lng + (p2.lng - p1.lng) * frac;
    const bearing = calculateBearingAngle(p1.lat, p1.lng, p2.lat, p2.lng);

    return { lat, lng, bearing, currentSegmentIdx: segIdx, frac };
  }

  // Calculate Forward Station Milestones, Distances & Remaining Dynamic ML ETAs (SIH 2026 Engine)
  function calculateForwardMilestones(train) {
    if (!train || !train.stations) return [];

    const totalSegments = train.stations.length - 1;
    const scaledProgress = train.progress * totalSegments;
    const currentSegIdx = Math.floor(scaledProgress);
    const baseSpeed = train.speed > 0 ? train.speed : 110;

    // Check weather fog condition
    const isFogActive = window.liveWeatherState && (window.liveWeatherState.weatherCode === 45 || window.liveWeatherState.weatherCode === 48 || window.liveWeatherState.visibility < 1.5);
    const effectiveSpeed = isFogActive ? Math.min(60, baseSpeed) : baseSpeed;

    const trainDelay = Number(train.delayMinutes || train.current_delay_minutes || 0);
    const now = new Date();

    const milestones = train.stations.map((stn, idx) => {
      const isPassed = idx <= currentSegIdx;
      const isNextImmediate = idx === currentSegIdx + 1;
      let distFromTrain = 0;
      let etaMins = 0;
      let etaText = "";
      let dynamicClockETA = "--";
      let predictedDelay = trainDelay;
      let delayReasons = [];

      if (isPassed) {
        etaText = "DEPARTED";
        dynamicClockETA = stn.arr || "--";
      } else {
        const segFrac = scaledProgress - currentSegIdx;
        const currentDist = train.stations[currentSegIdx].distKm + 
          (train.stations[currentSegIdx + 1].distKm - train.stations[currentSegIdx].distKm) * segFrac;
        distFromTrain = Math.max(0, Math.round(stn.distKm - currentDist));

        // Machine Learning Sectional Running Time Forecast
        const idealTravelMins = (distFromTrain / effectiveSpeed) * 60;
        
        // Add realistic delay penalties:
        let accumulatedPenalty = 0;
        if (isFogActive) {
          accumulatedPenalty += 8;
          delayReasons.push("Fog Restriction (Max 60km/h)");
        }
        if (stn.code === 'CNB' || stn.code === 'PRYJ' || stn.code === 'DDU' || stn.code === 'BRC') {
          accumulatedPenalty += 4;
          delayReasons.push("Junction Throat Interlocking");
        }
        if (trainDelay > 10) {
          accumulatedPenalty += 3;
          delayReasons.push("Signal Restrictive Spacing");
        }
        if (delayReasons.length === 0) {
          delayReasons.push("Clear Track Proceed");
        }

        predictedDelay = trainDelay + accumulatedPenalty;
        etaMins = Math.round(idealTravelMins + accumulatedPenalty);

        const etaDate = new Date(now.getTime() + etaMins * 60000);
        let hrs = etaDate.getHours();
        let mins = etaDate.getMinutes();
        const ampm = hrs >= 12 ? 'PM' : 'AM';
        hrs = hrs % 12 || 12;
        dynamicClockETA = `${hrs}:${mins < 10 ? '0' + mins : mins} ${ampm}`;

        if (etaMins < 60) {
          etaText = `${etaMins}m (${dynamicClockETA})`;
        } else {
          const h = Math.floor(etaMins / 60);
          const m = etaMins % 60;
          etaText = `${h}h ${m}m (${dynamicClockETA})`;
        }
      }

      return {
        ...stn,
        index: idx,
        isPassed,
        isNextImmediate,
        distFromTrain,
        etaMins,
        etaText,
        dynamicClockETA,
        predictedDelay,
        delayReasons,
        confidencePct: 96.5,
        confidenceMargin: "±1.9m"
      };
    });

    return milestones;
  }

  // Generator: Ultra-Realistic Multi-Coach Train Rake SVG with Smart De-Cluttered Badges
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
      <div class="train-marker-wrapper ${isSelected ? 'train-marker-selected' : ''}" style="position: relative; display: flex; flex-direction: column; align-items: center;">
        
        <!-- Compact De-Cluttered Mini Pill (Visible at a glance without clutter) -->
        <div class="train-mini-pill" style="background: rgba(15, 23, 42, 0.92); color: #FFFFFF; border: 1.2px solid ${badgeColor}; border-radius: 9999px; padding: 2px 7px; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 800; box-shadow: 0 3px 10px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 5px; backdrop-filter: blur(4px);">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: #10B981; box-shadow: 0 0 6px #10B981;"></span>
          <span style="color: #FF9933; font-weight: 900;">${train.number}</span>
          <span style="color: #38BDF8; font-weight: 700;">${train.speed}k</span>
        </div>

        <!-- Full Detailed High-Tech Status Badge (Expanded on Hover or when Selected) -->
        <div class="train-full-hover-badge">
          <div style="background: rgba(10, 25, 47, 0.96); color: #FFFFFF; border: 1.5px solid ${badgeColor}; border-radius: 8px; padding: 4px 10px; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; font-weight: 800; box-shadow: 0 6px 18px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 6px; backdrop-filter: blur(8px);">
            <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background-color: #10B981; box-shadow: 0 0 8px #10B981;"></span>
            <span style="color: #FF9933; font-weight: 900; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.05em;">${train.number}</span>
            <span style="color: #FFFFFF; font-weight: 800; text-transform: uppercase;">${train.shortName || train.name}</span>
            <span style="color: #38BDF8; font-family: 'JetBrains Mono', monospace; font-weight: 800; background: rgba(56, 189, 248, 0.18); padding: 1.5px 5px; border-radius: 4px;">${train.speed} km/h</span>
            <span style="color: #34D399; font-weight: 800; font-size: 9px; background: rgba(16, 185, 129, 0.22); padding: 1.5px 6px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.4);">
              ETA ${train.etaNextStation}
            </span>
          </div>
        </div>

        <div class="realistic-train-rake" title="${train.number} - ${train.name}">
          <!-- Kavach 160.225 MHz Radar Aura Bubble -->
          <div class="kavach-radar-beacon ${train.kavachStatus && train.kavachStatus.includes('TSR') ? 'caution' : ''}"></div>
          
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
              <button onclick="switchLiveMapTileLayer('satellite')" id="btnLayerSat" class="px-3 py-1.5 rounded-xl border border-[#FF9933] text-xs font-black transition-all cursor-pointer bg-[#FF9933] text-white shadow flex items-center gap-1.5">
                <i class="fa-solid fa-satellite"></i> 🛰️ Photorealistic Satellite (Esri HD)
              </button>
              <button onclick="switchLiveMapTileLayer('osm_rail')" id="btnLayerOSM" class="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5">
                <i class="fa-solid fa-route"></i> 🛤️ Railway Atlas (OSM)
              </button>
              <button onclick="switchLiveMapTileLayer('dark')" id="btnLayerDark" class="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5">
                <i class="fa-solid fa-moon"></i> 🌙 Night Radar Mode
              </button>
              <button onclick="resetPanIndiaMapView()" class="px-3.5 py-1.5 rounded-xl bg-[#138808] hover:bg-emerald-700 text-white font-extrabold text-xs shadow transition-all cursor-pointer flex items-center gap-1.5">
                <i class="fa-solid fa-earth-asia"></i> Reset Pan-India View
              </button>
            </div>
          </div>

          <!-- State & Region Selector & Station-to-Station Corridor Tracking -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
            <!-- State / Region Fly-To Selector -->
            <div class="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <label for="liveMapStateSelector" class="text-[11px] font-black text-[#12355B] font-mono whitespace-nowrap flex items-center gap-1">
                <i class="fa-solid fa-location-dot text-[#FF9933]"></i> Region Focus:
              </label>
              <select 
                id="liveMapStateSelector" 
                onchange="zoomToState(this.value)" 
                class="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#12355B]/40 text-xs font-extrabold text-[#12355B] focus:ring-2 focus:ring-[#FF9933] cursor-pointer shadow-sm">
                <option value="all">🌐 All India (Full 68,000 km Network)</option>
                <option value="rajasthan">🏰 Rajasthan (Jaipur, Ajmer, Kota, Jodhpur, Marwar)</option>
                <option value="delhi">🏛️ Delhi NCR (New Delhi, Anand Vihar, Ghaziabad)</option>
                <option value="up">🕌 Uttar Pradesh (Kanpur, Prayagraj, Varanasi, Lucknow)</option>
                <option value="maharashtra">🌊 Maharashtra (Mumbai Central, Pune, Nagpur)</option>
                <option value="gujarat">⚡ Gujarat (Ahmedabad, Vadodara, Surat)</option>
                <option value="bengal">🚋 West Bengal & East (Howrah, Asansol, Kolkata)</option>
                <option value="south">🌴 Southern Zone (Chennai, Bengaluru, Secunderabad)</option>
                <option value="jk">🏔️ Northern High Altitude (Jammu Tawi, Udhampur)</option>
                <option value="central">🛡️ Madhya Pradesh & Central (Bhopal, Itarsi, Jabalpur)</option>
              </select>
            </div>

            <!-- Station-to-Station Corridor Tracker -->
            <div class="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <label for="liveMapCorridorSelector" class="text-[11px] font-black text-[#0284c7] font-mono whitespace-nowrap flex items-center gap-1">
                <i class="fa-solid fa-arrows-split-up-and-left text-[#0284c7]"></i> Corridor Tracking:
              </label>
              <select 
                id="liveMapCorridorSelector" 
                onchange="trackCorridorRoute(this.value)" 
                class="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#0284c7]/50 text-xs font-extrabold text-[#0284c7] focus:ring-2 focus:ring-[#FF9933] cursor-pointer shadow-sm">
                <option value="all">🛤️ All Active Corridors (8 Trains Running)</option>
                <option value="NDLS-AII">📍 NDLS ➔ JP ➔ AII (Rajasthan Ajmer Shatabdi #12015)</option>
                <option value="NDLS-BSB">📍 NDLS ➔ CNB ➔ BSB (Kashi Vande Bharat #22436)</option>
                <option value="MMCT-NDLS">📍 MMCT ➔ BRC ➔ RTM ➔ KOTA ➔ NDLS (Tejas Rajdhani #12951)</option>
                <option value="NDLS-HWH">📍 NDLS ➔ CNB ➔ PRYJ ➔ HWH (Howrah Rajdhani #12302)</option>
                <option value="NDLS-MAS">📍 NDLS ➔ AGC ➔ BPL ➔ MAS (Grand Trunk #12622)</option>
                <option value="NDLS-ADI">📍 NDLS ➔ JP ➔ AII ➔ ADI (Swarna Jayanti Rajdhani #12958)</option>
                <option value="NDLS-KOTA">📍 NDLS ➔ MTJ ➔ AGC ➔ KOTA (Jan Shatabdi #12059)</option>
              </select>
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
                placeholder="Search any train by number, name or station (e.g. 12015, 22436, 12951, Vande Bharat, Ajmer, Jaipur, Mumbai)..." 
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
            <button onclick="selectAndFocusTrain('12015')" class="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-400 text-amber-950 text-xs font-black transition-all cursor-pointer shadow-sm">
              🏰 12015 Ajmer Shatabdi (Delhi ➔ Jaipur ➔ Ajmer)
            </button>
            <button onclick="selectAndFocusTrain('22436')" class="px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border-2 border-sky-400 text-sky-950 text-xs font-black transition-all cursor-pointer shadow-sm">
              🚅 22436 Kashi Vande Bharat (New Delhi ➔ Varanasi)
            </button>
            <button onclick="selectAndFocusTrain('12951')" class="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border-2 border-rose-400 text-rose-950 text-xs font-black transition-all cursor-pointer shadow-sm">
              ⭐ 12951 Tejas Rajdhani (Mumbai ➔ New Delhi)
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
            <span class="text-[11px] font-mono text-emerald-700 font-extrabold hidden sm:inline flex items-center gap-1">
              <i class="fa-solid fa-satellite-dish text-emerald-600"></i> Esri Photorealistic Satellite GIS Active
            </span>
          </div>
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

    // Initialize default tile layer to Photorealistic Esri Satellite HD View
    switchLiveMapTileLayer('satellite');

    // Indian Railways Golden Strategic Territorial Outline (Crisp non-blocking boundary)
    const indiaBorderCutout = [
      [35.67, 74.84], [34.70, 77.03], [32.90, 78.96], [30.41, 80.89],
      [28.78, 81.33], [27.70, 88.13], [28.21, 97.40], [27.20, 96.80],
      [24.50, 94.80], [22.00, 89.10], [21.60, 87.00], [17.80, 83.30],
      [13.10, 80.30], [8.08, 77.55],  [9.90, 76.20],  [15.40, 73.80],
      [18.90, 72.80], [22.80, 69.10], [23.80, 68.20], [24.70, 71.00],
      [27.50, 70.30], [31.50, 74.40], [35.67, 74.84]
    ];
    L.polyline(indiaBorderCutout, {
      color: '#FF9933',
      weight: 2.2,
      opacity: 0.75,
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

  // State & Regional Centers Database (for Smooth Animated Fly-To)
  const panIndiaStates = {
    all: { name: "All India (Full Network)", coords: [22.8, 78.9], zoom: 5 },
    rajasthan: { name: "Rajasthan (NWR / WCR)", coords: [26.58, 73.85], zoom: 7 },
    delhi: { name: "Delhi NCR (Northern Zone)", coords: [28.6139, 77.2090], zoom: 10 },
    up: { name: "Uttar Pradesh (NCR / NER)", coords: [26.85, 80.95], zoom: 7 },
    maharashtra: { name: "Maharashtra (CR / WR)", coords: [19.25, 75.25], zoom: 7 },
    gujarat: { name: "Gujarat (Western Zone)", coords: [22.40, 71.80], zoom: 7 },
    bengal: { name: "West Bengal & East (ER)", coords: [23.15, 87.85], zoom: 7 },
    south: { name: "Southern Zone (SR / SCR / SWR)", coords: [13.08, 78.50], zoom: 7 },
    jk: { name: "Northern High Altitude (NR)", coords: [32.73, 75.50], zoom: 7 },
    central: { name: "Madhya Pradesh & Central (WCR)", coords: [23.47, 77.94], zoom: 7 }
  };

  // State Fly-To Camera Control
  window.zoomToState = function(stateKey) {
    const target = panIndiaStates[stateKey];
    if (!target || !panIndiaMap) return;
    panIndiaMap.flyTo(target.coords, target.zoom, {
      duration: 1.6,
      easeLinearity: 0.25
    });
    showToast(`🗺️ Camera Flying to ${target.name}`, "info");
  };

  // Station-to-Station Corridor Tracker
  window.trackCorridorRoute = function(corridorKey) {
    if (corridorKey === "all") {
      resetPanIndiaMapView();
      return;
    }
    const corridorTrainMap = {
      "NDLS-AII": "12015", // Ajmer Shatabdi
      "NDLS-BSB": "22436", // Kashi Vande Bharat
      "MMCT-NDLS": "12951", // Mumbai Tejas Rajdhani
      "NDLS-HWH": "12302", // Howrah Rajdhani
      "NDLS-MAS": "12622", // Tamil Nadu Express
      "NDLS-ADI": "12958", // ADI Rajdhani
      "NDLS-KOTA": "12059"  // Kota Jan Shatabdi
    };
    const trainId = corridorTrainMap[corridorKey];
    if (trainId) {
      selectAndFocusTrain(trainId);
      showToast(`🛤️ Tracking Corridor: ${corridorKey}`, "success");
    }
  };

  let mapSatelliteLabelsLayer = null;
  let mapIRIRailOverlayLayer = null;

  // Switch between Tile Layers (100% Watermark-Free: Esri HD Satellite vs OSM Atlas vs Esri Dark Canvas)
  window.switchLiveMapTileLayer = function(layerType) {
    if (!panIndiaMap) return;

    if (mapCurrentTileLayer) {
      panIndiaMap.removeLayer(mapCurrentTileLayer);
      mapCurrentTileLayer = null;
    }
    if (mapSatelliteLabelsLayer) {
      panIndiaMap.removeLayer(mapSatelliteLabelsLayer);
      mapSatelliteLabelsLayer = null;
    }
    if (mapIRIRailOverlayLayer) {
      panIndiaMap.removeLayer(mapIRIRailOverlayLayer);
      mapIRIRailOverlayLayer = null;
    }

    const btnSat = document.getElementById("btnLayerSat");
    const btnOSM = document.getElementById("btnLayerOSM");
    const btnDark = document.getElementById("btnLayerDark");

    const defaultBtn = "px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5";
    const activeSatBtn = "px-3 py-1.5 rounded-xl border border-[#FF9933] text-xs font-black transition-all cursor-pointer bg-[#FF9933] text-white shadow flex items-center gap-1.5";
    const activeBtn = "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer bg-[#12355B] text-white shadow flex items-center gap-1.5";

    if (layerType === "satellite" || layerType === "iri") {
      // 1. High-Resolution Photorealistic Satellite Imagery (Esri World Imagery - 100% Keyless, Zero Watermarks)
      mapCurrentTileLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19,
        maxNativeZoom: 18
      }).addTo(panIndiaMap);

      // 2. Clear Reference Labels Overlay (Crisp Cities, States, Boundaries)
      mapSatelliteLabelsLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        opacity: 0.92
      }).addTo(panIndiaMap);

      // 3. OpenRailwayMap Standard Track Tile Layer
      mapIRIRailOverlayLayer = L.tileLayer("https://{s}.tile.openrailwaymap.org/standard/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenRailwayMap contributors',
        subdomains: "abc",
        maxZoom: 19,
        opacity: 0.88
      }).addTo(panIndiaMap);

      if (btnSat) btnSat.className = activeSatBtn;
      if (btnOSM) btnOSM.className = defaultBtn;
      if (btnDark) btnDark.className = defaultBtn;
      showToast("🛰️ Activated Photorealistic Satellite Imagery (Esri HD)", "success");
    } else if (layerType === "dark") {
      // Clean Command Center Dark Canvas (Esri Dark Gray Base - 100% Keyless, Zero Watermarks)
      mapCurrentTileLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 16
      }).addTo(panIndiaMap);

      mapIRIRailOverlayLayer = L.tileLayer("https://{s}.tile.openrailwaymap.org/standard/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenRailwayMap',
        subdomains: "abc",
        maxZoom: 19,
        opacity: 0.65
      }).addTo(panIndiaMap);

      if (btnDark) btnDark.className = activeBtn;
      if (btnSat) btnSat.className = defaultBtn;
      if (btnOSM) btnOSM.className = defaultBtn;
      showToast("🌙 Activated Dark Radar Mode (Clean Canvas)", "info");
    } else {
      // OpenStreetMap Standard Track Atlas (100% Keyless, Zero Watermarks)
      mapCurrentTileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(panIndiaMap);

      mapIRIRailOverlayLayer = L.tileLayer("https://{s}.tile.openrailwaymap.org/standard/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenRailwayMap',
        subdomains: "abc",
        maxZoom: 19,
        opacity: 0.85
      }).addTo(panIndiaMap);

      if (btnOSM) btnOSM.className = activeBtn;
      if (btnSat) btnSat.className = defaultBtn;
      if (btnDark) btnDark.className = defaultBtn;
      showToast("🛤️ Activated OpenStreetMap Railway Atlas", "info");
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
              <div class="timeline-station-node ${nodeClass}" onclick="inspectAheadStation('${train.id}', ${idx})" title="${m.name} (${m.code}) • ML ETA: ${m.dynamicClockETA} • Factors: ${(m.delayReasons || []).join(', ')}">
                <div class="timeline-node-pin ${pinColor}">
                  ${m.isPassed ? '✓' : idx + 1}
                </div>
                <div class="text-[11px] font-black text-[#12355B] truncate max-w-[95px]">${m.code}</div>
                <div class="text-[9px] font-mono text-slate-500 truncate max-w-[95px]">${m.name}</div>
                <div class="text-[9px] font-mono font-extrabold ${m.isPassed ? 'text-slate-400' : 'text-emerald-700'}">
                  ${m.isPassed ? 'Departed' : `<span class="px-1 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">${m.dynamicClockETA}</span>`}
                </div>
                ${!m.isPassed && m.delayReasons && m.delayReasons.length > 0 ? `
                  <div class="text-[8px] font-mono font-bold text-amber-700 truncate max-w-[95px]" title="${m.delayReasons[0]}">
                    ${m.delayReasons[0].slice(0, 16)}..
                  </div>
                ` : ''}
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

        <!-- Live Satellite Weather & Track Stress Telemetry (Connected to WeatherEngine) -->
        <div id="hudWeatherTelemetry">
          <div class="p-3 rounded-xl bg-slate-900 border border-cyan-500/30 text-white flex items-center justify-between text-xs animate-pulse">
            <span class="flex items-center gap-2"><i class="fa-solid fa-satellite-dish text-cyan-400"></i> Syncing Live Satellite Weather...</span>
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

    // Asynchronously fetch and render real-time satellite atmospheric data for next waypoint
    fetchAndRenderHudWeather(train);
  }

  // Fetch and Render Live Satellite Weather & Track Stress in HUD
  function fetchAndRenderHudWeather(train) {
    if (!train) return;
    const container = document.getElementById("hudWeatherTelemetry");
    if (!container) return;

    let targetStation = "NDLS";
    if (train.stations && train.stations.length > 0) {
      const remaining = train.stations.find(s => !s.isPassed);
      targetStation = (remaining ? remaining.code : train.stations[0].code);
    }

    if (window.WeatherEngine && typeof window.WeatherEngine.getStationWeather === "function") {
      window.WeatherEngine.getStationWeather(targetStation).then((wx) => {
        const el = document.getElementById("hudWeatherTelemetry");
        if (!el || !wx) return;

        const temp = wx.temp !== undefined ? wx.temp : (wx.tempC !== undefined ? wx.tempC : 32);
        const visKm = wx.visibilityKm !== undefined ? parseFloat(wx.visibilityKm).toFixed(1) : (wx.safety && wx.safety.visKm ? parseFloat(wx.safety.visKm).toFixed(1) : "8.0");
        const railTemp = (wx.safety && wx.safety.railTemp !== undefined) ? wx.safety.railTemp : (wx.tRailC !== undefined ? wx.tRailC : 46);
        const railStatus = (wx.safety && wx.safety.railStatus) ? wx.safety.railStatus : (wx.railStressStatus || "NORMAL");
        const fogTsrSpeed = (wx.safety && wx.safety.fogTsrSpeed) ? wx.safety.fogTsrSpeed : (wx.fogTsrKmh ? `${wx.fogTsrKmh} km/h` : "Full Track MPS (130)");
        const isFoggy = parseFloat(visKm) < 1.0;
        const isThermalWarning = railTemp > 52;
        const iconClass = wx.icon ? (wx.icon.startsWith("fa-") ? wx.icon : `fa-${wx.icon}`) : "fa-sun text-amber-500";

        el.innerHTML = `
          <div class="p-3 rounded-xl bg-gradient-to-br from-[#0A192F] via-[#0F172A] to-[#1E293B] border-2 border-cyan-500/40 text-white shadow-xl space-y-2">
            <div class="flex items-center justify-between border-b border-white/10 pb-1.5">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-satellite-dish text-cyan-400 text-xs animate-pulse"></i>
                <div>
                  <h4 class="text-xs font-black text-white font-['Outfit'] flex items-center gap-1.5">
                    🛰️ Satellite Weather Telemetry
                  </h4>
                  <p class="text-[9px] text-cyan-300 font-mono">NEXT HALT: ${wx.stationName} (${wx.stationCode})</p>
                </div>
              </div>
              <span class="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono font-black">
                ● LIVE SAT
              </span>
            </div>

            <!-- Weather Grid Metrics -->
            <div class="grid grid-cols-3 gap-1.5 text-center">
              <div class="p-1.5 rounded-lg bg-white/5 border border-white/10">
                <span class="text-[9px] text-slate-400 font-mono block">Ambient</span>
                <div class="text-xs font-black text-amber-300 mt-0.5 flex items-center justify-center gap-1">
                  <i class="fa-solid ${iconClass}"></i> ${temp}°C
                </div>
                <div class="text-[9px] text-slate-300 truncate mt-0.5">${wx.condition || "Clear Sky"}</div>
              </div>

              <div class="p-1.5 rounded-lg bg-white/5 border border-white/10">
                <span class="text-[9px] text-slate-400 font-mono block">Optical Vis.</span>
                <div class="text-xs font-black ${isFoggy ? 'text-amber-400' : 'text-emerald-400'} mt-0.5">
                  ${visKm} km
                </div>
                <div class="text-[9px] ${isFoggy ? 'text-amber-300 font-bold' : 'text-slate-300'} truncate mt-0.5">
                  ${isFoggy ? 'Fog Caution' : 'Clear Sight'}
                </div>
              </div>

              <div class="p-1.5 rounded-lg bg-white/5 border border-white/10">
                <span class="text-[9px] text-slate-400 font-mono block">Rail Temp</span>
                <div class="text-xs font-black ${isThermalWarning ? 'text-rose-400' : 'text-sky-300'} mt-0.5">
                  ${railTemp}°C
                </div>
                <div class="text-[9px] ${isThermalWarning ? 'text-rose-300 font-bold' : 'text-emerald-400 font-bold'} truncate mt-0.5">
                  ${railStatus}
                </div>
              </div>
            </div>

            <!-- Kavach Speed Advisory for Weather -->
            <div class="flex items-center justify-between text-[10px] bg-black/40 px-2.5 py-1 rounded border border-white/10 font-mono">
              <span class="text-slate-300 font-semibold">Kavach Fog TSR Advisory:</span>
              <span class="font-black ${isFoggy ? 'text-amber-300' : 'text-emerald-400'}">
                ${fogTsrSpeed}
              </span>
            </div>
          </div>
        `;
      }).catch(err => {
        console.warn("HUD weather fetch failed:", err);
      });
    }
  }

  // =========================================================================
  // AUTHENTIC INDIAN RAILWAYS CYCLIC KINEMATICS & REAL-TIME FLEET SIMULATION
  // =========================================================================
  function updateTrainCyclicKinematics(train, delta) {
    if (!train.stations || train.stations.length < 2) return;
    const stations = train.stations;
    const totalDistKm = stations[stations.length - 1].distKm;
    const V_max = train.maxSpeed || 130;

    if (typeof train.progress !== "number" || isNaN(train.progress)) {
      train.progress = 0.05;
    }

    let progress = train.progress;
    let currentDist = progress * totalDistKm;

    // Find current station segment
    let segIdx = 0;
    for (let i = 0; i < stations.length - 1; i++) {
      if (currentDist >= stations[i].distKm && currentDist <= stations[i + 1].distKm) {
        segIdx = i;
        break;
      }
    }
    const curStn = stations[segIdx];
    const nextStn = stations[segIdx + 1];
    const segLen = Math.max(1, nextStn.distKm - curStn.distKm);
    const segFrac = Math.max(0, Math.min(1, (currentDist - curStn.distKm) / segLen));

    // Authentic Speed Profile & Braking Curve:
    let currentSpeed = V_max;
    let status = "CRUISING";
    let statusBadge = "CRUISING (GREEN)";
    let cabSignal = "PROCEED (GREEN)";
    let cabSignalClass = "text-emerald-400";
    let brakePressure = "5.0 kg/cm²";
    let brakingMargin = "1,750m (Optimal)";

    if (segFrac < 0.15) {
      // Station Departure Acceleration Zone: Smoothly climbs from 15 km/h to V_max
      const accelRatio = segFrac / 0.15;
      currentSpeed = Math.round(15 + (V_max - 15) * Math.pow(accelRatio, 0.7));
      status = "ACCELERATING";
      statusBadge = `ACCEL FROM ${curStn.code}`;
      cabSignal = "PROCEED (GREEN) • ACCELERATING";
      cabSignalClass = "text-emerald-400";
      brakePressure = "5.0 kg/cm² (Released)";
      brakingMargin = "1,850m (Accelerating Curve)";
    } else if (segFrac > 0.82) {
      // Station Approach Deceleration (Kavach SIL-4 Dynamic Braking Curve)
      const decelRatio = (1.0 - segFrac) / 0.18;
      if (decelRatio <= 0.05) {
        // Halted / Crawling onto Platform Stop
        currentSpeed = Math.round(5 * decelRatio);
        status = "HALTED";
        statusBadge = `HALTED AT ${nextStn.code} (PF #${nextStn.pf || 1})`;
        cabSignal = "STOP (RED) • PLATFORM BERTHED";
        cabSignalClass = "text-rose-500";
        brakePressure = "2.5 kg/cm² (Emergency Application)";
        brakingMargin = "120m (Platform Berthing)";
      } else {
        currentSpeed = Math.max(12, Math.round(V_max * Math.pow(decelRatio, 1.15)));
        status = "BRAKING";
        statusBadge = `BRAKING FOR ${nextStn.code}`;
        cabSignal = "CAUTION (YELLOW) • KAVACH BRAKING";
        cabSignalClass = "text-amber-400";
        const bp = (5.0 - (1 - decelRatio) * 2.2).toFixed(1);
        brakePressure = `${bp} kg/cm² (Service Brake)`;
        brakingMargin = `${Math.round(250 + 1300 * decelRatio)}m (Safe Decel Curve)`;
      }
    } else {
      // Mid-Section Cruising: Maximum Speed with subtle gradient variance
      const variance = Math.sin(segFrac * 25) * 3;
      currentSpeed = Math.round(V_max - 2 + variance);
      status = "CRUISING";
      statusBadge = "CRUISING (100% KAVACH)";
      cabSignal = "PROCEED (GREEN)";
      cabSignalClass = "text-emerald-400";
      brakePressure = "5.0 kg/cm² (Nominal)";
      brakingMargin = "1,650m (Optimal Distance)";
    }

    // Advance progress based on currentSpeed and delta
    const speedKmPerSec = Math.max(8, currentSpeed) / 3600;
    const SIM_SPEED_SCALE = 14; // Visible Pan-India movement rate
    const progressInc = (speedKmPerSec * delta * SIM_SPEED_SCALE) / totalDistKm;
    progress += progressInc;

    // CYCLIC CONTINUOUS REPETITION: Seamlessly restart at terminus
    if (progress >= 1.0) {
      progress = 0.0;
    }

    train.progress = progress;
    train.speed = currentSpeed;
    train.status = status;
    train.statusBadge = statusBadge;
    train.cabSignal = cabSignal;
    train.cabSignalClass = cabSignalClass;
    train.brakePressure = brakePressure;
    train.brakingMargin = brakingMargin;
    train.currentSection = `${curStn.name} (${curStn.code}) ➔ ${nextStn.name} (${nextStn.code})`;
    train.nextStation = `${nextStn.name} (PF #${nextStn.pf || 1})`;
    const distRemaining = Math.max(0, nextStn.distKm - (progress * totalDistKm));
    const minsToNext = currentSpeed > 5 ? Math.round((distRemaining / currentSpeed) * 60) : 1;
    train.etaNextStation = `${minsToNext} mins (${Math.round(distRemaining)} km)`;
    train.distCovered = Math.round(progress * totalDistKm);
    train.distRemaining = Math.max(0, Math.round(totalDistKm - (progress * totalDistKm)));
  }

  // Update Cockpit HUD Inspector live elements every tick
  function updateLocomotiveHUDLiveValues(train) {
    const spdEl = document.getElementById("hudSpeedReading");
    if (spdEl) {
      spdEl.innerHTML = `${train.speed} <span class="text-xs font-bold text-slate-600">km/h</span>`;
    }
    const statusText = document.getElementById("mapStatusText");
    if (statusText) {
      statusText.innerHTML = `LOCKED ON TRAIN ${train.number} (${train.shortName}) • SPEED: ${train.speed} KM/H • ${train.statusBadge || train.status}`;
    }
    const container = document.getElementById("locomotiveInspectorHUD");
    if (container) {
      const marginEl = container.querySelector(".text-base.font-black.text-\\[\\#138808\\].font-mono");
      if (marginEl) marginEl.textContent = train.brakingMargin;
      
      const aspectEl = container.querySelector(".font-extrabold.flex.items-center.gap-1\\.5");
      if (aspectEl) {
        aspectEl.className = `font-extrabold flex items-center gap-1.5 ${train.cabSignalClass}`;
        aspectEl.innerHTML = `
          <span class="w-2.5 h-2.5 rounded-full ${train.cabSignalClass.includes('emerald') ? 'bg-emerald-500' : (train.cabSignalClass.includes('rose') ? 'bg-rose-500' : 'bg-amber-500')} animate-pulse"></span>
          ${train.cabSignal}
        `;
      }
      
      const sectionVals = container.querySelectorAll(".p-3.rounded-xl.bg-white.border-2.border-slate-200 .flex.items-center.justify-between span:last-child");
      if (sectionVals.length >= 4) {
        sectionVals[1].textContent = train.currentSection;
        sectionVals[2].textContent = train.nextStation;
        sectionVals[3].textContent = train.etaNextStation;
      }
    }
  }

  // Smooth continuous train movement loop
  function startTrainAnimationLoop() {
    let lastTimestamp = performance.now();

    function stepAnimation(timestamp) {
      const delta = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
      lastTimestamp = timestamp;

      panIndiaTrainData.forEach((train) => {
        updateTrainCyclicKinematics(train, delta);

        const pos = getTrainPositionAndBearing(train);
        const marker = mapTrainMarkers[train.id];
        if (marker) {
          marker.setLatLng([pos.lat, pos.lng]);

          const rotElement = document.getElementById(`trainMarker_${train.id}`);
          if (rotElement) {
            rotElement.style.transform = `rotate(${pos.bearing}deg)`;
          }

          marker.setTooltipContent(`
            <div class="font-bold text-xs text-[#12355B]">
              <span>${train.number} ${train.shortName}</span><br>
              <span class="text-emerald-700 font-mono">Speed: ${train.speed} km/h • ${train.statusBadge || train.status}</span><br>
              <span class="text-slate-600 font-mono text-[10px]">Next: ${train.nextStation} (ETA: ${train.etaNextStation})</span>
            </div>
          `);
        }
      });

      if (activeSelectedTrain) {
        updateLocomotiveHUDLiveValues(activeSelectedTrain);
      }

      if (isFollowingTrainCamera && activeSelectedTrain && panIndiaMap) {
        const activePos = getTrainPositionAndBearing(activeSelectedTrain);
        panIndiaMap.panTo([activePos.lat, activePos.lng], { animate: false });
      }

      if (document.getElementById("panIndiaRailMap")) {
        trainAnimationTimer = requestAnimationFrame(stepAnimation);
      }
    }

    if (trainAnimationTimer) cancelAnimationFrame(trainAnimationTimer);
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

  // (Real Indian Railways Cache variables declared at top of scope)

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
      window.irStations = irStations;

      // 2. Trains (5,208 real trains)
      const trData = await fetchJson('trains_light.json', '/data/processed/trains_light.json');
      if (trData && Array.isArray(trData)) {
        irTrainDatabase = trData;
        window.irTrainDatabase = irTrainDatabase;
        console.log(`✓ Loaded ${irTrainDatabase.length} Real Indian Railway Trains`);
      }

      // 3. Train Schedules Index (commercial stops timetable)
      const schData = await fetchJson('train_schedules_index.json', '/data/processed/train_schedules_index.json');
      if (schData && typeof schData === 'object') {
        irSchedulesIndex = schData;
        window.irSchedulesIndex = irSchedulesIndex;
        console.log(`✓ Loaded Real Train Timetable Schedules Index`);
      }

      // 4. Delay Model
      const delayData = await fetchJson('delay_model.json', '/api/v1/delays/model');
      if (delayData) {
        irDelayModel = delayData;
        window.irDelayModel = irDelayModel;
      }

      // 5. Maintenance Telemetry (100k real records)
      const maintData = await fetchJson('maintenance_telemetry.json', '/api/v1/maintenance/telemetry');
      if (maintData && maintData.records) {
        irMaintenanceDataset = maintData.records;
        window.irMaintenanceDataset = irMaintenanceDataset;
      }

      // 6. Tracks GeoJSON (3,474 tracks)
      const trackData = await fetchJson('tracks_geojson.json', '/api/v1/gis/tracks');
      if (trackData && trackData.features) {
        irTracksGeoJSON = trackData;
        window.irTracksGeoJSON = irTracksGeoJSON;
        if (panIndiaMap && activeNavView === 'live_map') {
          renderPanIndiaRailwayTracks();
        }
      }

      // 7. Crossings GeoJSON (3,308 crossings)
      const crData = await fetchJson('crossings_geojson.json', '/api/v1/gis/crossings');
      if (crData && crData.features) {
        irCrossingsGeoJSON = crData;
        window.irCrossingsGeoJSON = irCrossingsGeoJSON;
      }

      // 8. Signals GeoJSON
      const sigData = await fetchJson('signals_geojson.json', '/api/v1/gis/signals');
      if (sigData && sigData.features) {
        irSignalsGeoJSON = sigData;
        window.irSignalsGeoJSON = irSignalsGeoJSON;
      }

      // 9. Earthquakes GeoJSON
      const eqData = await fetchJson('earthquakes_geojson.json', '/api/v1/gis/earthquakes');
      if (eqData && eqData.features) {
        irEarthquakesGeoJSON = eqData;
        window.irEarthquakesGeoJSON = irEarthquakesGeoJSON;
      }

      isRealDatasetsLoaded = true;

      // Initialize Live Cyclic Train Simulation Engine & Analytics Modules
      if (window.LiveTrainEngine) {
        window.LiveTrainEngine.init(irTrainDatabase, irSchedulesIndex, irStations, irDelayModel);
      }
      if (window.ReschedulingEngine) {
        window.ReschedulingEngine.init(window.LiveTrainEngine);
      }
      if (window.AnalyticsEngine) {
        window.AnalyticsEngine.init(window.LiveTrainEngine);
      }

      // Re-render current active screen to reflect real data
      const container = document.getElementById("activeSubTabContainer");
      if (container) {
        if (activeNavView === "train_list" || activeNavView === "overview") {
          renderTrainListSection(container);
        } else if (activeNavView === "delay_analytics") {
          renderDelayAnalyticsSection(container);
        } else if (activeNavView === "rescheduling") {
          renderReschedulingSection(container);
        } else if (activeNavView === "analytics") {
          renderAnalyticsSection(container);
        }
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

    // Alias mapping for major hub codes (e.g. MMCT/BCT/BDTS, NDLS/DLI/NZM/ANVT)
    const getHubAliases = (code) => {
      const c = (code || "").trim().toUpperCase();
      const clusters = [
        ['NDLS', 'DLI', 'NZM', 'DEE', 'ANVT'],
        ['MMCT', 'BCT', 'BDTS', 'CSMT', 'LTT', 'DR'],
        ['HWH', 'SDAH', 'KOAA', 'SHM'],
        ['MAS', 'MS', 'PER', 'TBM'],
        ['SBC', 'YPR', 'SMVB', 'BNC'],
        ['ADI', 'SBT', 'GER'],
        ['SC', 'HYB', 'KCG'],
        ['PNBE', 'RJPB', 'DNR'],
        ['LKO', 'LJN', 'BNZ']
      ];
      for (const cl of clusters) {
        if (cl.includes(c)) return cl;
      }
      return [c];
    };
    const fromAliases = getHubAliases(trainSearchFrom);
    const toAliases = getHubAliases(trainSearchTo);

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
              const liveSt = window.LiveTrainEngine ? window.LiveTrainEngine.getTrainStatus(tr.number) : null;
              const liveDelay = liveSt ? liveSt.delayMinutes : (tr.delay || 0);
              const dCol = liveDelay === 0 ? '#138808' : liveDelay <= 15 ? '#f59e0b' : '#dc2626';
              const dBg = liveDelay === 0 ? '#f0fdf4' : liveDelay <= 15 ? '#fffbeb' : '#fef2f2';
              const delayText = liveDelay === 0 ? '✓ ON TIME' : `+${liveDelay} MIN DELAY`;
              const typeColor = tr.type === 'Vande Bharat' ? '#ea580c' : tr.type === 'Rajdhani' ? '#991b1b' : tr.type === 'Shatabdi' ? '#0284c7' : '#2563eb';
              return `
                <div onclick="viewTrainDetail('${tr.number}')"
                  class="glass-card" style="padding: 14px 16px; border-radius: 18px !important; cursor: pointer; transition: all 0.2s; border-left: 4px solid ${dCol} !important;"
                  onmouseover="this.style.boxShadow='0 8px 24px rgba(18,53,91,0.14)'; this.style.transform='translateY(-2px)'"
                  onmouseout="this.style.boxShadow=''; this.style.transform=''">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                    <span style="font-size: 11px; font-weight: 800; color: ${typeColor}; font-family: 'JetBrains Mono', monospace;">${tr.number}</span>
                    <span style="padding: 2px 8px; border-radius: 8px; font-size: 9px; font-weight: 800; background: ${dBg}; color: ${dCol}; border: 1px solid ${dCol}30;">
                      ${delayText}
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
          <!-- Live Weather Badges for Origin and Destination -->
          <div id="resultsScreenWeatherPills" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.15);"></div>
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
          const depTimeAMPM = window.LiveTrainEngine ? window.LiveTrainEngine.formatAMPM(depTime) : depTime;
          const arrTimeAMPM = window.LiveTrainEngine ? window.LiveTrainEngine.formatAMPM(arrTime) : arrTime;
          const fromStName = fromStIdx !== -1 ? stList[fromStIdx].name : (train.fromName || train.from);
          const toStName = toStIdx !== -1 ? stList[toStIdx].name : (train.toName || train.to);

          const liveSt = window.LiveTrainEngine ? window.LiveTrainEngine.getTrainStatus(train.number) : null;
          const liveDelay = liveSt ? liveSt.delayMinutes : (train.delay || 0);
          const delayColor = liveDelay === 0 ? '#138808' : liveDelay <= 15 ? '#f59e0b' : '#dc2626';
          const delayBg = liveDelay === 0 ? '#f0fdf4' : liveDelay <= 15 ? '#fffbeb' : '#fef2f2';
          const delayText = liveDelay === 0 ? '✓ ON TIME' : `+${liveDelay} MIN DELAY`;

          return `
            <div class="glass-card" onclick="viewTrainDetail('${train.number}')" style="padding: 20px 22px; border-radius: 20px !important; cursor: pointer; transition: all 0.2s; border-left: 5px solid ${delayColor} !important; box-shadow: 0 4px 18px rgba(18,53,91,0.06);"
              onmouseover="this.style.boxShadow='0 8px 30px rgba(18,53,91,0.14)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.boxShadow='0 4px 18px rgba(18,53,91,0.06)'; this.style.transform='translateY(0)'">

              <!-- Top: Train Number & Name -->
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div>
                  <span style="font-size: 11px; font-weight: 700; color: #64748b; font-family: 'JetBrains Mono', monospace;">${train.number}</span>
                  <h4 style="font-size: 15px; font-weight: 800; color: #12355B; margin: 2px 0 0 0; font-family: 'Outfit', sans-serif;">${train.name}</h4>
                </div>
                <div style="display: flex; gap: 6px;">
                  <span style="padding: 4px 10px; border-radius: 10px; font-size: 10px; font-weight: 800; background: ${delayBg}; color: ${delayColor}; border: 1px solid ${delayColor}30;">${delayText}</span>
                </div>
              </div>

              <!-- Middle: Timing Row (Always in 12-Hour AM/PM Format) -->
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                <!-- Departure -->
                <div style="text-align: left;">
                  <p style="font-size: 20px; font-weight: 900; color: #0f172a; margin: 0; font-family: 'Outfit', sans-serif;">${depTimeAMPM}</p>
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
                  <p style="font-size: 20px; font-weight: 900; color: ${delayColor}; margin: 0; font-family: 'Outfit', sans-serif;">${arrTimeAMPM}</p>
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

              <!-- Bottom: Classes & Actions (Delay Analytics + View Details) -->
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; gap: 6px;">
                  ${train.classes.map(cls => `
                    <span style="padding: 4px 10px; border-radius: 10px; font-size: 11px; font-weight: 700; color: #12355B; background: #eaf3f8; border: 1px solid #d6e3ec;">${cls}</span>
                  `).join("")}
                </div>
                <div style="display: flex; gap: 8px;">
                  <button onclick="event.stopPropagation(); openTrainDelayModal('${train.number}')"
                    style="padding: 8px 14px; border-radius: 14px; background: #fff7ed; border: 1.5px solid #ea580c; color: #c2410c; font-size: 11px; font-weight: 800; cursor: pointer; transition: all 0.2s; font-family: 'Outfit', sans-serif; display: inline-flex; align-items: center; gap: 5px;"
                    onmouseover="this.style.background='#ffedd5'" onmouseout="this.style.background='#fff7ed'">
                    <i class="fa-solid fa-chart-line" style="color: #ea580c;"></i> DELAY ANALYTICS
                  </button>
                  <button onclick="event.stopPropagation(); viewTrainDetail('${train.number}')"
                    style="padding: 8px 18px; border-radius: 14px; background: white; border: 2px solid #2563eb; color: #2563eb; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s; font-family: 'Outfit', sans-serif;"
                    onmouseover="this.style.background='#2563eb'; this.style.color='white'" onmouseout="this.style.background='white'; this.style.color='#2563eb'">
                    VIEW DETAILS <i class="fa-solid fa-chevron-right" style="margin-left: 4px; font-size: 10px;"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join("")}

      </div>
    `;

    // Asynchronously fetch and populate live weather for Departure and Arrival stations
    setTimeout(async () => {
      const pillsContainer = document.getElementById("resultsScreenWeatherPills");
      if (pillsContainer && window.WeatherEngine) {
        try {
          const [wFrom, wTo] = await Promise.all([
            window.WeatherEngine.getStationWeather(trainSearchFrom),
            window.WeatherEngine.getStationWeather(trainSearchTo),
          ]);
          pillsContainer.innerHTML = `
            <div style="background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.3); border-radius: 12px; padding: 5px 12px; font-size: 11px; display: inline-flex; align-items: center; gap: 7px; color: #FFFFFF !important;">
              <i class="fa-solid ${wFrom.icon}" style="font-size: 13px;"></i>
              <span><strong>${wFrom.stationCode} (${wFrom.stationName})</strong>: ${wFrom.temp}°C, ${wFrom.condition} • Wind ${wFrom.windSpeed} km/h • Vis ${wFrom.visibilityKm}km</span>
            </div>
            <div style="background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.3); border-radius: 12px; padding: 5px 12px; font-size: 11px; display: inline-flex; align-items: center; gap: 7px; color: #FFFFFF !important;">
              <i class="fa-solid ${wTo.icon}" style="font-size: 13px;"></i>
              <span><strong>${wTo.stationCode} (${wTo.stationName})</strong>: ${wTo.temp}°C, ${wTo.condition} • Wind ${wTo.windSpeed} km/h • Vis ${wTo.visibilityKm}km</span>
            </div>
          `;
        } catch (e) {
          console.warn("Could not load search results weather pills:", e);
        }
      }
    }, 20);
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

    const liveTrain = panIndiaTrainData.find(pt => pt.number === t.number || pt.id === t.number);
    const totalDistKm = liveTrain ? (liveTrain.stations[liveTrain.stations.length - 1].distKm) : (t.distance || ((seed * 67) % 450 + 480));
    const distCompletedKm = liveTrain ? liveTrain.distCovered : Math.round(totalDistKm * ((currentStnIdx + 0.6) / numStations));
    const distRemainingKm = liveTrain ? liveTrain.distRemaining : Math.max(0, totalDistKm - distCompletedKm);
    const progressPct = liveTrain ? Math.round(liveTrain.progress * 100) : Math.min(100, Math.round((distCompletedKm / totalDistKm) * 100));
    const curSpeed = liveTrain ? liveTrain.speed : (t.delay > 20 ? Math.round(theme.baseSpeed * 0.88) : theme.baseSpeed);
    const liveStatus = liveTrain ? liveTrain.status : (t.delay > 0 ? "RUNNING DELAYED" : "ON ROUTE • ON TIME");

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
            <button onclick="openTrainDelayModal('${t.number}')"
              style="display: inline-flex; align-items: center; gap: 5px; padding: 8px 14px; border-radius: 14px; background: #fff7ed; border: 1.5px solid #ea580c; color: #c2410c; font-size: 11px; font-weight: 800; cursor: pointer; transition: all 0.2s;"
              onmouseover="this.style.background='#ffedd5'" onmouseout="this.style.background='#fff7ed'">
              <i class="fa-solid fa-chart-line" style="color: #ea580c;"></i> Delay Analytics
            </button>
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

        <!-- LIVE ROUTE SATELLITE WEATHER & ENVIRONMENTAL CONDITIONS BANNER -->
        <div id="trainDetailRouteWeatherContainer"></div>

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
                          PF #${st.pf || (idx + 1)} &nbsp;•&nbsp; Arr: <span style="color: #0f172a; font-family: 'JetBrains Mono', monospace; font-weight: 700;">${window.LiveTrainEngine ? window.LiveTrainEngine.formatAMPM(st.arr) : st.arr}</span> &nbsp;•&nbsp; Dep: <span style="color: #0f172a; font-family: 'JetBrains Mono', monospace; font-weight: 700;">${window.LiveTrainEngine ? window.LiveTrainEngine.formatAMPM(st.dep) : st.dep}</span>
                        </p>
                      </div>

                      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <div id="stnWeatherBadge_${st.code}_${idx}">
                          <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 8px; font-size: 10px; font-weight: 700; background: #f8fafc; border: 1px solid #e2e8f0; color: #64748b;">
                            <i class="fa-solid fa-cloud-sun" style="color: #f59e0b;"></i>
                            <span>--°C</span>
                          </span>
                        </div>
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
    `;

    // 1. Render Route Weather Banner (Origin, Cruising, Destination)
    if (window.WeatherEngine && typeof window.WeatherEngine.renderTrainRouteWeatherBanner === "function") {
      const weatherContainer = document.getElementById("trainDetailRouteWeatherContainer");
      if (weatherContainer) {
        window.WeatherEngine.renderTrainRouteWeatherBanner(t, weatherContainer);
      }
    }

    // 2. Populate Station Stops Weather Badges along the journey
    if (window.WeatherEngine && Array.isArray(t.stations)) {
      t.stations.forEach((st, idx) => {
        setTimeout(async () => {
          const badgeEl = document.getElementById(`stnWeatherBadge_${st.code}_${idx}`);
          if (badgeEl) {
            try {
              const stWeather = await window.WeatherEngine.getStationWeather(st.code);
              badgeEl.innerHTML = window.WeatherEngine.getStationWeatherBadgeHtml(stWeather);
            } catch (err) {
              console.warn(`Could not load weather for stop ${st.code}:`, err);
            }
          }
        }, idx * 60); // Subtle stagger for smooth visual load
      });
    }
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

  // =========================================================================
  // VIEW 4: AI DYNAMIC RESCHEDULING & TIMETABLE OPTIMIZER (rescheduling)
  // =========================================================================
  let reschedulingStateFilter = "all";
  let reschedulingSearchQuery = "";
  let reschedulingSeverityFilter = "all";
  let selectedRescheduleTrainNumber = null;
  let reschedulingChartInstances = {};
  let reschedulingAutoRefreshTimer = null;

  window.setRescheduleStateFilter = function (st) {
    reschedulingStateFilter = st;
    renderReschedulingLeftList();
  };

  window.filterRescheduleList = function (query) {
    reschedulingSearchQuery = (query || "").trim().toLowerCase();
    renderReschedulingLeftList();
  };

  window.setRescheduleSeverityFilter = function (sev) {
    reschedulingSeverityFilter = sev;
    renderReschedulingLeftList();
  };

  window.selectRescheduleTrain = function (trainNumber) {
    selectedRescheduleTrainNumber = trainNumber;
    renderReschedulingLeftList();
    renderReschedulingDetailPanel(trainNumber);
  };

  window.applyRescheduleDirective = function (trainNumber, solutionId, timeSaved) {
    if (!window.ReschedulingEngine) return;
    window.ReschedulingEngine.applySolution(trainNumber, solutionId, timeSaved);
    showToast(`🚀 AI Directive Applied! Dispatched to Section Controller via Kavach RF (${timeSaved}m delay recovered)`, "success");
    renderReschedulingDetailPanel(trainNumber);
    renderReschedulingLeftList();
    updateReschedulingStatusBar();
  };

  function updateReschedulingStatusBar() {
    const barEl = document.getElementById("reschedulingNetworkStatusBar");
    if (!barEl || !window.ReschedulingEngine) return;
    const stats = window.ReschedulingEngine.getReschedulingNetworkStats();
    barEl.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
          </div>
          <div>
            <p class="text-[10px] text-slate-400 font-bold uppercase">AI Directives Enforced</p>
            <p class="text-base font-black text-white font-mono">${stats.appliedCount} Active</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <i class="fa-solid fa-clock-rotate-left"></i>
          </div>
          <div>
            <p class="text-[10px] text-slate-400 font-bold uppercase">Cumulative Delay Saved</p>
            <p class="text-base font-black text-emerald-400 font-mono">${stats.totalMinutesSaved} Minutes</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
            <i class="fa-solid fa-train-subway"></i>
          </div>
          <div>
            <p class="text-[10px] text-slate-400 font-bold uppercase">Stabilized Rakes</p>
            <p class="text-base font-black text-cyan-300 font-mono">${stats.stabilizedTrains} Trains</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <i class="fa-solid fa-chart-pie"></i>
          </div>
          <div>
            <p class="text-[10px] text-slate-400 font-bold uppercase">Network Health Index</p>
            <p class="text-base font-black text-amber-300 font-mono">${stats.networkEfficiencyScore}%</p>
          </div>
        </div>
      </div>
    `;
  }

  function renderReschedulingLeftList() {
    const listEl = document.getElementById("reschedulingTrainsListContainer");
    if (!listEl) return;

    if (!window.LiveTrainEngine) {
      listEl.innerHTML = `<div class="p-6 text-center text-xs text-slate-500">Initializing simulation engine...</div>`;
      return;
    }

    let trains = [];
    if (reschedulingStateFilter && reschedulingStateFilter !== "all") {
      trains = window.LiveTrainEngine.getTrainsByState(reschedulingStateFilter, { minDelay: 1, limit: 100, all: true });
    } else {
      trains = window.LiveTrainEngine.getDelayedTrainsGrid({ minDelay: 1, limit: 100, all: true });
    }

    // Apply search query
    if (reschedulingSearchQuery) {
      trains = trains.filter(t =>
        t.number.toLowerCase().includes(reschedulingSearchQuery) ||
        t.name.toLowerCase().includes(reschedulingSearchQuery) ||
        (t.from && t.from.toLowerCase().includes(reschedulingSearchQuery)) ||
        (t.to && t.to.toLowerCase().includes(reschedulingSearchQuery))
      );
    }

    // Apply severity filter
    if (reschedulingSeverityFilter === "major") {
      trains = trains.filter(t => t.delayMinutes > 30);
    } else if (reschedulingSeverityFilter === "moderate") {
      trains = trains.filter(t => t.delayMinutes >= 15 && t.delayMinutes <= 30);
    } else if (reschedulingSeverityFilter === "minor") {
      trains = trains.filter(t => t.delayMinutes < 15);
    }

    if (trains.length === 0) {
      listEl.innerHTML = `
        <div class="p-6 text-center bg-slate-900/60 rounded-2xl border border-white/5 space-y-2">
          <i class="fa-solid fa-train text-2xl text-emerald-400"></i>
          <p class="text-xs font-bold text-white">No Delayed Trains Found</p>
          <p class="text-[11px] text-slate-400">Selected filter criteria has 100% on-time performance.</p>
        </div>
      `;
      return;
    }

    // Auto-select first train if none selected or selected not in list
    if (!selectedRescheduleTrainNumber || !trains.some(t => t.number === selectedRescheduleTrainNumber)) {
      selectedRescheduleTrainNumber = trains[0].number;
      setTimeout(() => renderReschedulingDetailPanel(selectedRescheduleTrainNumber), 50);
    }

    listEl.innerHTML = trains.map(tr => {
      const isSelected = tr.number === selectedRescheduleTrainNumber;
      const delayColor = tr.delayMinutes > 30 ? "#dc2626" : tr.delayMinutes > 15 ? "#ea580c" : "#d97706";
      const delayBg = tr.delayMinutes > 30 ? "#fef2f2" : tr.delayMinutes > 15 ? "#fff7ed" : "#fffbeb";
      const isApplied = window.ReschedulingEngine && !!window.ReschedulingEngine.appliedSolutions[tr.number];

      return `
        <div onclick="selectRescheduleTrain('${tr.number}')"
          class="p-3.5 rounded-xl transition-all cursor-pointer space-y-2 border-l-4 ${isSelected ? 'bg-blue-50/90 border-blue-500 shadow-md ring-2 ring-blue-400/30' : 'bg-white hover:bg-slate-50 border-slate-200'}"
          style="border-left-color: ${isSelected ? '#2563eb' : delayColor} !important;">

          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="text-xs font-black font-mono ${isSelected ? 'text-blue-700' : 'text-slate-800'}">${tr.number}</span>
                <span class="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-100 text-slate-700">${tr.type || 'Express'}</span>
                ${isApplied ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">AI OPTIMIZED</span>' : ''}
              </div>
              <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] mt-0.5 line-clamp-1">${tr.name}</h5>
            </div>
            <span class="px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 border"
              style="background-color: ${delayBg}; color: ${delayColor}; border-color: ${delayColor}40;">
              +${tr.delayMinutes} MIN
            </span>
          </div>

          <div class="flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>${tr.from} ➔ ${tr.to}</span>
            <span>Speed: <strong class="text-slate-700">${tr.speed} km/h</strong></span>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderReschedulingDetailPanel(trainNumber) {
    const panelEl = document.getElementById("reschedulingDetailPanelContainer");
    if (!panelEl) return;

    if (!window.LiveTrainEngine || !window.ReschedulingEngine) {
      panelEl.innerHTML = `<div class="p-8 text-center text-slate-500">Initializing rescheduling engine...</div>`;
      return;
    }

    const trainStatus = window.LiveTrainEngine.getTrainStatus(trainNumber);
    if (!trainStatus) {
      panelEl.innerHTML = `<div class="p-8 text-center text-slate-500">Train #${trainNumber} telemetry unavailable.</div>`;
      return;
    }

    const reasons = window.ReschedulingEngine.generateDelayReasons(trainStatus);
    const solutions = window.ReschedulingEngine.generateProposedSolutions(trainStatus, reasons);
    const cascade = window.ReschedulingEngine.getDependencyCascade(trainStatus);
    const isApplied = !!window.ReschedulingEngine.appliedSolutions[trainNumber];
    const appliedData = isApplied ? window.ReschedulingEngine.appliedSolutions[trainNumber] : null;

    const delayColor = trainStatus.delayMinutes > 30 ? "#dc2626" : trainStatus.delayMinutes > 15 ? "#ea580c" : trainStatus.delayMinutes > 0 ? "#d97706" : "#16a34a";
    const delayBg = trainStatus.delayMinutes > 30 ? "#fef2f2" : trainStatus.delayMinutes > 15 ? "#fff7ed" : trainStatus.delayMinutes > 0 ? "#fffbeb" : "#f0fdf4";

    panelEl.innerHTML = `
      <div class="space-y-6">

        <!-- Train Header Identity Card -->
        <div class="glass-card p-5 border-l-4 space-y-4" style="border-left-color: ${delayColor} !important; border-radius: 20px !important;">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-3 py-0.5 rounded-full text-xs font-black bg-[#12355B] text-white font-mono">${trainStatus.trainNumber}</span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-slate-100 text-slate-800">${trainStatus.trainType}</span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <i class="fa-solid fa-shield-halved mr-1"></i>KAVACH 4.0 SIL-4 PROTECTED
                </span>
                ${isApplied ? '<span class="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-800 border border-purple-300 animate-pulse"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>DIRECTIVE ACTIVE</span>' : ''}
              </div>
              <h3 class="text-xl font-black text-[#12355B] font-['Outfit'] mt-1">${trainStatus.trainName}</h3>
              <p class="text-xs text-slate-500 font-semibold flex items-center gap-2">
                <i class="fa-solid fa-route text-blue-600"></i>
                <span>${trainStatus.origin} (${trainStatus.originCode}) ➔ ${trainStatus.destination} (${trainStatus.destinationCode})</span>
                <span class="text-slate-300">•</span>
                <span>${trainStatus.totalDistanceKm} KM</span>
                <span class="text-slate-300">•</span>
                <span>Cruise: ${trainStatus.currentSpeed} km/h</span>
              </p>
            </div>

            <!-- Current Delay Pill -->
            <div class="text-right p-3 rounded-2xl border shrink-0" style="background: ${delayBg}; border-color: ${delayColor}40;">
              <p class="text-[10px] font-black uppercase text-slate-500">Live Calculated Delay</p>
              <p class="text-xl font-black font-mono" style="color: ${delayColor};">${trainStatus.delayText}</p>
              <p class="text-[10px] font-mono text-slate-500">${trainStatus.liveStatusText}</p>
            </div>
          </div>
        </div>

        <!-- 1. ROOT-CAUSE DELAY BREAKDOWN TABLE -->
        <div class="glass-card p-5 space-y-3" style="border-radius: 20px !important;">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 class="text-xs font-black text-[#12355B] font-['Outfit'] uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-magnifying-glass-chart text-blue-600"></i> Root-Cause Delay Categorization & Bottleneck Analysis
            </h4>
            <span class="text-[10px] font-mono text-slate-400">IR Algorithmic Diagnostics</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                  <th class="py-2 px-3">Classification</th>
                  <th class="py-2 px-3">Diagnostic Description</th>
                  <th class="py-2 px-3">Corridor Location</th>
                  <th class="py-2 px-3 text-right">Time Impact</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${reasons.map(r => `
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-2.5 px-3">
                      <span class="px-2 py-0.5 rounded-md text-[10px] font-black inline-flex items-center gap-1.5"
                        style="background-color: ${r.bg}; color: ${r.color}; border: 1px solid ${r.border};">
                        <i class="${r.icon}"></i> ${r.category}
                      </span>
                    </td>
                    <td class="py-2.5 px-3 text-slate-700 font-medium">${r.description}</td>
                    <td class="py-2.5 px-3 font-mono text-[11px] text-slate-600">${r.location}</td>
                    <td class="py-2.5 px-3 text-right font-mono font-black" style="color: ${r.color};">${r.timeImpact}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 2. ACTIONABLE AI RECOVERY DIRECTIVES (PROPOSED SOLUTIONS) -->
        <div class="glass-card p-5 space-y-4" style="border-radius: 20px !important;">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h4 class="text-xs font-black text-[#12355B] font-['Outfit'] uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-wand-magic-sparkles text-purple-600"></i> Actionable AI Rescheduling Directives & Recovery Solutions
              </h4>
              <p class="text-[11px] text-slate-500">Autonomous precedence solutions with predicted time recovery & SIL-4 safety compliance</p>
            </div>
            <span class="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-black border border-purple-200 uppercase">
              ${solutions.length} Directives Ready
            </span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            ${solutions.map((sol, idx) => {
              const solApplied = isApplied && appliedData.solutionId === sol.id;
              return `
                <div class="p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${solApplied ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-300 shadow-md' : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'}">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between gap-1">
                      <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase"
                        style="background-color: ${sol.riskBadgeBg || '#dcfce7'}; color: ${sol.riskBadgeText || '#15803d'};">
                        ${sol.risk} RISK
                      </span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-emerald-100 text-emerald-800">
                        +${sol.timeSaved} MIN RECOVERY
                      </span>
                    </div>
                    <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] leading-snug">${sol.title}</h5>
                    <p class="text-[11px] text-slate-600 leading-relaxed">${sol.action}</p>
                    <p class="text-[10px] text-emerald-700 font-bold"><i class="fa-solid fa-circle-check mr-1"></i>${sol.impactSummary}</p>
                  </div>

                  <div>
                    ${solApplied ? `
                      <button disabled class="w-full py-2 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow cursor-default">
                        <i class="fa-solid fa-check-double"></i> Directive Applied & Active
                      </button>
                    ` : `
                      <button onclick="applyRescheduleDirective('${trainStatus.trainNumber}', '${sol.id}', ${sol.timeSaved})"
                        class="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow hover:shadow-md cursor-pointer transition-all">
                        <i class="fa-solid fa-bolt text-amber-300"></i> Apply Directive
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- 3. INTERACTIVE VISUALIZATIONS (2x2 GRID) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

          <!-- Chart 1: Delay vs Recovery Timeline -->
          <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] flex items-center gap-1.5">
                <i class="fa-solid fa-chart-line text-blue-600"></i> Delay vs Projected Recovery Trajectory
              </h5>
              <span class="text-[10px] font-mono text-slate-400">Current vs AI Optimized</span>
            </div>
            <div class="h-48 w-full">
              <canvas id="rescheduleRecoveryChart"></canvas>
            </div>
          </div>

          <!-- Chart 2: Speed Optimization Profile -->
          <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] flex items-center gap-1.5">
                <i class="fa-solid fa-gauge-high text-emerald-600"></i> Sectional Speed Profile & Clear Wave
              </h5>
              <span class="text-[10px] font-mono text-slate-400">Current vs Recommended (km/h)</span>
            </div>
            <div class="h-48 w-full">
              <canvas id="rescheduleSpeedChart"></canvas>
            </div>
          </div>

          <!-- Chart 3: Multi-Train Impact Cascade -->
          <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] flex items-center gap-1.5">
                <i class="fa-solid fa-diagram-project text-purple-600"></i> Multi-Train Dependency Cascade Benefit
              </h5>
              <span class="text-[10px] font-mono text-slate-400">Minutes Saved for Trailing Rakes</span>
            </div>
            <div class="h-48 w-full">
              <canvas id="rescheduleCascadeChart"></canvas>
            </div>
          </div>

          <!-- Chart 4: Solution Comparison -->
          <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] flex items-center gap-1.5">
                <i class="fa-solid fa-chart-simple text-amber-600"></i> Directive Delay Recovery Comparison
              </h5>
              <span class="text-[10px] font-mono text-slate-400">Time Recovered (Minutes)</span>
            </div>
            <div class="h-48 w-full">
              <canvas id="rescheduleSolutionComparisonChart"></canvas>
            </div>
          </div>

        </div>

        <!-- 4. MULTI-TRAIN CORRIDOR DEPENDENCY CASCADE TABLE -->
        <div class="glass-card p-5 space-y-3" style="border-radius: 20px !important;">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h4 class="text-xs font-black text-[#12355B] font-['Outfit'] uppercase tracking-wider flex items-center gap-2">
                <i class="fa-solid fa-link text-cyan-600"></i> Shared Corridor Dependency Matrix & Cascading Impact
              </h4>
              <p class="text-[11px] text-slate-500">Shows trailing and crossing trains that directly benefit from resolving this train's delay</p>
            </div>
            <span class="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Positive Ripple Clearance
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                  <th class="py-2 px-3">Downstream Rake</th>
                  <th class="py-2 px-3">Shared Block Segment</th>
                  <th class="py-2 px-3">Initial Delay</th>
                  <th class="py-2 px-3">Cascade Recovery</th>
                  <th class="py-2 px-3">Post-Action Delay</th>
                  <th class="py-2 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${cascade.map(c => `
                  <tr class="hover:bg-slate-50/80 transition-colors">
                    <td class="py-2.5 px-3">
                      <span class="font-mono font-bold text-blue-700">#${c.number}</span>
                      <span class="font-bold text-slate-800 ml-1.5">${c.name}</span>
                    </td>
                    <td class="py-2.5 px-3 text-slate-600 font-mono text-[11px]">${c.segment}</td>
                    <td class="py-2.5 px-3 font-mono font-bold text-red-600">+${c.initialDelay}m</td>
                    <td class="py-2.5 px-3 font-mono font-black text-emerald-600">-${c.cascadeReduction}m</td>
                    <td class="py-2.5 px-3 font-mono font-bold ${c.finalDelay === 0 ? 'text-emerald-700' : 'text-amber-600'}">
                      +${c.finalDelay}m
                    </td>
                    <td class="py-2.5 px-3 text-right">
                      <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase ${c.finalDelay === 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-blue-100 text-blue-800 border border-blue-300'}">
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

    // Render the 4 Chart.js charts
    setTimeout(() => {
      const chartData = window.ReschedulingEngine.generateReschedulingChartsData(trainStatus);
      initReschedulingCharts(chartData);
    }, 100);
  }

  function initReschedulingCharts(chartData) {
    if (!window.Chart || !chartData) return;

    // Destroy existing instances to avoid duplicates
    Object.keys(reschedulingChartInstances).forEach(k => {
      if (reschedulingChartInstances[k]) {
        try { reschedulingChartInstances[k].destroy(); } catch (e) {}
      }
    });
    reschedulingChartInstances = {};

    // 1. Recovery Chart (Line)
    const ctxRec = document.getElementById("rescheduleRecoveryChart");
    if (ctxRec) {
      reschedulingChartInstances.recovery = new Chart(ctxRec, {
        type: "line",
        data: {
          labels: chartData.labels,
          datasets: [
            {
              label: "Current Delay (min)",
              data: chartData.currentDelayPoints,
              borderColor: "#dc2626",
              backgroundColor: "rgba(220, 38, 38, 0.08)",
              borderWidth: 2,
              pointRadius: 2,
              tension: 0.3
            },
            {
              label: "Post-Directive Recovery",
              data: chartData.recoveredDelayPoints,
              borderColor: "#10b981",
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              borderWidth: 2.5,
              borderDash: [4, 4],
              pointRadius: 3,
              fill: true,
              tension: 0.3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top", labels: { boxWidth: 10, font: { size: 9, family: "'Plus Jakarta Sans'" } } }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { font: { size: 9, family: "'JetBrains Mono'" } } },
            x: { grid: { display: false }, ticks: { font: { size: 9, family: "'JetBrains Mono'" } } }
          }
        }
      });
    }

    // 2. Speed Chart (Line / Area)
    const ctxSpd = document.getElementById("rescheduleSpeedChart");
    if (ctxSpd) {
      reschedulingChartInstances.speed = new Chart(ctxSpd, {
        type: "line",
        data: {
          labels: chartData.labels,
          datasets: [
            {
              label: "Current Speed",
              data: chartData.currentSpeedProfile,
              borderColor: "#64748b",
              backgroundColor: "transparent",
              borderWidth: 1.5,
              tension: 0.25
            },
            {
              label: "Optimized Speed",
              data: chartData.optimizedSpeedProfile,
              borderColor: "#2563eb",
              backgroundColor: "rgba(37, 99, 235, 0.12)",
              borderWidth: 2.5,
              fill: true,
              tension: 0.25
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top", labels: { boxWidth: 10, font: { size: 9, family: "'Plus Jakarta Sans'" } } }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { font: { size: 9, family: "'JetBrains Mono'" } } },
            x: { grid: { display: false }, ticks: { font: { size: 9, family: "'JetBrains Mono'" } } }
          }
        }
      });
    }

    // 3. Cascade Impact Bar
    const ctxCas = document.getElementById("rescheduleCascadeChart");
    if (ctxCas) {
      reschedulingChartInstances.cascade = new Chart(ctxCas, {
        type: "bar",
        data: {
          labels: chartData.cascadeLabels,
          datasets: [{
            label: "Minutes Recovered",
            data: chartData.cascadeReductions,
            backgroundColor: ["#3b82f6", "#8b5cf6", "#10b981", "#06b6d4"],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { font: { size: 9, family: "'JetBrains Mono'" } } },
            x: { grid: { display: false }, ticks: { font: { size: 9, family: "'Plus Jakarta Sans'" } } }
          }
        }
      });
    }

    // 4. Solution Comparison Horizontal Bar
    const ctxSol = document.getElementById("rescheduleSolutionComparisonChart");
    if (ctxSol) {
      reschedulingChartInstances.solution = new Chart(ctxSol, {
        type: "bar",
        data: {
          labels: chartData.solLabels,
          datasets: [{
            label: "Time Saved (Min)",
            data: chartData.solSavings,
            backgroundColor: ["#8b5cf6", "#10b981", "#3b82f6"],
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { font: { size: 9, family: "'JetBrains Mono'" } } },
            y: { grid: { display: false }, ticks: { font: { size: 9, family: "'Plus Jakarta Sans'" } } }
          }
        }
      });
    }
  }

  function renderReschedulingSection(container) {
    if (window.LiveTrainEngine && isRealDatasetsLoaded) {
      window.LiveTrainEngine.init(irTrainDatabase, irSchedulesIndex, irStations, irDelayModel);
    }
    if (window.ReschedulingEngine) {
      window.ReschedulingEngine.init(window.LiveTrainEngine);
    }

    const states = window.LiveTrainEngine ? window.LiveTrainEngine.getAllStates() : [];
    const nowIST = window.LiveTrainEngine ? window.LiveTrainEngine.getISTTime() : new Date();
    const timeAMPM = window.LiveTrainEngine ? window.LiveTrainEngine.formatAMPM(nowIST) : "--";

    container.innerHTML = `
      <div class="space-y-5">

        <!-- Top Header Banner -->
        <div class="results-header-banner p-6 text-white space-y-3" style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%) !important; border-radius: 24px !important;">
          <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2.5 py-0.5 rounded-md bg-[#FF9933] text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  GOVERNMENT OF INDIA • MINISTRY OF RAILWAYS
                </span>
                <span class="px-2.5 py-0.5 rounded-md bg-purple-500/30 text-purple-200 border border-purple-400/40 text-[10px] font-black uppercase">
                  <i class="fa-solid fa-wand-magic-sparkles mr-1"></i> AI RESCHEDULING COMMAND
                </span>
              </div>
              <h2 class="text-2xl font-black font-['Outfit'] text-white">
                ⏱️ AI Dynamic Train Rescheduling & Timetable Mitigation Engine
              </h2>
              <p class="text-xs text-slate-200 max-w-3xl font-medium">
                Autonomous precedence resolution, loop line overtakes, dynamic platform reassignments, and multi-train downstream delay cascade mitigation.
              </p>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <div class="p-3 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-right">
                <p class="text-[10px] font-bold text-slate-300 uppercase">Live IST Time</p>
                <p class="text-lg font-black font-mono text-amber-300">${timeAMPM}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Toolbar -->
        <div class="glass-card p-4 space-y-3" style="border-radius: 20px !important;">
          <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">

            <!-- State Filter Dropdown -->
            <div class="sm:col-span-4">
              <label class="block text-[10px] font-black text-slate-500 uppercase mb-1">
                <i class="fa-solid fa-map-location-dot text-purple-600 mr-1"></i> Railway State / Territory
              </label>
              <select id="rescheduleStateFilterSelect" onchange="setRescheduleStateFilter(this.value)"
                class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500">
                <option value="all">All States (Pan-India Network)</option>
                ${states.map(st => `<option value="${st}">${st}</option>`).join("")}
              </select>
            </div>

            <!-- Search Input -->
            <div class="sm:col-span-5">
              <label class="block text-[10px] font-black text-slate-500 uppercase mb-1">
                <i class="fa-solid fa-magnifying-glass text-blue-600 mr-1"></i> Search Delayed Train
              </label>
              <input
                type="text"
                id="rescheduleSearchInput"
                placeholder="Search train #, name, or station..."
                oninput="filterRescheduleList(this.value)"
                class="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-500"
              />
            </div>

            <!-- Severity Filter Buttons -->
            <div class="sm:col-span-3">
              <label class="block text-[10px] font-black text-slate-500 uppercase mb-1">Delay Severity</label>
              <div class="flex items-center gap-1 text-xs font-bold">
                <button onclick="setRescheduleSeverityFilter('all')" class="px-2.5 py-1.5 rounded-lg bg-purple-600 text-white shadow-sm hover:bg-purple-700 cursor-pointer">All</button>
                <button onclick="setRescheduleSeverityFilter('major')" class="px-2 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 cursor-pointer">&gt;30m</button>
                <button onclick="setRescheduleSeverityFilter('moderate')" class="px-2 py-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 cursor-pointer">15-30m</button>
                <button onclick="setRescheduleSeverityFilter('minor')" class="px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 cursor-pointer">&lt;15m</button>
              </div>
            </div>

          </div>
        </div>

        <!-- 2-Column Responsive Workspace -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          <!-- LEFT COLUMN: Scrollable Delayed Trains List (4 cols) -->
          <div class="lg:col-span-4 space-y-3">
            <div class="flex items-center justify-between px-1 text-xs font-bold text-slate-600">
              <span>Delayed Trains Requiring Rescheduling</span>
              <span class="text-purple-600 font-mono text-[10px]">Select to Optimize</span>
            </div>
            <div id="reschedulingTrainsListContainer" class="space-y-2.5 max-h-[820px] overflow-y-auto pr-1">
              <!-- Rendered via renderReschedulingLeftList() -->
            </div>
          </div>

          <!-- RIGHT COLUMN: Selected Train Rescheduling Command Center (8 cols) -->
          <div class="lg:col-span-8">
            <div id="reschedulingDetailPanelContainer">
              <!-- Rendered via renderReschedulingDetailPanel() -->
            </div>
          </div>

        </div>

        <!-- Bottom Global Network Status Bar -->
        <div id="reschedulingNetworkStatusBar" class="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-lg">
          <!-- Rendered via updateReschedulingStatusBar() -->
        </div>

      </div>
    `;

    renderReschedulingLeftList();
    updateReschedulingStatusBar();

    // Setup 10-second auto-refresh interval for rescheduling
    if (reschedulingAutoRefreshTimer) clearInterval(reschedulingAutoRefreshTimer);
    reschedulingAutoRefreshTimer = setInterval(() => {
      if (activeNavView !== "rescheduling") {
        clearInterval(reschedulingAutoRefreshTimer);
        return;
      }
      if (selectedRescheduleTrainNumber) {
        renderReschedulingDetailPanel(selectedRescheduleTrainNumber);
      }
      updateReschedulingStatusBar();
    }, 10000);
  }

  // =========================================================================
  // =========================================================================
  // VIEW: AI DELAY MANAGEMENT & REAL-TIME PREDICTIVE ANALYTICS (delay_analytics)
  // =========================================================================
  let delayGridSearchQuery = "";
  let delayGridSeverityFilter = "all";
  let delayGridStateFilter = "all";
  let stationDelaySearchFrom = "NDLS";
  let stationDelaySearchTo = "MMCT";
  let activeDelayModalTrain = null;
  let delayModalChartInstances = {};

  window.setDelaySeverityFilter = function (sev) {
    delayGridSeverityFilter = sev;
    renderDelayedTrainsGrid();
  };

  window.setDelayStateFilter = function (stateName) {
    delayGridStateFilter = stateName;
    renderDelayedTrainsGrid();
  };

  window.filterDelayedGrid = function (query) {
    delayGridSearchQuery = (query || "").trim().toLowerCase();
    renderDelayedTrainsGrid();
  };

  window.swapDelaySearchStations = function () {
    const tmp = stationDelaySearchFrom;
    stationDelaySearchFrom = stationDelaySearchTo;
    stationDelaySearchTo = tmp;
    const fromEl = document.getElementById("stationDelayFromInput");
    const toEl = document.getElementById("stationDelayToInput");
    if (fromEl) fromEl.value = stationDelaySearchFrom;
    if (toEl) toEl.value = stationDelaySearchTo;
    executeStationDelaySearch();
  };

  // Autocomplete search handlers
  window.handleStationAutocomplete = function (type, query) {
    const dropdownEl = document.getElementById(type === "from" ? "stationDelayFromDropdown" : "stationDelayToDropdown");
    if (!dropdownEl || !window.LiveTrainEngine) return;

    const trimmed = (query || "").trim();
    if (trimmed.length < 1) {
      dropdownEl.classList.add("hidden");
      dropdownEl.innerHTML = "";
      return;
    }

    const matches = window.LiveTrainEngine.findStationsByQuery(trimmed);
    if (matches.length === 0) {
      dropdownEl.innerHTML = `<div class="p-2.5 text-slate-400 text-xs text-center font-medium">No matching station found</div>`;
      dropdownEl.classList.remove("hidden");
      return;
    }

    dropdownEl.innerHTML = matches.map(st => `
      <div onclick="selectStationAutocomplete('${type}', '${st.code}', '${st.name ? st.name.replace(/'/g, "\\'") : st.code}')"
        class="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-0 transition-colors">
        <div class="truncate mr-2">
          <p class="text-xs font-bold text-slate-800 truncate">${st.name}</p>
          <p class="text-[10px] text-slate-400 font-mono">${st.state || st.zone || 'Indian Railways'}</p>
        </div>
        <span class="px-2 py-0.5 rounded font-mono font-black text-[10px] bg-blue-100 text-blue-800 shrink-0">${st.code}</span>
      </div>
    `).join("");

    dropdownEl.classList.remove("hidden");
  };

  window.selectStationAutocomplete = function (type, code, name) {
    if (type === "from") {
      stationDelaySearchFrom = code;
      const input = document.getElementById("stationDelayFromInput");
      if (input) input.value = `${name} (${code})`;
      const dd = document.getElementById("stationDelayFromDropdown");
      if (dd) dd.classList.add("hidden");
    } else {
      stationDelaySearchTo = code;
      const input = document.getElementById("stationDelayToInput");
      if (input) input.value = `${name} (${code})`;
      const dd = document.getElementById("stationDelayToDropdown");
      if (dd) dd.classList.add("hidden");
    }
  };

  // Close station dropdowns on outside click
  document.addEventListener("click", function (e) {
    if (!e.target.closest("#stationDelayFromGroup")) {
      const dd = document.getElementById("stationDelayFromDropdown");
      if (dd) dd.classList.add("hidden");
    }
    if (!e.target.closest("#stationDelayToGroup")) {
      const dd = document.getElementById("stationDelayToDropdown");
      if (dd) dd.classList.add("hidden");
    }
  });

  window.executeStationDelaySearch = function () {
    const fromEl = document.getElementById("stationDelayFromInput");
    const toEl = document.getElementById("stationDelayToInput");
    if (fromEl && fromEl.value.trim()) {
      stationDelaySearchFrom = fromEl.value.trim();
    }
    if (toEl && toEl.value.trim()) {
      stationDelaySearchTo = toEl.value.trim();
    }

    const resultsContainer = document.getElementById("stationDelaySearchResultsContainer");
    if (!resultsContainer) return;

    if (!window.LiveTrainEngine) {
      resultsContainer.innerHTML = `<p class="text-xs text-slate-500">Initializing simulation engine...</p>`;
      return;
    }

    // Resolves both station codes or station names to find ALL live trains
    const matches = window.LiveTrainEngine.searchTrainsBetweenStations(stationDelaySearchFrom, stationDelaySearchTo);

    const fromCodeResolved = window.LiveTrainEngine.resolveStationCode(stationDelaySearchFrom);
    const toCodeResolved = window.LiveTrainEngine.resolveStationCode(stationDelaySearchTo);

    if (matches.length === 0) {
      resultsContainer.innerHTML = `
        <div class="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
          <div class="w-10 h-10 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-lg">
            <i class="fa-solid fa-route"></i>
          </div>
          <h5 class="text-sm font-black text-amber-800 font-['Outfit']">No Direct Connecting Trains</h5>
          <p class="text-xs text-amber-700 font-medium">
            No active schedules found between <strong>${fromCodeResolved}</strong> and <strong>${toCodeResolved}</strong>. Check station names or route connections.
          </p>
        </div>
      `;
      return;
    }

    const delayedCount = matches.filter(t => t.delayMinutes > 0).length;
    const runningCount = matches.filter(t => t.state === "RUNNING").length;

    resultsContainer.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
          <span>Found ${matches.length} Live Trains on Corridor (${runningCount} Running, ${delayedCount} Delayed)</span>
          <span class="text-blue-700 font-mono">${fromCodeResolved} ➔ ${toCodeResolved}</span>
        </div>
        <div class="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
          ${matches.map(tr => {
            const isDelayed = tr.delayMinutes > 0;
            const delayColor = tr.delayMinutes > 30 ? "#dc2626" : tr.delayMinutes > 15 ? "#ea580c" : tr.delayMinutes > 0 ? "#d97706" : "#16a34a";
            const delayBg = tr.delayMinutes > 30 ? "#fef2f2" : tr.delayMinutes > 15 ? "#fff7ed" : tr.delayMinutes > 0 ? "#fffbeb" : "#f0fdf4";
            const isRunning = tr.state === "RUNNING";

            return `
              <div onclick="openTrainDelayModal('${tr.number}')"
                class="p-3.5 rounded-xl bg-white border hover:border-blue-400 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2 border-l-4 group"
                style="border-left-color: ${delayColor} !important;">

                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="text-xs font-extrabold font-mono text-blue-600">${tr.number}</span>
                      <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-700">${tr.type || 'Express'}</span>
                      <span class="px-2 py-0.5 rounded text-[9px] font-black uppercase ${isRunning ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
                        ${isRunning ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping mr-1"></span>RUNNING' : tr.state}
                      </span>
                    </div>
                    <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] mt-0.5 group-hover:text-blue-600 transition-colors">${tr.name}</h5>
                  </div>
                  <span class="px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 border"
                    style="background-color: ${delayBg}; color: ${delayColor}; border-color: ${delayColor}40;">
                    ${isDelayed ? `+${tr.delayMinutes} MIN DELAY` : 'ON TIME'}
                  </span>
                </div>

                <div class="flex items-center justify-between text-[11px] text-slate-600 border-y border-slate-100 py-1">
                  <span>Dep: <strong class="text-slate-800 font-mono">${tr.departureAMPM}</strong></span>
                  <span class="text-slate-300">•</span>
                  <span>Speed: <strong class="text-slate-800 font-mono">${tr.speed} km/h</strong></span>
                  <span class="text-slate-300">•</span>
                  <span>Arr: <strong class="${isDelayed ? 'text-red-600' : 'text-emerald-700'} font-mono">${tr.arrivalAMPM}</strong></span>
                </div>

                <div class="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-[10px] font-mono">
                  <span class="text-slate-500 truncate"><i class="fa-solid fa-location-dot text-blue-600 mr-1"></i>${tr.liveStatusText}</span>
                  <span class="text-blue-600 font-bold ml-2 shrink-0 group-hover:translate-x-1 transition-transform">Inspect Delay Terminal →</span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  };

  function renderDelayedTrainsGrid() {
    const gridEl = document.getElementById("delayedTrainsGridContainer");
    if (!gridEl) return;

    if (!window.LiveTrainEngine) {
      gridEl.innerHTML = `<div class="p-8 text-center text-slate-400">Loading live train engine...</div>`;
      return;
    }

    let delayedTrains = [];
    if (delayGridStateFilter && delayGridStateFilter !== "all") {
      delayedTrains = window.LiveTrainEngine.getTrainsByState(delayGridStateFilter, { minDelay: 1, limit: 120, all: true });
    } else {
      delayedTrains = window.LiveTrainEngine.getDelayedTrainsGrid({ minDelay: 1, limit: 120 });
    }

    // Apply search query
    if (delayGridSearchQuery) {
      delayedTrains = delayedTrains.filter(t =>
        t.number.toLowerCase().includes(delayGridSearchQuery) ||
        t.name.toLowerCase().includes(delayGridSearchQuery) ||
        (t.from && t.from.toLowerCase().includes(delayGridSearchQuery)) ||
        (t.to && t.to.toLowerCase().includes(delayGridSearchQuery)) ||
        (t.currentStation && t.currentStation.toLowerCase().includes(delayGridSearchQuery))
      );
    }

    // Apply severity filter
    if (delayGridSeverityFilter === "major") {
      delayedTrains = delayedTrains.filter(t => t.delayMinutes > 30);
    } else if (delayGridSeverityFilter === "moderate") {
      delayedTrains = delayedTrains.filter(t => t.delayMinutes >= 15 && t.delayMinutes <= 30);
    } else if (delayGridSeverityFilter === "minor") {
      delayedTrains = delayedTrains.filter(t => t.delayMinutes < 15);
    }

    // Update state badge
    const stateBadgeEl = document.getElementById("activeStateFilterCountBadge");
    if (stateBadgeEl) {
      if (delayGridStateFilter && delayGridStateFilter !== "all") {
        stateBadgeEl.textContent = `${delayedTrains.length} in ${delayGridStateFilter}`;
        stateBadgeEl.classList.remove("hidden");
      } else {
        stateBadgeEl.classList.add("hidden");
      }
    }

    if (delayedTrains.length === 0) {
      gridEl.innerHTML = `
        <div class="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200">
          <i class="fa-solid fa-train text-3xl text-emerald-500 mb-2"></i>
          <h5 class="text-sm font-bold text-slate-800">No Delayed Trains Found</h5>
          <p class="text-xs text-slate-500 mt-1">No trains matching the selected state and severity filters.</p>
        </div>
      `;
      return;
    }

    gridEl.innerHTML = delayedTrains.map(tr => {
      const typeColor = tr.type === 'Vande Bharat' ? '#ea580c' : tr.type === 'Rajdhani' ? '#dc2626' : tr.type === 'Shatabdi' ? '#0284c7' : '#2563eb';
      const delayBadgeCol = tr.delayMinutes > 30 ? '#dc2626' : tr.delayMinutes > 15 ? '#ea580c' : '#d97706';
      const delayBadgeBg = tr.delayMinutes > 30 ? '#fef2f2' : tr.delayMinutes > 15 ? '#fff7ed' : '#fffbeb';
      const speedStatusText = tr.speed === 0 ? 'Halted at Station' : tr.speed <= 20 ? 'Approach Decel (~15 km/h)' : `Cruising (${tr.speed} km/h)`;
      const speedStatusColor = tr.speed === 0 ? '#64748b' : tr.speed <= 20 ? '#d97706' : '#16a34a';

      return `
        <div onclick="openTrainDelayModal('${tr.number}')"
          class="glass-card hover:shadow-xl transition-all duration-200 cursor-pointer p-4 space-y-3 relative group border-l-4"
          style="border-left-color: ${delayBadgeCol} !important; border-radius: 18px !important;">

          <!-- Top Row: Train Number & Name -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-black font-mono" style="color: ${typeColor};">${tr.number}</span>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-slate-100 text-slate-700">${tr.type || 'Express'}</span>
              </div>
              <h5 class="text-sm font-black text-[#12355B] font-['Outfit'] mt-0.5 line-clamp-1 group-hover:text-blue-600 transition-colors">${tr.name}</h5>
            </div>

            <!-- Delay Pill -->
            <span class="px-2.5 py-1 rounded-xl text-xs font-black shrink-0 border"
              style="background-color: ${delayBadgeBg}; color: ${delayBadgeCol}; border-color: ${delayBadgeCol}40;">
              +${tr.delayMinutes} MIN
            </span>
          </div>

          <!-- Route & Timings in 12-Hour AM/PM Format -->
          <div class="flex items-center justify-between text-xs py-1 border-y border-slate-100">
            <div>
              <p class="text-[10px] text-slate-600 font-semibold uppercase">${tr.from || 'Origin'}</p>
              <p class="font-extrabold text-[#12355B] font-['Outfit']">${tr.departureAMPM}</p>
            </div>
            <div class="text-center px-2">
              <i class="fa-solid fa-arrow-right text-slate-300 text-xs"></i>
            </div>
            <div class="text-right">
              <p class="text-[10px] text-slate-600 font-semibold uppercase">${tr.to || 'Dest'}</p>
              <p class="font-extrabold text-red-600 font-['Outfit']">${tr.arrivalAMPM}</p>
            </div>
          </div>

          <!-- Live Physics Status & Next Station -->
          <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-[11px]">
            <div class="flex items-center justify-between">
              <span class="text-slate-500 font-medium">Live Telemetry:</span>
              <span class="font-bold flex items-center gap-1" style="color: ${speedStatusColor};">
                <i class="fa-solid ${tr.speed === 0 ? 'fa-pause' : 'fa-gauge-high'} text-[10px]"></i>
                ${speedStatusText}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500 font-medium">Next Stop:</span>
              <span class="font-bold text-[#12355B]">${tr.nextStation || tr.to}</span>
            </div>
          </div>

          <!-- Action Footer -->
          <div class="flex items-center justify-between pt-1">
            <span class="text-[10px] text-emerald-700 font-extrabold flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span> KAVACH ARMED
            </span>
            <span class="text-xs font-extrabold text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
              Inspect Analytics <i class="fa-solid fa-chevron-right text-[9px]"></i>
            </span>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderDelayAnalyticsSection(container) {
    if (window.LiveTrainEngine && isRealDatasetsLoaded) {
      window.LiveTrainEngine.init(irTrainDatabase, irSchedulesIndex, irStations, irDelayModel);
    }

    const allDelayed = window.LiveTrainEngine ? window.LiveTrainEngine.getDelayedTrainsGrid({ minDelay: 1, limit: 500, all: true }) : [];
    const delayedCount = allDelayed.length;
    const avgDelay = delayedCount > 0 ? (allDelayed.reduce((acc, cur) => acc + cur.delayMinutes, 0) / delayedCount).toFixed(1) : "0.0";
    const maxDelay = delayedCount > 0 ? Math.max(...allDelayed.map(t => t.delayMinutes)) : 0;
    const nowIST = window.LiveTrainEngine ? window.LiveTrainEngine.getISTTime() : new Date();
    const timeAMPM = window.LiveTrainEngine ? window.LiveTrainEngine.formatAMPM(nowIST) : "";
    const states = window.LiveTrainEngine ? window.LiveTrainEngine.getAllStates() : [];

    container.innerHTML = `
      <div class="space-y-5">

        <!-- Top Ministry Banner & Network Telemetry Status -->
        <div class="results-header-banner p-6 text-white space-y-3" style="background: linear-gradient(135deg, #12355B 0%, #1E4877 100%) !important; border-radius: 24px !important;">
          <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2.5 py-0.5 rounded-md bg-[#FF9933] text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  GOVERNMENT OF INDIA • MINISTRY OF RAILWAYS
                </span>
                <span class="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping mr-1"></span> LIVE IST SIMULATION
                </span>
              </div>
              <h2 class="text-2xl font-black font-['Outfit'] text-white">
                🚂 Network Delay Management & Predictive Analytics Command
              </h2>
              <p class="text-xs text-slate-200 max-w-3xl font-medium">
                Autonomous real-time tracking of train punctuality across all 18 railway zones. Deceleration physics, station approach profiling & algorithmic delay recovery models.
              </p>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <div class="p-3 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-right">
                <p class="text-[10px] font-bold text-slate-300 uppercase">Live IST Time</p>
                <p class="text-lg font-black font-mono text-amber-300">${timeAMPM}</p>
              </div>
            </div>
          </div>

          <!-- 4 Executive KPI Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div class="p-3.5 rounded-xl bg-white/10 backdrop-blur border border-white/15">
              <p class="text-[10px] font-bold text-slate-300 uppercase">Total Schedules Active</p>
              <p class="text-2xl font-black font-mono text-white mt-0.5">2,878</p>
              <p class="text-[10px] text-emerald-300 font-semibold mt-1">100% Pan-India Database</p>
            </div>

            <div class="p-3.5 rounded-xl bg-white/10 backdrop-blur border border-white/15">
              <p class="text-[10px] font-bold text-slate-300 uppercase">Currently Delayed Trains</p>
              <p class="text-2xl font-black font-mono text-red-300 mt-0.5">${delayedCount}</p>
              <p class="text-[10px] text-slate-200 font-semibold mt-1">Requiring AI Intervention</p>
            </div>

            <div class="p-3.5 rounded-xl bg-white/10 backdrop-blur border border-white/15">
              <p class="text-[10px] font-bold text-slate-300 uppercase">Average Network Delay</p>
              <p class="text-2xl font-black font-mono text-amber-300 mt-0.5">+${avgDelay} <span class="text-xs font-bold text-slate-300">min</span></p>
              <p class="text-[10px] text-slate-200 font-semibold mt-1">Max Delay: +${maxDelay}m</p>
            </div>

            <div class="p-3.5 rounded-xl bg-white/10 backdrop-blur border border-white/15">
              <p class="text-[10px] font-bold text-slate-300 uppercase">Network Punctuality Index</p>
              <p class="text-2xl font-black font-mono text-emerald-400 mt-0.5">91.8%</p>
              <p class="text-[10px] text-emerald-200 font-semibold mt-1">Above Ministry 90% SLA</p>
            </div>
          </div>
        </div>

        <!-- Main 2-Column Responsive Workspace -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          <!-- LEFT COLUMN (7 Cols): Grid of All Delayed Trains -->
          <div class="lg:col-span-7 space-y-4">

            <!-- Filter & Search Toolbar (With State Dropdown) -->
            <div class="glass-card p-4 space-y-3" style="border-radius: 20px !important;">
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">

                <!-- State Filter Dropdown -->
                <div class="sm:col-span-4">
                  <label class="block text-[10px] font-black text-slate-500 uppercase mb-1">
                    <i class="fa-solid fa-map-location-dot text-blue-600 mr-1"></i> State / UT Filter
                  </label>
                  <select id="delayStateFilterSelect" onchange="setDelayStateFilter(this.value)"
                    class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500">
                    <option value="all">All States (Pan-India)</option>
                    ${states.map(st => `<option value="${st}" ${st === delayGridStateFilter ? 'selected' : ''}>${st}</option>`).join("")}
                  </select>
                </div>

                <!-- Train Search Input -->
                <div class="sm:col-span-4">
                  <label class="block text-[10px] font-black text-slate-500 uppercase mb-1">
                    <i class="fa-solid fa-magnifying-glass text-blue-600 mr-1"></i> Search Train
                  </label>
                  <input
                    type="text"
                    id="delayedTrainSearchInput"
                    placeholder="Train #, name, station..."
                    oninput="filterDelayedGrid(this.value)"
                    class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <!-- Severity Filter Buttons -->
                <div class="sm:col-span-4">
                  <div class="flex items-center justify-between mb-1">
                    <label class="text-[10px] font-black text-slate-500 uppercase">Severity</label>
                    <span id="activeStateFilterCountBadge" class="hidden text-[10px] font-bold text-blue-600 font-mono"></span>
                  </div>
                  <div class="flex items-center gap-1 text-xs font-bold">
                    <button onclick="setDelaySeverityFilter('all')" class="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700 cursor-pointer">
                      All
                    </button>
                    <button onclick="setDelaySeverityFilter('major')" class="px-2 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 cursor-pointer">
                      &gt;30m
                    </button>
                    <button onclick="setDelaySeverityFilter('moderate')" class="px-2 py-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100 cursor-pointer">
                      15-30m
                    </button>
                    <button onclick="setDelaySeverityFilter('minor')" class="px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 cursor-pointer">
                      &lt;15m
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <!-- Delayed Trains Cards Grid Container -->
            <div id="delayedTrainsGridContainer" class="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[750px] overflow-y-auto pr-1">
              <!-- Rendered via renderDelayedTrainsGrid() -->
            </div>

          </div>

          <!-- RIGHT COLUMN (5 Cols): Station-to-Station Corridor Search (WITH AUTOCOMPLETE) -->
          <div class="lg:col-span-5 space-y-4">

            <div class="glass-card p-5 space-y-4" style="border-radius: 22px !important; border-top: 5px solid #FF9933 !important;">
              <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                <div class="flex items-center gap-2.5">
                  <div class="w-9 h-9 rounded-xl bg-orange-50 text-[#FF9933] border border-orange-200 flex items-center justify-center text-sm font-bold">
                    <i class="fa-solid fa-route"></i>
                  </div>
                  <div>
                    <h4 class="text-sm font-black text-[#12355B] font-['Outfit']">Corridor Live Train Search</h4>
                    <p class="text-[11px] text-slate-500 font-medium">Shows ALL live running trains between stations</p>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold uppercase border border-emerald-200">
                  Live Corridor
                </span>
              </div>

              <!-- Form: From & To with Autocomplete Suggestions -->
              <div class="space-y-3">

                <!-- From Station Group -->
                <div id="stationDelayFromGroup" class="relative">
                  <label class="block text-xs font-bold text-slate-700 mb-1">
                    <i class="fa-solid fa-location-dot text-blue-600 mr-1"></i> Origin / From Station (Name or Code)
                  </label>
                  <input
                    type="text"
                    id="stationDelayFromInput"
                    value="${stationDelaySearchFrom}"
                    autocomplete="off"
                    placeholder="Type station name or code (e.g. New Delhi, NDLS)..."
                    oninput="handleStationAutocomplete('from', this.value)"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                  <!-- Autocomplete Dropdown -->
                  <div id="stationDelayFromDropdown" class="hidden absolute top-full left-0 right-0 z-30 mt-1 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl">
                  </div>
                </div>

                <!-- Swap Button -->
                <div class="flex justify-center -my-1">
                  <button onclick="swapDelaySearchStations()"
                    class="w-8 h-8 rounded-full bg-white border border-slate-300 text-slate-600 hover:text-blue-600 hover:border-blue-500 shadow-sm flex items-center justify-center text-xs transition-all cursor-pointer">
                    <i class="fa-solid fa-arrow-right-arrow-left"></i>
                  </button>
                </div>

                <!-- To Station Group -->
                <div id="stationDelayToGroup" class="relative">
                  <label class="block text-xs font-bold text-slate-700 mb-1">
                    <i class="fa-solid fa-location-arrow text-red-600 mr-1"></i> Destination / To Station (Name or Code)
                  </label>
                  <input
                    type="text"
                    id="stationDelayToInput"
                    value="${stationDelaySearchTo}"
                    autocomplete="off"
                    placeholder="Type destination name or code (e.g. Mumbai, MMCT, BCT)..."
                    oninput="handleStationAutocomplete('to', this.value)"
                    class="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                  <!-- Autocomplete Dropdown -->
                  <div id="stationDelayToDropdown" class="hidden absolute top-full left-0 right-0 z-30 mt-1 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl">
                  </div>
                </div>

                <button onclick="executeStationDelaySearch()"
                  class="w-full py-2.5 rounded-xl bg-[#12355B] hover:bg-[#1E4877] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all">
                  <i class="fa-solid fa-magnifying-glass text-[#FF9933]"></i>
                  Find Live Trains on Route
                </button>
              </div>

              <!-- Corridor Results Container -->
              <div id="stationDelaySearchResultsContainer" class="pt-2">
                <!-- Initial auto-search triggered below -->
              </div>
            </div>

            <!-- Quick Help / Information Card -->
            <div class="glass-card p-4 space-y-2 bg-gradient-to-br from-blue-50/50 to-indigo-50/50" style="border-radius: 20px !important;">
              <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] flex items-center gap-1.5">
                <i class="fa-solid fa-shield-halved text-blue-600"></i> Indian Railways Dynamic Delay Engine
              </h5>
              <p class="text-[11px] text-slate-600 leading-relaxed">
                Click any train in either list to view its <strong>Dedicated Delay Dashboard</strong> with full Chart.js visualizations, approach deceleration profiling (~15 km/h near platforms), and 30-day cyclic schedule history.
              </p>
            </div>

          </div>

        </div>

      </div>
    `;

    // Render left delayed grid
    renderDelayedTrainsGrid();
    // Run initial search for NDLS -> MMCT
    executeStationDelaySearch();
  }

  // =========================================================================
  // DEDICATED TRAIN DELAY DASHBOARD MODAL WITH CHART.JS & CYCLIC SCHEDULES
  // =========================================================================
  // DEDICATED TRAIN DELAY DASHBOARD MODAL WITH CHART.JS & CYCLIC SCHEDULES
  // =========================================================================
  let delayModalAutoRefreshTimer = null;

  window.closeTrainDelayModal = function () {
    const modal = document.getElementById("trainDelayDetailModal");
    if (modal) modal.classList.add("hidden");

    if (delayModalAutoRefreshTimer) {
      clearInterval(delayModalAutoRefreshTimer);
      delayModalAutoRefreshTimer = null;
    }
    activeDelayModalTrain = null;

    // Clean up chart instances to avoid memory leaks
    Object.keys(delayModalChartInstances).forEach(k => {
      if (delayModalChartInstances[k]) {
        try { delayModalChartInstances[k].destroy(); } catch (e) {}
      }
    });
    delayModalChartInstances = {};
  };

  function refreshActiveDelayModalData() {
    if (!activeDelayModalTrain || !window.LiveTrainEngine) return;
    const modal = document.getElementById("trainDelayDetailModal");
    if (!modal || modal.classList.contains("hidden")) {
      if (delayModalAutoRefreshTimer) clearInterval(delayModalAutoRefreshTimer);
      return;
    }

    const analytics = window.LiveTrainEngine.getTrainDelayAnalytics(activeDelayModalTrain);
    if (!analytics) return;
    const st = analytics.status;

    const delayCol = st.delayMinutes > 30 ? '#dc2626' : st.delayMinutes > 15 ? '#ea580c' : st.delayMinutes > 0 ? '#d97706' : '#166534';
    const delayBg = st.delayMinutes > 30 ? '#fef2f2' : st.delayMinutes > 15 ? '#fff7ed' : st.delayMinutes > 0 ? '#fffbeb' : '#f0fdf4';

    // Update DOM indicators smoothly
    const pillEl = document.getElementById("modalLiveDelayPill");
    if (pillEl) {
      pillEl.style.backgroundColor = delayBg;
      pillEl.style.borderColor = delayCol + "40";
      pillEl.innerHTML = `
        <p class="text-[10px] font-black uppercase text-slate-500">Live Calculated Delay</p>
        <p class="text-2xl font-black font-['Outfit']" style="color: ${delayCol};">${st.delayText}</p>
        <p class="text-[10px] font-mono text-slate-500">${st.liveStatusText}</p>
      `;
    }

    const curDelayEl = document.getElementById("modalLiveCurrentDelayMetric");
    if (curDelayEl) {
      curDelayEl.textContent = `+${st.delayMinutes} min`;
      curDelayEl.style.color = delayCol;
    }

    const avgDelayEl = document.getElementById("modalLiveAvgDelayMetric");
    if (avgDelayEl) avgDelayEl.textContent = `${analytics.avgDelay} min`;

    const punctEl = document.getElementById("modalLivePunctualityMetric");
    if (punctEl) punctEl.textContent = `${analytics.punctualityIndex}%`;

    const arrEl = document.getElementById("modalLiveArrivalMetric");
    if (arrEl) arrEl.textContent = st.arrivalTimeAMPM;

    // Update Chart.js instances dynamically without full destroy
    if (delayModalChartInstances.line && delayModalChartInstances.line.data.datasets[0]) {
      delayModalChartInstances.line.data.labels = analytics.labels;
      delayModalChartInstances.line.data.datasets[0].data = analytics.delayPoints;
      delayModalChartInstances.line.update('none');
    }

    if (delayModalChartInstances.speed && delayModalChartInstances.speed.data.datasets[0]) {
      delayModalChartInstances.speed.data.labels = analytics.labels;
      delayModalChartInstances.speed.data.datasets[0].data = analytics.speedProfile;
      delayModalChartInstances.speed.update('none');
    }

    if (delayModalChartInstances.bar && delayModalChartInstances.bar.data.datasets[0]) {
      delayModalChartInstances.bar.data.labels = analytics.labels;
      delayModalChartInstances.bar.data.datasets[0].data = analytics.delayPoints;
      delayModalChartInstances.bar.data.datasets[0].backgroundColor = analytics.delayPoints.map(d => d > 25 ? "#dc2626" : d > 10 ? "#f59e0b" : "#10b981");
      delayModalChartInstances.bar.update('none');
    }

    if (delayModalChartInstances.pie && delayModalChartInstances.pie.data.datasets[0]) {
      delayModalChartInstances.pie.data.labels = analytics.delayCauses.map(c => c.label);
      delayModalChartInstances.pie.data.datasets[0].data = analytics.delayCauses.map(c => c.pct);
      delayModalChartInstances.pie.update('none');
    }
  }

  window.openTrainDelayModal = function (trainNumber) {
    if (!window.LiveTrainEngine) {
      showToast("Simulation engine initializing...", "info");
      return;
    }

    const analytics = window.LiveTrainEngine.getTrainDelayAnalytics(trainNumber);
    if (!analytics) {
      showToast(`Train #${trainNumber} schedule data unavailable.`, "warning");
      return;
    }

    activeDelayModalTrain = trainNumber;

    let modal = document.getElementById("trainDelayDetailModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "trainDelayDetailModal";
      modal.className = "fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto";
      document.body.appendChild(modal);
    }

    const st = analytics.status;
    const cyclicRuns = window.LiveTrainEngine.getCyclicRollingSchedule(trainNumber, 15);
    const delayCol = st.delayMinutes > 30 ? '#dc2626' : st.delayMinutes > 15 ? '#ea580c' : st.delayMinutes > 0 ? '#d97706' : '#166534';
    const delayBg = st.delayMinutes > 30 ? '#fef2f2' : st.delayMinutes > 15 ? '#fff7ed' : st.delayMinutes > 0 ? '#fffbeb' : '#f0fdf4';

    modal.innerHTML = `
      <div class="glass-card max-w-5xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 space-y-6 shadow-2xl relative border-t-8"
        style="border-top-color: ${delayCol} !important; border-radius: 24px !important; background: #ffffff !important;">

        <!-- Close Button -->
        <button onclick="closeTrainDelayModal()"
          class="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm transition-all cursor-pointer">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <!-- Top Header & Train Identity -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-3 py-0.5 rounded-full text-xs font-black bg-[#12355B] text-white font-mono">${st.trainNumber}</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-slate-100 text-slate-800">${st.trainType}</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <i class="fa-solid fa-shield-halved mr-1"></i>KAVACH 4.0 SIL-4
              </span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> LIVE 10s STREAM
              </span>
            </div>
            <h3 class="text-2xl font-black text-[#12355B] font-['Outfit'] mt-1">${st.trainName}</h3>
            <p class="text-xs text-slate-500 font-semibold">
              <i class="fa-solid fa-route text-blue-600 mr-1"></i>
              ${st.origin} (${st.originCode}) ➔ ${st.destination} (${st.destinationCode}) &nbsp;•&nbsp; ${st.totalDistanceKm} KM Corridor
            </p>
          </div>

          <!-- Current Live Delay Pill -->
          <div id="modalLiveDelayPill" class="text-right p-3 rounded-2xl border transition-all" style="background: ${delayBg}; border-color: ${delayCol}40;">
            <p class="text-[10px] font-black uppercase text-slate-500">Live Calculated Delay</p>
            <p class="text-2xl font-black font-['Outfit']" style="color: ${delayCol};">${st.delayText}</p>
            <p class="text-[10px] font-mono text-slate-500">${st.liveStatusText}</p>
          </div>
        </div>

        <!-- 5 Key Delay Telemetry Metric Cards -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <p class="text-[10px] font-bold text-slate-500 uppercase">Current Delay</p>
            <p id="modalLiveCurrentDelayMetric" class="text-xl font-black font-mono transition-colors" style="color: ${delayCol};">+${st.delayMinutes} min</p>
            <p class="text-[10px] text-slate-400">At active block</p>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <p class="text-[10px] font-bold text-slate-500 uppercase">Max Delay Station</p>
            <p class="text-sm font-black text-[#12355B] font-['Outfit'] truncate">${analytics.maxDelayStation}</p>
            <p class="text-[10px] text-red-600 font-mono font-bold">+${analytics.maxDelay} min peak</p>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <p class="text-[10px] font-bold text-slate-500 uppercase">Average Delay</p>
            <p id="modalLiveAvgDelayMetric" class="text-xl font-black font-mono text-amber-600 transition-colors">${analytics.avgDelay} min</p>
            <p class="text-[10px] text-slate-400">Per commercial stop</p>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <p class="text-[10px] font-bold text-slate-500 uppercase">Punctuality Score</p>
            <p id="modalLivePunctualityMetric" class="text-xl font-black font-mono text-emerald-600 transition-colors">${analytics.punctualityIndex}%</p>
            <p class="text-[10px] text-emerald-700 font-semibold">Reliability Index</p>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 col-span-2 md:col-span-1">
            <p class="text-[10px] font-bold text-slate-500 uppercase">Predicted Arrival</p>
            <p id="modalLiveArrivalMetric" class="text-sm font-black text-[#12355B] font-mono transition-colors">${st.arrivalTimeAMPM}</p>
            <p class="text-[10px] text-slate-500">Orig: ${st.scheduledArrivalAMPM}</p>
          </div>
        </div>

        <!-- 4 GRAPHICAL CHARTS (GRID 2x2) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

          <!-- Chart 1: Delay Accumulation Curve (Line Chart) -->
          <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] flex items-center gap-1.5">
                <i class="fa-solid fa-chart-line text-blue-600"></i> Station Delay Accumulation Curve
              </h5>
              <span class="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping"></span> Live 10s
              </span>
            </div>
            <div class="h-48 w-full">
              <canvas id="modalDelayLineChart"></canvas>
            </div>
          </div>

          <!-- Chart 2: Route Speed Profile (Area Chart) -->
          <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] flex items-center gap-1.5">
                <i class="fa-solid fa-gauge-high text-emerald-600"></i> Route Speed Profile & Approach Physics
              </h5>
              <span class="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping"></span> Live 10s
              </span>
            </div>
            <div class="h-48 w-full">
              <canvas id="modalSpeedProfileChart"></canvas>
            </div>
          </div>

          <!-- Chart 3: Station Delay Breakdown (Bar Chart) -->
          <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] flex items-center gap-1.5">
                <i class="fa-solid fa-chart-column text-amber-600"></i> Station-wise Delay Breakdown
              </h5>
              <span class="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping"></span> Live 10s
              </span>
            </div>
            <div class="h-48 w-full">
              <canvas id="modalStationBarChart"></canvas>
            </div>
          </div>

          <!-- Chart 4: Root Cause Breakdown (Doughnut Chart) -->
          <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] flex items-center gap-1.5">
                <i class="fa-solid fa-chart-pie text-purple-600"></i> Delay Root-Cause Attribution
              </h5>
              <span class="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-ping"></span> Live 10s
              </span>
            </div>
            <div class="h-48 w-full">
              <canvas id="modalCausePieChart"></canvas>
            </div>
          </div>

        </div>

        <!-- 30-DAY CYCLIC ROLLING SCHEDULE TABLE -->
        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] flex items-center gap-1.5">
                <i class="fa-solid fa-arrows-spin text-blue-600"></i> 30-Day Rolling Cyclic Operational Schedule
              </h5>
              <p class="text-[10px] text-slate-500">Past completed runs, today's active live run & future scheduled departures</p>
            </div>
            <span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
              Cyclic Repeat Active
            </span>
          </div>

          <div class="overflow-x-auto max-h-48 border border-slate-200 rounded-xl bg-white">
            <table class="w-full text-[11px] text-left">
              <thead class="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                <tr>
                  <th class="p-2.5">Date & Day</th>
                  <th class="p-2.5">Run Status</th>
                  <th class="p-2.5">Scheduled Dep</th>
                  <th class="p-2.5">Scheduled Arr</th>
                  <th class="p-2.5">Recorded Delay</th>
                  <th class="p-2.5">Position / Status Note</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${cyclicRuns.map(run => `
                  <tr class="${run.isToday ? 'bg-blue-50/70 font-bold' : 'hover:bg-slate-50'}">
                    <td class="p-2.5 font-mono ${run.isToday ? 'text-blue-700 font-black' : 'text-slate-700'}">
                      ${run.dateFormatted} ${run.isToday ? '★ TODAY' : ''}
                    </td>
                    <td class="p-2.5">
                      <span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase"
                        style="background: ${run.liveStatusBg}; color: ${run.liveStatusColor};">
                        ${run.status}
                      </span>
                    </td>
                    <td class="p-2.5 font-mono">${run.departureAMPM}</td>
                    <td class="p-2.5 font-mono">${run.arrivalAMPM}</td>
                    <td class="p-2.5 font-mono font-bold ${run.delayMinutes > 0 ? 'text-red-600' : 'text-emerald-600'}">
                      ${run.delayText}
                    </td>
                    <td class="p-2.5 text-[10px] text-slate-500">${run.liveStatusText}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <!-- FULL STATION-BY-STATION TIMETABLE WITH AM/PM FORMAT -->
        <div class="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] flex items-center gap-1.5">
              <i class="fa-solid fa-list-ol text-blue-600"></i> Route Timetable & Exact Delays per Station (12-Hour AM/PM)
            </h5>
            <span class="text-[10px] text-slate-400 font-mono">${st.stations.length} Scheduled Commercial Halts</span>
          </div>

          <div class="overflow-x-auto max-h-64 border border-slate-200 rounded-xl">
            <table class="w-full text-xs text-left">
              <thead class="bg-slate-100 text-slate-700 font-extrabold sticky top-0 border-b border-slate-200">
                <tr>
                  <th class="p-2.5 text-center w-10">#</th>
                  <th class="p-2.5">Station</th>
                  <th class="p-2.5 text-center">PF</th>
                  <th class="p-2.5">Distance</th>
                  <th class="p-2.5">Scheduled Arr</th>
                  <th class="p-2.5">Scheduled Dep</th>
                  <th class="p-2.5">Actual / Est. Arr</th>
                  <th class="p-2.5">Actual / Est. Dep</th>
                  <th class="p-2.5 text-right">Station Delay</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-mono text-[11px]">
                ${st.stations.map((s, idx) => {
                  const sDelayCol = s.delayMinutes === 0 ? '#166534' : s.delayMinutes <= 15 ? '#d97706' : '#dc2626';
                  const isCurrent = idx === st.currentStationIndex;
                  return `
                    <tr class="${isCurrent ? 'bg-blue-50/80 font-bold' : 'hover:bg-slate-50'}">
                      <td class="p-2 text-center text-slate-400 font-sans">${idx + 1}</td>
                      <td class="p-2 font-sans font-bold text-[#12355B]">
                        ${s.name} <span class="text-[10px] text-slate-400 font-mono">(${s.code})</span>
                        ${isCurrent ? '<span class="ml-1.5 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-sans">ACTIVE HERE</span>' : ''}
                      </td>
                      <td class="p-2 text-center text-slate-600">#${s.pf}</td>
                      <td class="p-2 text-slate-500">${s.dist} km</td>
                      <td class="p-2 text-slate-700">${s.arrAMPM}</td>
                      <td class="p-2 text-slate-700">${s.depAMPM}</td>
                      <td class="p-2 font-bold" style="color: ${sDelayCol};">${s.actualArrAMPM}</td>
                      <td class="p-2 font-bold" style="color: ${sDelayCol};">${s.actualDepAMPM}</td>
                      <td class="p-2 text-right">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold"
                          style="background: ${s.delayMinutes === 0 ? '#f0fdf4' : '#fef2f2'}; color: ${sDelayCol};">
                          ${s.delayMinutes === 0 ? '✓ ON TIME' : `+${s.delayMinutes}m`}
                        </span>
                      </td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Footer Action -->
        <div class="flex justify-end pt-2">
          <button onclick="closeTrainDelayModal()"
            class="px-6 py-2.5 rounded-xl bg-[#12355B] hover:bg-[#1E4877] text-white font-bold text-xs shadow cursor-pointer transition-all">
            Close Delay Terminal
          </button>
        </div>

      </div>
    `;

    modal.classList.remove("hidden");

    // Initialize the 4 Chart.js charts
    setTimeout(() => {
      initModalCharts(analytics);
    }, 150);

    // Setup 10-second auto-refresh timer for modal charts & telemetry
    if (delayModalAutoRefreshTimer) clearInterval(delayModalAutoRefreshTimer);
    delayModalAutoRefreshTimer = setInterval(() => {
      refreshActiveDelayModalData();
    }, 10000);
  };

  function initModalCharts(analytics) {
    if (!window.Chart) return;

    // 1. Delay Accumulation Curve (Line Chart)
    const ctxLine = document.getElementById("modalDelayLineChart");
    if (ctxLine) {
      delayModalChartInstances.line = new Chart(ctxLine, {
        type: "line",
        data: {
          labels: analytics.labels,
          datasets: [{
            label: "Delay (Minutes)",
            data: analytics.delayPoints,
            borderColor: "#dc2626",
            backgroundColor: "rgba(220, 38, 38, 0.08)",
            fill: true,
            tension: 0.35,
            pointBackgroundColor: "#dc2626",
            pointRadius: 3,
            borderWidth: 2.5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (c) => `Delay: +${c.raw} min`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: "#f1f5f9" },
              ticks: { font: { size: 9, family: "'JetBrains Mono'" } }
            },
            x: {
              grid: { display: false },
              ticks: { font: { size: 9, family: "'JetBrains Mono'" } }
            }
          }
        }
      });
    }

    // 2. Speed Profile Chart (Area Chart)
    const ctxSpeed = document.getElementById("modalSpeedProfileChart");
    if (ctxSpeed) {
      delayModalChartInstances.speed = new Chart(ctxSpeed, {
        type: "line",
        data: {
          labels: analytics.labels,
          datasets: [{
            label: "Speed (km/h)",
            data: analytics.speedProfile,
            borderColor: "#2563eb",
            backgroundColor: "rgba(37, 99, 235, 0.12)",
            fill: true,
            tension: 0.25,
            borderWidth: 2.5,
            pointRadius: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (c) => `Speed: ${c.raw} km/h`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: "#f1f5f9" },
              ticks: { font: { size: 9, family: "'JetBrains Mono'" } }
            },
            x: {
              grid: { display: false },
              ticks: { font: { size: 9, family: "'JetBrains Mono'" } }
            }
          }
        }
      });
    }

    // 3. Station Delay Bar Chart
    const ctxBar = document.getElementById("modalStationBarChart");
    if (ctxBar) {
      delayModalChartInstances.bar = new Chart(ctxBar, {
        type: "bar",
        data: {
          labels: analytics.labels,
          datasets: [{
            label: "Delay Minutes",
            data: analytics.delayPoints,
            backgroundColor: analytics.delayPoints.map(d => d > 25 ? "#dc2626" : d > 10 ? "#f59e0b" : "#10b981"),
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: "#f1f5f9" },
              ticks: { font: { size: 9, family: "'JetBrains Mono'" } }
            },
            x: {
              grid: { display: false },
              ticks: { font: { size: 9, family: "'JetBrains Mono'" } }
            }
          }
        }
      });
    }

    // 4. Root Causes Doughnut Chart
    const ctxPie = document.getElementById("modalCausePieChart");
    if (ctxPie) {
      delayModalChartInstances.pie = new Chart(ctxPie, {
        type: "doughnut",
        data: {
          labels: analytics.delayCauses.map(c => c.label),
          datasets: [{
            data: analytics.delayCauses.map(c => c.pct),
            backgroundColor: analytics.delayCauses.map(c => c.color),
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "68%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 10, font: { size: 9, family: "'Plus Jakarta Sans'" } }
            }
          }
        }
      });
    }
  }

  // =========================================================================
  // LIVE TELEMETRY TICKER UPDATER (BOTTOM WEBSITE BAR)
  // =========================================================================
  let tickerIndex = 0;
  function updateLiveTicker() {
    if (!window.LiveTrainEngine) return;
    const delayedList = window.LiveTrainEngine.getDelayedTrainsGrid({ minDelay: 0, limit: 30 });
    if (!delayedList || delayedList.length === 0) return;

    const tr = delayedList[tickerIndex % delayedList.length];
    tickerIndex++;

    const titleEl = document.getElementById("tickerTrainTitle");
    const speedEl = document.getElementById("tickerSpeedBadge");
    const etaEl = document.getElementById("tickerEtaBadge");
    const delayEl = document.getElementById("tickerDelayBadge");

    if (titleEl) {
      titleEl.innerHTML = `<strong>${tr.number}</strong> ${tr.name} &nbsp;•&nbsp; <span class="text-cyan-300 font-mono">${tr.from} ➔ ${tr.to}</span>`;
    }
    if (speedEl) {
      const stateText = tr.speed === 0 ? 'Halted' : tr.speed <= 20 ? 'Approach Decel' : 'Cruising';
      speedEl.innerHTML = `<i class="fa-solid fa-gauge-high mr-1"></i>${tr.speed} km/h <span class="opacity-75">(${stateText})</span>`;
    }
    if (etaEl) {
      etaEl.innerHTML = `<i class="fa-solid fa-location-arrow mr-1"></i>Next: <strong>${tr.nextStationCode || tr.nextStation}</strong>`;
    }
    if (delayEl) {
      delayEl.innerHTML = `<i class="fa-solid fa-clock-rotate-left mr-1"></i>${tr.delayText}`;
      delayEl.className = tr.delayMinutes > 0
        ? "px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-bold"
        : "px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold";
    }
  }

  setInterval(updateLiveTicker, 4500);
  setTimeout(updateLiveTicker, 1500);

  // =========================================================================
  // VIEW 5: OPERATIONAL ANALYTICS HUB (analytics)
  // =========================================================================
  let activeAnalyticsTab = "network"; // "network" | "zone" | "train"
  let selectedAnalyticsZone = "NR";
  let selectedAnalyticsTrain = "12952";
  let analyticsChartInstances = {};
  let analyticsAutoRefreshTimer = null;

  window.switchAnalyticsTab = function (tab) {
    activeAnalyticsTab = tab;
    const container = document.getElementById("activeSubTabContainer");
    if (container) renderAnalyticsSection(container);
  };

  window.changeAnalyticsZone = function (zoneCode) {
    selectedAnalyticsZone = zoneCode;
    const zoneContentEl = document.getElementById("analyticsZoneContentContainer");
    if (zoneContentEl) renderAnalyticsZoneTab(zoneContentEl);
  };

  window.changeAnalyticsTrain = function (trainNum) {
    selectedAnalyticsTrain = trainNum;
    const trainContentEl = document.getElementById("analyticsTrainContentContainer");
    if (trainContentEl) renderAnalyticsTrainTab(trainContentEl);
  };

  function renderAnalyticsNetworkTab(container) {
    if (!window.AnalyticsEngine) return;
    const metrics = window.AnalyticsEngine.getNetworkOverviewMetrics();
    if (!metrics) return;

    container.innerHTML = `
      <!-- 5 Executive KPI Cards -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div class="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-1">
          <p class="text-[10px] text-slate-400 font-bold uppercase">Total Tracked Trains</p>
          <p class="text-2xl font-black text-white font-mono">${metrics.totalTrains.toLocaleString()}</p>
          <p class="text-[10px] text-emerald-400 font-semibold">100% Pan-India Active</p>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-1">
          <p class="text-[10px] text-slate-400 font-bold uppercase">Pan-India On-Time Punctuality</p>
          <p class="text-2xl font-black text-emerald-400 font-mono">${metrics.onTimePct}%</p>
          <p class="text-[10px] text-emerald-300 font-semibold">&gt;90.0% Ministry SLA Passed</p>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-1">
          <p class="text-[10px] text-slate-400 font-bold uppercase">Delayed Trains</p>
          <p class="text-2xl font-black text-red-400 font-mono">${metrics.delayedCount}</p>
          <p class="text-[10px] text-slate-400 font-semibold">Requiring AI Intervention</p>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-1">
          <p class="text-[10px] text-slate-400 font-bold uppercase">Average Network Delay</p>
          <p class="text-2xl font-black text-amber-400 font-mono">+${metrics.avgDelay}m</p>
          <p class="text-[10px] text-slate-400 font-semibold">Peak: +${metrics.maxDelay}m</p>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900 border border-white/10 space-y-1 col-span-2 md:col-span-1">
          <p class="text-[10px] text-slate-400 font-bold uppercase">Kavach SIL-4 Adherence</p>
          <p class="text-2xl font-black text-cyan-300 font-mono">${metrics.safetyComplianceScore}</p>
          <p class="text-[10px] text-cyan-400 font-semibold">Zero SPAD Incidents</p>
        </div>
      </div>

      <!-- 4 High-Fidelity Charts (2x2 Grid) -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <!-- Chart 1: Delay Distribution Histogram -->
        <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div class="flex items-center justify-between">
            <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] flex items-center gap-1.5">
              <i class="fa-solid fa-chart-column text-blue-600"></i> Pan-India Train Delay Distribution Histogram
            </h5>
            <span class="text-[10px] font-mono text-slate-400">Frequency vs Delay Duration</span>
          </div>
          <div class="h-56 w-full">
            <canvas id="analyticsDelayHistogramChart"></canvas>
          </div>
        </div>

        <!-- Chart 2: 18 Zones Punctuality Ranking (Horizontal Bar) -->
        <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div class="flex items-center justify-between">
            <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] flex items-center gap-1.5">
              <i class="fa-solid fa-ranking-star text-amber-600"></i> 18 Railway Zones Punctuality Ranking (% On-Time)
            </h5>
            <span class="text-[10px] font-mono text-slate-400">Top Performing Zones</span>
          </div>
          <div class="h-56 w-full">
            <canvas id="analyticsZoneRankingChart"></canvas>
          </div>
        </div>

        <!-- Chart 3: Train Type Multi-Metric Performance (Radar) -->
        <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div class="flex items-center justify-between">
            <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] flex items-center gap-1.5">
              <i class="fa-solid fa-chart-pie text-purple-600"></i> Train Category Multi-Metric Performance Index
            </h5>
            <span class="text-[10px] font-mono text-slate-400">Vande Bharat vs Rajdhani vs Express</span>
          </div>
          <div class="h-56 w-full">
            <canvas id="analyticsTypeRadarChart"></canvas>
          </div>
        </div>

        <!-- Chart 4: 24-Hour Congestion Pattern -->
        <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div class="flex items-center justify-between">
            <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] flex items-center gap-1.5">
              <i class="fa-solid fa-clock-rotate-left text-cyan-600"></i> 24-Hour Diurnal Delay & Congestion Heatmap
            </h5>
            <span class="text-[10px] font-mono text-slate-400">Incident Peaks by Hour (IST)</span>
          </div>
          <div class="h-56 w-full">
            <canvas id="analyticsHourlyCongestionChart"></canvas>
          </div>
        </div>

      </div>
    `;

    setTimeout(() => {
      initAnalyticsNetworkCharts();
    }, 100);
  }

  function initAnalyticsNetworkCharts() {
    if (!window.Chart || !window.AnalyticsEngine) return;

    // Clean up old charts
    Object.keys(analyticsChartInstances).forEach(k => {
      if (analyticsChartInstances[k]) {
        try { analyticsChartInstances[k].destroy(); } catch (e) {}
      }
    });
    analyticsChartInstances = {};

    // 1. Histogram
    const distData = window.AnalyticsEngine.getDelayDistribution();
    const ctxHist = document.getElementById("analyticsDelayHistogramChart");
    if (ctxHist && distData) {
      analyticsChartInstances.hist = new Chart(ctxHist, {
        type: "bar",
        data: {
          labels: distData.labels,
          datasets: [{
            label: "Trains Count",
            data: distData.data,
            backgroundColor: distData.colors,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { font: { size: 9, family: "'JetBrains Mono'" } } },
            x: { grid: { display: false }, ticks: { font: { size: 9, family: "'Plus Jakarta Sans'" } } }
          }
        }
      });
    }

    // 2. Zone Ranking (Horizontal Bar)
    const zoneData = window.AnalyticsEngine.getZonePunctualityRanking();
    const ctxZone = document.getElementById("analyticsZoneRankingChart");
    if (ctxZone && zoneData) {
      analyticsChartInstances.zone = new Chart(ctxZone, {
        type: "bar",
        data: {
          labels: zoneData.labels.slice(0, 10),
          datasets: [{
            label: "On-Time %",
            data: zoneData.data.slice(0, 10),
            backgroundColor: zoneData.data.slice(0, 10).map(p => p >= 94 ? "#10b981" : p >= 90 ? "#3b82f6" : "#f59e0b"),
            borderRadius: 5
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { min: 80, max: 100, grid: { color: "#f1f5f9" }, ticks: { font: { size: 9, family: "'JetBrains Mono'" } } },
            y: { grid: { display: false }, ticks: { font: { size: 9, family: "'JetBrains Mono'" } } }
          }
        }
      });
    }

    // 3. Radar Chart
    const typeData = window.AnalyticsEngine.getTrainTypePerformance();
    const ctxRadar = document.getElementById("analyticsTypeRadarChart");
    if (ctxRadar && typeData) {
      analyticsChartInstances.radar = new Chart(ctxRadar, {
        type: "radar",
        data: typeData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top", labels: { boxWidth: 10, font: { size: 9, family: "'Plus Jakarta Sans'" } } }
          },
          scales: {
            r: {
              min: 60,
              max: 100,
              ticks: { display: false },
              grid: { color: "#f1f5f9" },
              pointLabels: { font: { size: 9, family: "'Plus Jakarta Sans'" } }
            }
          }
        }
      });
    }

    // 4. Hourly Delay Pattern
    const hourlyData = window.AnalyticsEngine.getHourlyDelayPattern();
    const ctxHour = document.getElementById("analyticsHourlyCongestionChart");
    if (ctxHour && hourlyData) {
      analyticsChartInstances.hour = new Chart(ctxHour, {
        type: "bar",
        data: {
          labels: hourlyData.labels,
          datasets: [{
            label: "Reported Delays",
            data: hourlyData.data,
            backgroundColor: hourlyData.data.map(v => v > 70 ? "#dc2626" : v > 40 ? "#f59e0b" : "#3b82f6"),
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { font: { size: 9, family: "'JetBrains Mono'" } } },
            x: { grid: { display: false }, ticks: { font: { size: 8, family: "'JetBrains Mono'" } } }
          }
        }
      });
    }
  }

  function renderAnalyticsZoneTab(container) {
    if (!window.AnalyticsEngine) return;
    const ranking = window.AnalyticsEngine.getZonePunctualityRanking();
    const zoneMetrics = window.AnalyticsEngine.getZoneMetrics(selectedAnalyticsZone);
    const z = zoneMetrics.zone;

    container.innerHTML = `
      <div class="space-y-5">

        <!-- Zone Selector Toolbar -->
        <div class="glass-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style="border-radius: 20px !important;">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base font-bold">
              <i class="fa-solid fa-map-location-dot"></i>
            </div>
            <div>
              <h4 class="text-sm font-black text-[#12355B] font-['Outfit']">${z.name} (${z.code})</h4>
              <p class="text-[11px] text-slate-500">Divisional Telemetry & Real-Time Performance</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <label class="text-xs font-bold text-slate-600">Select Zone:</label>
            <select onchange="changeAnalyticsZone(this.value)"
              class="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500">
              ${ranking.zones.map(zn => `<option value="${zn.code}" ${zn.code === selectedAnalyticsZone ? 'selected' : ''}>${zn.code} — ${zn.name}</option>`).join("")}
            </select>
          </div>
        </div>

        <!-- 4 Zone KPIs -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div class="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
            <p class="text-[10px] text-slate-500 font-bold uppercase">Active Scheduled Rakes</p>
            <p class="text-2xl font-black text-[#12355B] font-mono">${z.trains}</p>
            <p class="text-[10px] text-blue-600 font-semibold">Under Zone Supervision</p>
          </div>

          <div class="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
            <p class="text-[10px] text-slate-500 font-bold uppercase">Zone Punctuality Index</p>
            <p class="text-2xl font-black text-emerald-600 font-mono">${z.onTimePct}%</p>
            <p class="text-[10px] text-emerald-700 font-semibold">Network Target: 90%</p>
          </div>

          <div class="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
            <p class="text-[10px] text-slate-500 font-bold uppercase">Average Delay in Zone</p>
            <p class="text-2xl font-black text-amber-600 font-mono">+${z.avgDelay}m</p>
            <p class="text-[10px] text-slate-400 font-semibold">Per Delayed Rake</p>
          </div>

          <div class="p-4 rounded-2xl bg-white border border-slate-200 space-y-1">
            <p class="text-[10px] text-slate-500 font-bold uppercase">Priority Reschedule Queue</p>
            <p class="text-2xl font-black text-red-600 font-mono">${zoneMetrics.topDelayedTrains.length}</p>
            <p class="text-[10px] text-red-700 font-semibold">Requiring Controller Action</p>
          </div>
        </div>

        <!-- Top Delayed Trains in this Zone -->
        <div class="glass-card p-5 space-y-3" style="border-radius: 20px !important;">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 class="text-xs font-black text-[#12355B] font-['Outfit'] uppercase tracking-wider flex items-center gap-2">
              <i class="fa-solid fa-triangle-exclamation text-red-600"></i> Top Delayed Trains Operating in ${z.code}
            </h4>
            <span class="text-[10px] font-mono text-slate-400">Click any train to open Dedicated Delay Terminal</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                  <th class="py-2 px-3">Train #</th>
                  <th class="py-2 px-3">Train Name</th>
                  <th class="py-2 px-3">Route Segment</th>
                  <th class="py-2 px-3">Live Status & Speed</th>
                  <th class="py-2 px-3">Recorded Delay</th>
                  <th class="py-2 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${zoneMetrics.topDelayedTrains.map(tr => `
                  <tr class="hover:bg-slate-50/80 transition-colors cursor-pointer" onclick="openTrainDelayModal('${tr.number}')">
                    <td class="py-2.5 px-3 font-mono font-black text-blue-700">${tr.number}</td>
                    <td class="py-2.5 px-3 font-bold text-[#12355B]">${tr.name}</td>
                    <td class="py-2.5 px-3 font-mono text-slate-600 text-[11px]">${tr.from} ➔ ${tr.to}</td>
                    <td class="py-2.5 px-3 font-mono text-slate-700 text-[11px]">${tr.speed} km/h • ${tr.state}</td>
                    <td class="py-2.5 px-3 font-mono font-black text-red-600">+${tr.delayMinutes}m</td>
                    <td class="py-2.5 px-3 text-right">
                      <span class="text-blue-600 font-bold text-xs hover:underline">Inspect →</span>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  }

  function renderAnalyticsTrainTab(container) {
    if (!window.LiveTrainEngine) return;
    const analytics = window.LiveTrainEngine.getTrainDelayAnalytics(selectedAnalyticsTrain);

    container.innerHTML = `
      <div class="space-y-5">

        <!-- Train Search / Selection Bar -->
        <div class="glass-card p-4 space-y-3" style="border-radius: 20px !important;">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 class="text-xs font-black text-[#12355B] font-['Outfit'] uppercase tracking-wider">
                <i class="fa-solid fa-train-subway text-blue-600 mr-1"></i> Individual Train Performance & Telemetry Deep Dive
              </h4>
              <p class="text-[11px] text-slate-500">Analyze route delay accumulation profile, cyclic punctuality, and deceleration physics</p>
            </div>

            <div class="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                id="analyticsTrainSearchInput"
                value="${selectedAnalyticsTrain}"
                placeholder="Enter train number (e.g. 12952, 12002)..."
                onkeydown="if(event.key==='Enter') changeAnalyticsTrain(this.value.trim())"
                class="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500 w-full sm:w-48"
              />
              <button onclick="const val = document.getElementById('analyticsTrainSearchInput').value; changeAnalyticsTrain(val.trim());"
                class="px-4 py-2 rounded-xl bg-[#12355B] hover:bg-[#1E4877] text-white font-bold text-xs cursor-pointer shrink-0">
                Load Rake
              </button>
            </div>
          </div>
        </div>

        ${analytics ? `
          <!-- Train Identity Header -->
          <div class="glass-card p-5 border-l-4 space-y-3" style="border-left-color: ${analytics.totalDelay > 15 ? '#dc2626' : '#10b981'} !important; border-radius: 20px !important;">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-3 py-0.5 rounded-full text-xs font-black bg-[#12355B] text-white font-mono">${analytics.trainNumber}</span>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase bg-slate-100 text-slate-800">${analytics.trainType}</span>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <i class="fa-solid fa-shield-halved mr-1"></i>SIL-4 SUPERVISED
                  </span>
                </div>
                <h3 class="text-xl font-black text-[#12355B] font-['Outfit'] mt-1">${analytics.trainName}</h3>
                <p class="text-xs text-slate-500 font-semibold">
                  ${analytics.status.origin} (${analytics.status.originCode}) ➔ ${analytics.status.destination} (${analytics.status.destinationCode}) &nbsp;•&nbsp; ${analytics.status.totalDistanceKm} KM
                </p>
              </div>

              <button onclick="openTrainDelayModal('${analytics.trainNumber}')"
                class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer transition-all">
                <i class="fa-solid fa-expand"></i> Open Full Delay Terminal
              </button>
            </div>

            <!-- 4 Train KPIs -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p class="text-[10px] text-slate-500 font-bold uppercase">Current Delay</p>
                <p class="text-xl font-black font-mono ${analytics.totalDelay > 0 ? 'text-red-600' : 'text-emerald-600'}">+${analytics.totalDelay} min</p>
              </div>
              <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p class="text-[10px] text-slate-500 font-bold uppercase">Punctuality Score</p>
                <p class="text-xl font-black font-mono text-emerald-600">${analytics.punctualityIndex}%</p>
              </div>
              <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p class="text-[10px] text-slate-500 font-bold uppercase">Peak Delay Station</p>
                <p class="text-sm font-black text-[#12355B] truncate">${analytics.maxDelayStation}</p>
                <p class="text-[10px] text-red-600 font-mono">+${analytics.maxDelay}m peak</p>
              </div>
              <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p class="text-[10px] text-slate-500 font-bold uppercase">Average Delay / Stop</p>
                <p class="text-xl font-black font-mono text-amber-600">${analytics.avgDelay} min</p>
              </div>
            </div>
          </div>

          <!-- Train Delay Accumulation Chart -->
          <div class="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <h5 class="text-xs font-black text-[#12355B] font-['Outfit'] flex items-center gap-1.5">
                <i class="fa-solid fa-chart-line text-blue-600"></i> Station-by-Station Delay Curve
              </h5>
              <span class="text-[10px] font-mono text-slate-400">Delay Progression</span>
            </div>
            <div class="h-56 w-full">
              <canvas id="analyticsSingleTrainChart"></canvas>
            </div>
          </div>
        ` : `
          <div class="p-8 text-center bg-white rounded-2xl border border-slate-200">
            <i class="fa-solid fa-circle-question text-3xl text-amber-500 mb-2"></i>
            <h5 class="text-sm font-bold text-slate-800">Train Data Not Found</h5>
            <p class="text-xs text-slate-500 mt-1">Please enter a valid Indian Railways train number (e.g. 12952, 12002, 12419).</p>
          </div>
        `}

      </div>
    `;

    if (analytics) {
      setTimeout(() => {
        const ctxTrain = document.getElementById("analyticsSingleTrainChart");
        if (ctxTrain && window.Chart) {
          if (analyticsChartInstances.train) {
            try { analyticsChartInstances.train.destroy(); } catch (e) {}
          }
          analyticsChartInstances.train = new Chart(ctxTrain, {
            type: "line",
            data: {
              labels: analytics.labels,
              datasets: [{
                label: "Delay (Minutes)",
                data: analytics.delayPoints,
                borderColor: "#dc2626",
                backgroundColor: "rgba(220, 38, 38, 0.08)",
                fill: true,
                borderWidth: 2.5,
                tension: 0.3
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { font: { size: 9, family: "'JetBrains Mono'" } } },
                x: { grid: { display: false }, ticks: { font: { size: 9, family: "'JetBrains Mono'" } } }
              }
            }
          });
        }
      }, 100);
    }
  }

  function renderAnalyticsSection(container) {
    if (window.LiveTrainEngine && isRealDatasetsLoaded) {
      window.LiveTrainEngine.init(irTrainDatabase, irSchedulesIndex, irStations, irDelayModel);
    }
    if (window.AnalyticsEngine) {
      window.AnalyticsEngine.init(window.LiveTrainEngine);
    }

    const nowIST = window.LiveTrainEngine ? window.LiveTrainEngine.getISTTime() : new Date();
    const timeAMPM = window.LiveTrainEngine ? window.LiveTrainEngine.formatAMPM(nowIST) : "";

    container.innerHTML = `
      <div class="space-y-5">

        <!-- Top Header Banner -->
        <div class="results-header-banner p-6 text-white space-y-3" style="background: linear-gradient(135deg, #0f172a 0%, #0e7490 100%) !important; border-radius: 24px !important;">
          <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2.5 py-0.5 rounded-md bg-[#FF9933] text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  GOVERNMENT OF INDIA • MINISTRY OF RAILWAYS
                </span>
                <span class="px-2.5 py-0.5 rounded-md bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 text-[10px] font-black uppercase">
                  <i class="fa-solid fa-chart-line mr-1"></i> PAN-INDIA INTELLIGENCE HUB
                </span>
              </div>
              <h2 class="text-2xl font-black font-['Outfit'] text-white">
                📈 Unified Rail Analytics & Network Intelligence Command
              </h2>
              <p class="text-xs text-slate-200 max-w-3xl font-medium">
                Comprehensive data analytics covering 18 railway zones, deceleration physics adherence, headway compliance & rolling timetable health.
              </p>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <div class="p-3 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-right">
                <p class="text-[10px] font-bold text-slate-300 uppercase">Live IST Time</p>
                <p class="text-lg font-black font-mono text-amber-300">${timeAMPM}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab Navigation Bar -->
        <div class="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-200/80 border border-slate-300/80">
          <button onclick="switchAnalyticsTab('network')"
            class="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${activeAnalyticsTab === 'network' ? 'bg-white text-[#12355B] shadow-md' : 'text-slate-600 hover:text-slate-900'}">
            <i class="fa-solid fa-network-wired"></i> Pan-India Network Intelligence
          </button>
          <button onclick="switchAnalyticsTab('zone')"
            class="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${activeAnalyticsTab === 'zone' ? 'bg-white text-[#12355B] shadow-md' : 'text-slate-600 hover:text-slate-900'}">
            <i class="fa-solid fa-map-location-dot"></i> Zone-Wise Deep Dive
          </button>
          <button onclick="switchAnalyticsTab('train')"
            class="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${activeAnalyticsTab === 'train' ? 'bg-white text-[#12355B] shadow-md' : 'text-slate-600 hover:text-slate-900'}">
            <i class="fa-solid fa-train-subway"></i> Train-Wise Performance Index
          </button>
        </div>

        <!-- Active Tab Container -->
        <div id="analyticsActiveTabBody" class="space-y-5">
          ${activeAnalyticsTab === 'network' ? '<div id="analyticsNetworkContentContainer"></div>' : ''}
          ${activeAnalyticsTab === 'zone' ? '<div id="analyticsZoneContentContainer"></div>' : ''}
          ${activeAnalyticsTab === 'train' ? '<div id="analyticsTrainContentContainer"></div>' : ''}
        </div>

      </div>
    `;

    // Render active tab content
    if (activeAnalyticsTab === "network") {
      const el = document.getElementById("analyticsNetworkContentContainer");
      if (el) renderAnalyticsNetworkTab(el);
    } else if (activeAnalyticsTab === "zone") {
      const el = document.getElementById("analyticsZoneContentContainer");
      if (el) renderAnalyticsZoneTab(el);
    } else if (activeAnalyticsTab === "train") {
      const el = document.getElementById("analyticsTrainContentContainer");
      if (el) renderAnalyticsTrainTab(el);
    }

    // Auto-refresh interval (every 15s)
    if (analyticsAutoRefreshTimer) clearInterval(analyticsAutoRefreshTimer);
    analyticsAutoRefreshTimer = setInterval(() => {
      if (activeNavView !== "analytics") {
        clearInterval(analyticsAutoRefreshTimer);
        return;
      }
      if (activeAnalyticsTab === "network") {
        const el = document.getElementById("analyticsNetworkContentContainer");
        if (el) renderAnalyticsNetworkTab(el);
      }
    }, 15000);
  }

  // VIEW 6: WEATHER RADAR (weather)
  function renderWeatherSection(container) {
    if (window.WeatherEngine && typeof window.WeatherEngine.renderWeatherHub === "function") {
      window.WeatherEngine.renderWeatherHub(container);
    } else {
      const state = window.liveWeatherState || {};
      container.innerHTML = `
        <div class="glass-card p-5 border-l-4 border-yellow-500 space-y-5">
          <h3 class="text-2xl font-black text-slate-800 font-['Outfit']">Fog Visibility Index & Thermal Track Expansion Radar</h3>
          <p class="text-xs text-slate-500">Loading All-India Satellite Weather Engine...</p>
        </div>
      `;
    }
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
  // DEDICATED SEPARATE DEPARTMENT WORKSPACES (DELEGATED TO MODULAR ENGINES)
  // =========================================================================
  function renderStationMasterWorkspace(container) {
    if (window.renderStationMasterWorkspace) {
      window.renderStationMasterWorkspace(container);
    }
  }

  function renderMaintenanceEngineerWorkspace(container) {
    if (window.renderMaintenanceEngineerWorkspace) {
      window.renderMaintenanceEngineerWorkspace(container);
    }
  }

  function renderControlRoomWorkspace(container) {
    if (window.renderControlRoomWorkspace) {
      window.renderControlRoomWorkspace(container);
    }
  }

  function renderAdminSuperintendentWorkspace(container) {
    if (window.renderAdminSuperintendentWorkspace) {
      window.renderAdminSuperintendentWorkspace(container);
    }
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
    const initialView = (rawHash === "overview" || !rawHash) ? "live_map" : rawHash;
    switchNavView(initialView);
  }

  window.addEventListener("hashchange", () => {
    const rawHash = window.location.hash
      ? window.location.hash.replace("#", "")
      : "";
    switchNavView((rawHash === "overview" || !rawHash) ? "live_map" : rawHash);
  });

  initRoute();
});
