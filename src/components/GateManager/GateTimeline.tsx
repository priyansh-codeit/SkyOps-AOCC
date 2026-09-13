import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  X,
  Layers,
  ChevronDown,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useAirport } from '../../context/AirportContext';
import { Gate, Flight, IcaoAircraftCode, OperationalConflict } from '../../types/airport';
import { canAircraftFitGate, MIN_TURNAROUND_TIMES } from '../../services/conflictEngine';

export const GateTimeline: React.FC = () => {
  const {
    flights,
    gates,
    conflicts,
    simTimeMinutes,
    reassignGate,
    executeResolution,
    updateFlightDelay,
  } = useAirport();

  // Drag-and-drop state
  const [draggedFlightId, setDraggedFlightId] = useState<string | null>(null);
  const [dragOverGateId, setDragOverGateId] = useState<string | null>(null);

  // Selected conflict for Smart Resolution Drawer
  const [activeResolutionConflict, setActiveResolutionConflict] = useState<OperationalConflict | null>(null);

  // Timeline window settings: 08:00 (480 mins) to 11:00 (660 mins)
  const timelineStartMins = 480;
  const timelineEndMins = 660;
  const totalMins = timelineEndMins - timelineStartMins;

  // Compute conflicts mapped by flight & gate
  const gateConflictsMap = useMemo(() => {
    const map = new Map<string, OperationalConflict[]>();
    for (const c of conflicts) {
      if (c.gateId) {
        const list = map.get(c.gateId) || [];
        list.push(c);
        map.set(c.gateId, list);
      }
    }
    return map;
  }, [conflicts]);

  const draggedFlight = useMemo(() => {
    return flights.find((f) => f.id === draggedFlightId) || null;
  }, [flights, draggedFlightId]);

  // Group gates by concourse
  const concourses: ('A' | 'B' | 'C' | 'REMOTE')[] = ['A', 'B', 'C', 'REMOTE'];

  const getConcourseLabel = (concourse: 'A' | 'B' | 'C' | 'REMOTE') => {
    switch (concourse) {
      case 'A':
        return 'Concourse A (International & Widebody - Max Code F/E/D)';
      case 'B':
        return 'Concourse B (Domestic Hub - Max Code C/D)';
      case 'C':
        return 'Concourse C (Regional & Low-Cost - Max Code C)';
      case 'REMOTE':
        return 'Remote Apron Stands & De-icing (Stands R1, R2, De-Ice)';
    }
  };

  // Convert simulation minutes to percentage along the timeline
  const getTimelinePercent = (timeMins: number) => {
    const clamped = Math.max(timelineStartMins, Math.min(timelineEndMins, timeMins));
    return ((clamped - timelineStartMins) / totalMins) * 100;
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, flightId: string) => {
    setDraggedFlightId(flightId);
    e.dataTransfer.setData('text/plain', flightId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, gateId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverGateId !== gateId) {
      setDragOverGateId(gateId);
    }
  };

  const handleDragLeave = () => {
    setDragOverGateId(null);
  };

  const handleDrop = (e: React.DragEvent, targetGateId: string | null) => {
    e.preventDefault();
    const flightId = e.dataTransfer.getData('text/plain') || draggedFlightId;
    setDragOverGateId(null);
    setDraggedFlightId(null);

    if (!flightId) return;
    reassignGate(flightId, targetGateId);

    // If an ICAO conflict is triggered or exists, highlight resolution prompt
    setTimeout(() => {
      const flightConflicts = conflicts.filter((c) => c.flightId === flightId);
      if (flightConflicts.length > 0) {
        setActiveResolutionConflict(flightConflicts[0]);
      }
    }, 100);
  };

  // Current simulation time cursor position %
  const simCursorPercent = getTimelinePercent(simTimeMinutes);

  return (
    <div className="flex flex-col h-full bg-[#0d1220] text-white select-none overflow-hidden font-sans">
      {/* Top Banner: Status & Drag Instructions */}
      <div className="p-3 bg-[#090d16] border-b border-[#1c2638] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white tracking-wide uppercase">ICAO Stand Allocation Planner</span>
            <span className="text-[10px] px-2 py-0.5 bg-[#111726] border border-[#1e2c44] text-[#3b82f6] rounded font-mono-hud font-semibold">
              Interactive Gantt &middot; Drag-and-Drop
            </span>
          </div>

          <div className="text-[11px] text-[#94a3b8] hidden md:block font-normal">
            Drag flights across gates to reassign. Size compatibility &amp; minimum turnaround buffer (MTT) validated in real time.
          </div>
        </div>

        {/* Conflicts Alert Button (Alert Red #e0555a) */}
        {conflicts.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#fca5a5] font-semibold flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-[#e0555a]" />
              {conflicts.length} Operational Conflict{conflicts.length > 1 ? 's' : ''} Active
            </span>
            <button
              onClick={() => setActiveResolutionConflict(conflicts[0])}
              className="px-2.5 py-1 bg-[#e0555a] hover:bg-[#ef4444] text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Smart Resolution
            </button>
          </div>
        )}
      </div>

      {/* Main Timeline Grid */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Timeline Header Scale (08:00 - 11:00) */}
        <div className="sticky top-0 bg-[#0d1220]/95 backdrop-blur-sm z-20 pb-2 border-b border-[#1c2638] flex items-center">
          <div className="w-44 shrink-0 text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider pl-2">
            Gate Stand / Capacity
          </div>
          <div className="flex-1 relative h-6 flex items-center">
            {[480, 510, 540, 570, 600, 630, 660].map((mins) => {
              const leftPct = getTimelinePercent(mins);
              const hrs = Math.floor(mins / 60);
              const m = mins % 60;
              const timeStr = `${String(hrs).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

              return (
                <div
                  key={mins}
                  className="absolute text-[11px] text-[#94a3b8] font-normal -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${leftPct}%` }}
                >
                  <span className="font-mono-hud font-semibold">{timeStr}</span>
                  <div className="w-px h-2 bg-[#1c2638] mt-0.5" />
                </div>
              );
            })}

            {/* Current Simulation Time Marker */}
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${simCursorPercent}%` }}
            >
              <div className="px-1.5 py-0.2 bg-[#e0555a] text-white text-[8px] font-mono-hud font-semibold rounded shadow">
                NOW
              </div>
              <div className="w-0.5 h-6 bg-[#e0555a] shadow-[0_0_8px_rgba(224,85,90,0.8)]" />
            </div>
          </div>
        </div>

        {/* Gate Rows by Concourse */}
        {concourses.map((concourse) => {
          const concourseGates = gates.filter((g) => g.concourse === concourse);

          return (
            <div key={concourse} className="space-y-1.5">
              <div className="text-[10px] font-semibold text-[#3b82f6] uppercase tracking-wider flex items-center gap-2 pl-2">
                <span>{getConcourseLabel(concourse)}</span>
              </div>

              {concourseGates.map((gate) => {
                const isDragTarget = dragOverGateId === gate.id;
                const gateConflicts = gateConflictsMap.get(gate.id) || [];
                const hasConflict = gateConflicts.length > 0;

                // Check drag validity
                const dragIsValid =
                  !draggedFlight || canAircraftFitGate(draggedFlight.aircraftCode, gate.maxAircraftCode);

                // Flights assigned to this gate
                const assignedFlights = flights.filter(
                  (f) =>
                    f.gateId === gate.id &&
                    f.status !== 'DEPARTED' &&
                    f.status !== 'CANCELLED' &&
                    f.status !== 'DIVERTED'
                );

                return (
                  <div
                    key={gate.id}
                    id={`gate-timeline-row-${gate.id}`}
                    onDragOver={(e) => handleDragOver(e, gate.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, gate.id)}
                    className={`flex items-center min-h-[46px] rounded-lg border transition ${
                      isDragTarget
                        ? dragIsValid
                          ? 'bg-[#22c55e]/15 border-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.2)]'
                          : 'bg-[#e0555a]/25 border-[#e0555a] shadow-[0_0_12px_rgba(224,85,90,0.3)] animate-pulse'
                        : hasConflict
                        ? 'bg-[#e0555a]/10 border-[#e0555a]/60'
                        : 'bg-[#090d16] border-[#1c2638] hover:border-[#2a384e]'
                    }`}
                  >
                    {/* Left Gate Info Column */}
                    <div className="w-44 shrink-0 px-3 py-2 border-r border-[#1c2638] flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-white text-xs font-mono-hud">{gate.name}</span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-mono-hud font-semibold ${
                              gate.maxAircraftCode === 'F'
                                ? 'bg-purple-950/60 text-purple-300 border border-purple-800/60'
                                : gate.maxAircraftCode === 'E'
                                ? 'bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/50'
                                : 'bg-[#d4a94a]/20 text-[#d4a94a] border border-[#d4a94a]/50'
                            }`}
                          >
                            Max [{gate.maxAircraftCode}]
                          </span>
                        </div>
                        <div className="text-[9px] text-[#64748b] mt-0.5 font-normal">
                          Buffer: {gate.bufferMinutes}m {gate.hasJetbridge ? '&middot; Jetbridge' : '&middot; Walk/Bus'}
                        </div>
                      </div>

                      {hasConflict && (
                        <button
                          onClick={() => setActiveResolutionConflict(gateConflicts[0])}
                          title="View Conflict & Resolution"
                          className="p-1 bg-[#e0555a]/20 hover:bg-[#e0555a]/30 text-[#fca5a5] rounded transition"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Timeline Canvas Area */}
                    <div className="flex-1 relative h-10 px-2 flex items-center">
                      {/* Grid Guide Lines */}
                      {[480, 510, 540, 570, 600, 630, 660].map((mins) => (
                        <div
                          key={mins}
                          className="absolute top-0 bottom-0 w-px bg-[#182232]/50 pointer-events-none"
                          style={{ left: `${getTimelinePercent(mins)}%` }}
                        />
                      ))}

                      {/* Moving Red Simulation Cursor across row */}
                      <div
                        className="absolute top-0 bottom-0 w-px bg-[#e0555a]/40 pointer-events-none"
                        style={{ left: `${simCursorPercent}%` }}
                      />

                      {/* Flight Blocks */}
                      {assignedFlights.map((flight) => {
                        const mtt = MIN_TURNAROUND_TIMES[flight.aircraftCode];
                        const startPct = getTimelinePercent(flight.estimatedTime);
                        const durationPct = Math.max(12, (mtt / totalMins) * 100);

                        const hasFlightConflict = conflicts.some((c) => c.flightId === flight.id);

                        return (
                          <div
                            key={flight.id}
                            id={`flight-card-${flight.id}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, flight.id)}
                            onClick={() => {
                              const fConflict = conflicts.find((c) => c.flightId === flight.id);
                              if (fConflict) setActiveResolutionConflict(fConflict);
                            }}
                            className={`absolute h-8 rounded-lg px-2 flex items-center justify-between text-xs cursor-grab active:cursor-grabbing border shadow-md transition-transform hover:scale-[1.01] z-10 ${
                              hasFlightConflict
                                ? 'bg-[#e0555a]/20 border-[#e0555a] text-white animate-pulse'
                                : 'bg-[#111726] border-[#3b82f6]/40 text-slate-100 hover:bg-[#162032]'
                            }`}
                            style={{
                              left: `${startPct}%`,
                              width: `${durationPct}%`,
                            }}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: flight.airlineColor || '#38bdf8' }}
                              />
                              <span className="font-semibold truncate font-mono-hud">{flight.flightNumber}</span>
                              <span className="text-[9px] text-[#94a3b8] hidden sm:inline truncate font-mono-hud font-normal">
                                [{flight.aircraftCode}]
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 ml-1 font-mono-hud font-semibold">
                              {hasFlightConflict && <AlertTriangle className="w-3 h-3 text-[#e0555a]" />}
                              <span className="text-[9px] text-[#3b82f6]">
                                {mtt}m
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/* Drag target feedback message */}
                      {isDragTarget && (
                        <div
                          className={`absolute inset-0 flex items-center justify-center text-xs font-semibold pointer-events-none rounded ${
                            dragIsValid
                              ? 'bg-[#22c55e]/30 text-[#4ade80]'
                              : 'bg-[#e0555a]/40 text-[#fca5a5]'
                          }`}
                        >
                          {dragIsValid
                            ? `✓ Drop to Assign to ${gate.name} (Code [${gate.maxAircraftCode}])`
                            : `✕ ICAO Size Violation: ${draggedFlight?.aircraftType} requires > Code [${gate.maxAircraftCode}]`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Smart Resolution Prompt Modal / Drawer */}
      {activeResolutionConflict && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#0d1220] border border-[#222f46] rounded-xl max-w-lg w-full p-5 shadow-2xl text-xs space-y-4 font-sans">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#1c2638]">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#e0555a]/15 border border-[#e0555a]/50 rounded-lg text-[#e0555a]">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{activeResolutionConflict.title}</h3>
                  <span className="text-[11px] text-[#fca5a5] font-semibold uppercase tracking-wider">
                    {activeResolutionConflict.type} &middot; Severity: {activeResolutionConflict.severity}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveResolutionConflict(null)}
                className="text-[#94a3b8] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <div className="p-3 bg-[#090d16] rounded-lg border border-[#1c2638] text-white leading-relaxed font-normal">
              {activeResolutionConflict.description}
            </div>

            {/* Smart Resolution Options */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] uppercase text-[#94a3b8] font-semibold tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#3b82f6]" />
                <span>Recommended Instant Resolutions</span>
              </div>

              {activeResolutionConflict.recommendedResolutions.map((res) => (
                <button
                  key={res.id}
                  id={`apply-res-${res.id}`}
                  onClick={() => {
                    executeResolution(activeResolutionConflict.id, res.id);
                    setActiveResolutionConflict(null);
                  }}
                  className="w-full p-3 rounded-lg bg-[#090d16] border border-[#1c2638] hover:border-[#3b82f6]/60 hover:bg-[#3b82f6]/10 text-left transition flex items-center justify-between group"
                >
                  <div>
                    <div className="font-semibold text-white group-hover:text-[#3b82f6] text-xs flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-[#3b82f6]" />
                      {res.label}
                    </div>
                    <div className="text-[11px] text-[#cbd5e1] mt-0.5 pl-5 font-normal">{res.description}</div>
                  </div>
                  <span className="px-3 py-1 bg-[#3b82f6] group-hover:bg-[#2563eb] text-white font-semibold rounded-lg text-xs shrink-0 ml-2 transition">
                    Apply
                  </span>
                </button>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-[#1c2638]">
              <button
                onClick={() => setActiveResolutionConflict(null)}
                className="px-4 py-1.5 bg-[#141d2d] hover:bg-[#1c2638] text-white font-normal border border-[#23354f] rounded-lg text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
