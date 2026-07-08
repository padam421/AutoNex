# AI Powered Railway Dynamic Scheduling & Delay Management System

> **Indian Railway Network — Real Time Control Dashboard**
> Smart India Hackathon (SIH) Project

![Dashboard Preview](docs/screenshots/dashboard-preview.png)

## 🚂 About

An AI-powered real-time railway control dashboard for Indian Railways that provides:
- **Live Train Tracking** with interactive map
- **AI Conflict Detection & Resolution** between trains
- **Dynamic Rescheduling** with fuel saving optimization
- **Cascade Delay Prediction** across station networks
- **Kavach Safety Integration** monitoring
- **Weather Impact Analysis** on train operations
- **Track & Sensor Health** monitoring
- **Digital Twin Simulation** for train path visualization

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, Tailwind CSS v3, Vanilla JavaScript |
| Charts | Chart.js v4 |
| Maps | Leaflet.js v1.9 |
| Icons | Lucide Icons |
| Fonts | Google Fonts (Inter, Outfit, JetBrains Mono) |
| Backend | Node.js, Express.js |
| Database | JSON (mock) / MongoDB (production) |
| AI Engine | Custom JavaScript algorithms |

## 📁 Project Structure

```
railway-dashboard/
├── frontend/          # Client-side application
│   ├── src/pages/     # HTML pages (login, dashboard, etc.)
│   ├── src/css/       # Tailwind + custom CSS
│   ├── src/js/        # JavaScript modules
│   └── src/assets/    # Images, fonts, videos
├── backend/           # Server-side API
│   └── src/           # Controllers, models, routes, services
├── data/              # Mock data & schemas
│   ├── mock/          # JSON data files
│   ├── seed/          # Data generation scripts
│   └── schemas/       # JSON schemas
├── docs/              # Documentation
└── scripts/           # Build & deployment scripts
```

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ 
- npm v9+

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd railway-dashboard

# Install all dependencies
npm run install:all

# Generate mock data
npm run generate:data

# Start development
npm run dev
```

### Login Credentials (Demo)
| Username | Password | Role |
|---|---|---|
| controller1 | admin123 | Admin Controller |
| operator1 | oper123 | Train Operator |
| viewer1 | view123 | Read-only Viewer |

## 📊 Features

### 1. Dashboard (Main Control)
- Real-time KPI cards (Total Trains, On-Time %, Delays, AI Accuracy)
- Train Status Distribution chart
- Live Network Map
- AI Alerts feed
- Delay Trend graph
- Route Performance analysis
- Weather Summary

### 2. Live Train Map
- Interactive Leaflet.js map of Indian Railway network
- Real-time train position markers with color-coded status
- Station markers with popups
- Route polylines (Main Line, Loop Line, Other)

### 3. AI Conflict Resolution
- Automatic conflict detection between trains
- Priority-based alerts (High/Medium/Low)
- AI-recommended resolution actions
- Approve/Reject workflow

### 4. Rescheduling Engine
- Before vs After timeline comparison
- Overtake station recommendations
- Fuel saving calculations
- Impact analysis

### 5. Cascade Delay Prediction
- Station-to-station delay propagation visualization
- Predictive delay modeling

### 6. Analytics
- Daily/Weekly/Monthly views
- Delay Distribution charts
- Top Delay Routes ranking
- Fuel Savings tracking

### 7. Kavach Integration
- Safety system status monitoring
- Train protection count
- Communication status
- Emergency brake readiness

## 📡 API Endpoints

See [API Documentation](docs/API.md) for full details.

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## 🙏 Acknowledgments

- Indian Railways (data reference)
- Smart India Hackathon organizing committee
- OpenStreetMap contributors
- Chart.js & Leaflet.js communities
