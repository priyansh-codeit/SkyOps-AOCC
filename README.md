# SkyOps AOCC — Airport Operations Control Center

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

A real-time Airport Operations Control Center (AOCC) simulation and decision-support dashboard modeling airside traffic, ICAO gate stand allocations, turnaround workflows, and operational disruptions.

---

## 🛫 Features

- **Airside Spatial Radar**: Vector aerodrome map depicting runways, taxiways, and live aircraft movements with anti-collision callouts and full telemetry.
- **ICAO Gate Allocation Gantt**: Interactive drag-and-drop timeline enforcing ICAO Annex 14 aircraft code compatibility (Codes C–F) and minimum turnaround times (MTT).
- **Flight Information Display (FIDS)**: Filterable, sortable flight board with real-time tracking of 5-phase ground turnaround milestones.
- **Conflict Detection & Smart Resolutions**: Automated identification of gate double-bookings, aircraft size violations, and buffer infringements with 1-click corrective actions.
- **Disruption & Crisis Simulator**: Real-time injection of runway closures, weather cells, and emergencies with dynamic delay propagation curves and contingency rerouting.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion
- **Tooling**: Vite 6, tsx, esbuild
- **Icons & UI**: Lucide React

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 3. Build for Production
```bash
npm run build
```

---

## 📂 Project Structure

```
src/
├── components/
│   ├── ConflictModal/       # Conflict alerts & 1-click resolution actions
│   ├── DisruptionSimulator/ # Emergency simulator & delay propagation curves
│   ├── FlightBoard/         # FIDS flight table & turnaround dossiers
│   ├── GateManager/         # Interactive Gantt gate allocation planner
│   ├── GroundWeather/       # ATIS & runway crosswind indicators
│   ├── Header.tsx           # Master clock & operational KPIs
│   └── SpatialMap/          # Vector aerodrome radar & aircraft kinematics
├── context/
│   └── AirportContext.tsx   # Centralized simulation state engine
├── services/
│   ├── conflictEngine.ts    # ICAO validation & conflict detection rules
│   └── soundEffects.ts      # Aerodrome audio notifications
└── types/
    └── airport.ts           # Domain models, enums & interfaces
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
