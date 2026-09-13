import React, { useState, useMemo } from 'react';
import {
  Flame,
  AlertTriangle,
  Radio,
  Wind,
  Truck,
  HeartPulse,
  Plus,
  Play,
  CheckCircle2,
  TrendingUp,
  Clock,
  ShieldAlert,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { useAirport } from '../../context/AirportContext';
import { OperationalDisruption } from '../../types/airport';

export const DisruptionPanel: React.FC = () => {
  const {
    disruptions,
    toggleDisruption,
    flights,
    runways,
    kpis,
    rerouteRunway,
    updateFlightDelay,
    divertFlight,
    addNewCustomScenario,
  } = useAirport();

  // Custom Scenario Builder form state
  const [scenarioTitle, setScenarioTitle] = useState<string>('');
  const [scenarioType, setScenarioType] = useState<OperationalDisruption['type']>('RUNWAY_CLOSURE');
  const [scenarioImpact, setScenarioImpact] = useState<string>('');
  const [showBuilder, setShowBuilder] = useState<boolean>(false);

  // Affected flights under active disruptions
  const affectedFlights = useMemo(() => {
    const activeDisruptions = disruptions.filter((d) => d.active);
    if (activeDisruptions.length === 0) return [];

    const closedRunwayIds = new Set(runways.filter((r) => !r.isOpen).map((r) => r.id));

    return flights.filter(
      (f) =>
        f.status !== 'DEPARTED' &&
        f.status !== 'CANCELLED' &&
        f.status !== 'DIVERTED' &&
        (closedRunwayIds.has(f.assignedRunway) || f.isEmergency || f.delayMinutes > 10)
    );
  }, [disruptions, runways, flights]);

  // Synthetic delay propagation curve data for visualization
  const delayCurveData = useMemo(() => {
    const points: { timeLabel: string; baselineDelay: number; activeDelay: number }[] = [];
    const baseDelay = kpis.averageDelayMinutes;
    const activeMultiplier = disruptions.filter((d) => d.active).length * 4.5;

    for (let i = 0; i <= 6; i++) {
      const timeMin = 510 + i * 15; // from 08:30 to 10:00
      const hrs = Math.floor(timeMin / 60);
      const m = timeMin % 60;
      const label = `${String(hrs).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

      // Baseline nominal delay curve
      const baseline = 2 + i * 0.8;
      // Disrupted cascaded delay curve
      const active = Math.round(baseline + (i * 2.2 + activeMultiplier * (i + 1)));

      points.push({
        timeLabel: label,
        baselineDelay: Math.round(baseline),
        activeDelay: active,
      });
    }
    return points;
  }, [kpis.averageDelayMinutes, disruptions]);

  const handleCreateCustomScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenarioTitle.trim()) return;

    addNewCustomScenario(
      scenarioTitle,
      scenarioType,
      scenarioImpact || 'Simulated operational emergency injected via AOCC Scenario Builder.'
    );

    setScenarioTitle('');
    setScenarioImpact('');
    setShowBuilder(false);
  };

  const getDisruptionIcon = (type: OperationalDisruption['type']) => {
    switch (type) {
      case 'RUNWAY_CLOSURE':
      case 'BIRD_STRIKE':
        return <Flame className="w-4 h-4 text-[#e0555a]" />;
      case 'WEATHER_CELL':
        return <Wind className="w-4 h-4 text-[#3b82f6]" />;
      case 'GROUND_STRIKE':
      case 'GATE_MAINTENANCE':
        return <Truck className="w-4 h-4 text-[#d4a94a]" />;
      case 'MEDICAL_EMERGENCY':
        return <HeartPulse className="w-4 h-4 text-[#e0555a] animate-pulse" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1220] text-white select-none overflow-y-auto p-4 space-y-5 font-sans">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-[#090d16] border border-[#1c2638] rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#d4a94a]" />
              DISRUPTION &amp; EMERGENCY SIMULATION ENGINE
            </h2>
            <span className="text-[10px] px-2 py-0.5 bg-[#d4a94a]/15 border border-[#d4a94a]/50 text-[#fde68a] rounded font-mono-hud font-semibold">
              Real-Time Cascade
            </span>
          </div>
          <p className="text-xs text-[#94a3b8] mt-1 font-normal">
            Toggle real-time operational hazards to inspect automated delay propagation, capacity degradation, and execute smart contingency reroutings.
          </p>
        </div>

        <button
          id="toggle-scenario-builder-btn"
          onClick={() => setShowBuilder(!showBuilder)}
          className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold rounded-lg text-xs transition flex items-center gap-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Inject Custom Scenario</span>
        </button>
      </div>

      {/* Scenario Builder Form (Expandable) */}
      {showBuilder && (
        <form
          onSubmit={handleCreateCustomScenario}
          className="p-4 bg-[#090d16] border border-[#222f46] rounded-xl space-y-3 animate-in fade-in text-xs"
        >
          <div className="text-xs font-semibold text-[#3b82f6] uppercase tracking-wider">
            Custom Emergency &amp; Disruption Scenario Builder
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-[#cbd5e1] font-semibold block mb-1 font-sans">Scenario Title</label>
              <input
                type="text"
                value={scenarioTitle}
                onChange={(e) => setScenarioTitle(e.target.value)}
                placeholder="e.g. Hydraulic Leak on Taxiway Bravo"
                required
                className="w-full bg-[#0d1220] border border-[#1c2638] rounded-lg p-2 text-xs text-white placeholder-[#64748b] focus:border-[#3b82f6] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-[#cbd5e1] font-semibold block mb-1 font-sans">Disruption Archetype</label>
              <select
                value={scenarioType}
                onChange={(e) => setScenarioType(e.target.value as OperationalDisruption['type'])}
                className="w-full bg-[#0d1220] border border-[#1c2638] rounded-lg p-2 text-xs text-white focus:border-[#3b82f6] focus:outline-none"
              >
                <option value="RUNWAY_CLOSURE">Runway Closure / FOD</option>
                <option value="WEATHER_CELL">Severe Thunderstorm / Windshear</option>
                <option value="GROUND_STRIKE">Ground Staff &amp; Refueling Stoppage</option>
                <option value="MEDICAL_EMERGENCY">Inbound Medical Priority</option>
                <option value="BIRD_STRIKE">Wildlife / Drone Encroachment</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-[#cbd5e1] font-semibold block mb-1 font-sans">Operational Impact Summary</label>
              <input
                type="text"
                value={scenarioImpact}
                onChange={(e) => setScenarioImpact(e.target.value)}
                placeholder="e.g. Delays arrivals by +25m and routes to alternate"
                className="w-full bg-[#0d1220] border border-[#1c2638] rounded-lg p-2 text-xs text-white placeholder-[#64748b] focus:border-[#3b82f6] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowBuilder(false)}
              className="px-3 py-1.5 bg-[#141d2d] hover:bg-[#1c2638] text-white font-normal border border-[#23354f] rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-[#090d16] font-semibold rounded-lg text-xs"
            >
              Arm &amp; Inject Incident
            </button>
          </div>
        </form>
      )}

      {/* Grid of Disruption Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {disruptions.map((disruption) => (
          <div
            key={disruption.id}
            id={`disruption-card-${disruption.id}`}
            className={`p-4 rounded-xl border transition-all ${
              disruption.active
                ? 'bg-[#e0555a]/10 border-[#e0555a]/80 shadow-[0_0_15px_rgba(224,85,90,0.15)]'
                : 'bg-[#090d16] border-[#1c2638] hover:border-[#2a384e]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#0d1220] border border-[#1c2638]">
                  {getDisruptionIcon(disruption.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm font-sans">{disruption.name}</h3>
                  <span className="text-[10px] text-[#94a3b8] font-mono-hud font-semibold uppercase tracking-wider block mt-0.5">
                    TYPE: {disruption.type}
                  </span>
                </div>
              </div>

              {/* Real-Time Toggle Switch */}
              <button
                id={`toggle-disruption-${disruption.id}`}
                onClick={() => toggleDisruption(disruption.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow ${
                  disruption.active
                    ? 'bg-[#e0555a] hover:bg-[#ef4444] text-white animate-pulse'
                    : 'bg-[#141d2d] hover:bg-[#1c2638] text-slate-200 border border-[#23354f]'
                }`}
              >
                {disruption.active ? 'INCIDENT ACTIVE' : 'SIMULATE'}
              </button>
            </div>

            <p className="text-xs text-slate-200 mt-3 bg-[#0d1220] p-2.5 rounded-lg border border-[#1c2638] leading-relaxed font-normal">
              {disruption.impactSummary}
            </p>

            <div className="flex items-center justify-between mt-3 text-[11px] text-[#94a3b8]">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#3b82f6]" />
                Auto Delay Propagation: Active
              </span>
              <span className={`font-mono-hud font-semibold ${disruption.active ? 'text-[#e0555a]' : 'text-[#64748b]'}`}>
                {disruption.active ? 'Propagating Delays...' : 'Standby'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Delay Propagation & Runway Throughput Visualizer */}
      <div className="bg-[#090d16] border border-[#1c2638] rounded-xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#3b82f6]" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider font-sans">
              Automated Delay Propagation Curve (Baseline vs Disrupted Scenario)
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-sans">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-3 h-0.5 bg-slate-400 inline-block" /> Nominal Baseline
            </div>
            <div className="flex items-center gap-1.5 text-[#e0555a] font-semibold">
              <span className="w-3 h-0.5 bg-[#e0555a] inline-block" /> Cascaded Delay
            </div>
          </div>
        </div>

        {/* Dynamic Vector SVG Delay Curve Chart */}
        <div className="relative h-44 w-full bg-[#0d1220] p-2 rounded-lg border border-[#1c2638]">
          <svg className="w-full h-full" viewBox="0 0 700 140" preserveAspectRatio="none">
            {/* Grid horizontal lines */}
            {[20, 50, 80, 110].map((y) => (
              <line key={y} x1="40" y1={y} x2="680" y2={y} stroke="#182232" strokeWidth="1" strokeDasharray="3 3" />
            ))}

            {/* Baseline Curve */}
            <polyline
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
              strokeDasharray="4 4"
              points={delayCurveData
                .map((d, i) => `${50 + i * 100},${120 - (d.baselineDelay / 60) * 100}`)
                .join(' ')}
            />

            {/* Disrupted Delay Curve Area */}
            <polygon
              fill="rgba(224, 85, 90, 0.15)"
              points={`50,120 ${delayCurveData
                .map((d, i) => `${50 + i * 100},${Math.max(10, 120 - (d.activeDelay / 60) * 100)}`)
                .join(' ')} 650,120`}
            />

            {/* Disrupted Delay Line */}
            <polyline
              fill="none"
              stroke="#e0555a"
              strokeWidth="2.5"
              points={delayCurveData
                .map((d, i) => `${50 + i * 100},${Math.max(10, 120 - (d.activeDelay / 60) * 100)}`)
                .join(' ')}
            />

            {/* Data Points */}
            {delayCurveData.map((d, i) => {
              const cx = 50 + i * 100;
              const cy = Math.max(10, 120 - (d.activeDelay / 60) * 100);

              return (
                <g key={i}>
                  <circle cx={cx} cy={cy} r="4" fill="#e0555a" stroke="#ffffff" strokeWidth="1.2" />
                  <text
                    x={cx}
                    y={cy - 8}
                    textAnchor="middle"
                    className="font-mono-hud text-[9px] font-semibold fill-[#fca5a5]"
                  >
                    +{d.activeDelay}m
                  </text>
                  <text
                    x={cx}
                    y="135"
                    textAnchor="middle"
                    className="font-mono-hud text-[8px] fill-slate-400"
                  >
                    {d.timeLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Affected Flights & Rapid Contingency Rerouting Actions */}
      <div className="bg-[#090d16] border border-[#1c2638] rounded-xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2 font-sans">
            <Flame className="w-4 h-4 text-[#e0555a]" />
            <span>Immediately Impacted Flights ({affectedFlights.length})</span>
          </div>
          <span className="text-[11px] text-[#94a3b8] font-normal font-sans">AOCC Contingency Action Controls</span>
        </div>

        {affectedFlights.length > 0 ? (
          <div className="space-y-2">
            {affectedFlights.map((flight) => {
              const runwayObj = runways.find((r) => r.id === flight.assignedRunway);
              const runwayClosed = runwayObj && !runwayObj.isOpen;
              const alternateRunway = runways.find((r) => r.isOpen && r.id !== flight.assignedRunway);

              return (
                <div
                  key={flight.id}
                  className="p-3 bg-[#0d1220] rounded-lg border border-[#1c2638] flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: flight.airlineColor || '#38bdf8' }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white tracking-tight font-mono-hud">{flight.flightNumber}</span>
                        <span className="text-[11px] text-[#94a3b8] font-mono-hud">({flight.aircraftType} &middot; Code [{flight.aircraftCode}])</span>
                        {runwayClosed && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#e0555a]/20 text-[#fca5a5] border border-[#e0555a] rounded font-mono-hud font-semibold">
                            Runway {flight.assignedRunway} Closed
                          </span>
                        )}
                        {flight.isEmergency && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-[#e0555a] text-white rounded font-mono-hud font-semibold animate-pulse">
                            MEDICAL PRIORITY
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#94a3b8] mt-0.5 font-normal">
                        Status: <strong className="text-[#3b82f6] font-mono-hud">{flight.status}</strong> &middot; Delay: <strong className="text-[#e0555a] font-mono-hud">+{flight.delayMinutes}m</strong> ({flight.delayReason || 'Disruption hold'})
                      </div>
                    </div>
                  </div>

                  {/* Immediate Contingency Action Buttons */}
                  <div className="flex items-center gap-2">
                    {runwayClosed && alternateRunway && (
                      <button
                        onClick={() => rerouteRunway(flight.id, alternateRunway.id)}
                        className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold rounded-lg text-xs transition flex items-center gap-1 shadow"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Reroute to {alternateRunway.designator}
                      </button>
                    )}

                    <button
                      onClick={() => updateFlightDelay(flight.id, 10, 'ATC Disruption holding stack')}
                      className="px-3 py-1.5 bg-[#141d2d] hover:bg-[#1c2638] text-white font-normal border border-[#23354f] rounded-lg text-xs"
                    >
                      Hold (+10m)
                    </button>

                    <button
                      onClick={() => divertFlight(flight.id, 'KOAK')}
                      className="px-3 py-1.5 bg-[#e0555a]/20 hover:bg-[#e0555a]/30 text-[#fca5a5] border border-[#e0555a]/70 rounded-lg text-xs font-semibold"
                    >
                      Divert (KOAK)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-[#0d1220] rounded-lg border border-[#1c2638] text-center text-[#94a3b8] text-xs flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
            No flight holding queues or critical runway conflicts detected under current parameters.
          </div>
        )}
      </div>
    </div>
  );
};
