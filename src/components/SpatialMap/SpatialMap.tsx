import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Wind,
  Truck,
  Plane,
  AlertTriangle,
  Info,
  HelpCircle,
  X,
  ShieldAlert,
  Clock,
  Navigation,
  Activity,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { useAirport } from '../../context/AirportContext';
import { Flight, Gate, Runway, GroundVehicle, IcaoAircraftCode } from '../../types/airport';

export const SpatialMap: React.FC = () => {
  const {
    flights,
    gates,
    runways,
    vehicles,
    weather,
    conflicts,
    selectedFlightId,
    selectedGateId,
    setSelectedFlightId,
    setSelectedGateId,
  } = useAirport();

  // Pan & Zoom state
  const [scale, setScale] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hover state for non-colliding floating tooltips
  const [hoveredFlightId, setHoveredFlightId] = useState<string | null>(null);

  // Layer toggles
  const [showDataTags, setShowDataTags] = useState<boolean>(true);
  const [showVehicles, setShowVehicles] = useState<boolean>(true);
  const [showWindOverlay, setShowWindOverlay] = useState<boolean>(true);
  const [showRadarSweep, setShowRadarSweep] = useState<boolean>(true);
  const [showSafetyZones, setShowSafetyZones] = useState<boolean>(true);
  const [layerMenuOpen, setLayerMenuOpen] = useState<boolean>(false);
  const [legendOpen, setLegendOpen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    setScale((prev) => Math.min(3.5, Math.max(0.65, prev * zoomFactor)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Center on selected flight or gate
  useEffect(() => {
    if (selectedFlightId) {
      const flight = flights.find((f) => f.id === selectedFlightId);
      if (flight) {
        setPan({
          x: -(flight.x * scale - 500),
          y: -(flight.y * scale - 325),
        });
      }
    }
  }, [selectedFlightId, scale, flights]);

  const selectedFlight = useMemo(() => {
    return flights.find((f) => f.id === selectedFlightId) || null;
  }, [flights, selectedFlightId]);

  const hoveredFlight = useMemo(() => {
    return flights.find((f) => f.id === hoveredFlightId) || null;
  }, [flights, hoveredFlightId]);

  const flightConflictsMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of conflicts) {
      map.set(c.flightId, c.title);
    }
    return map;
  }, [conflicts]);

  return (
    <div
      ref={containerRef}
      id="spatial-radar-container"
      className="relative w-full h-full bg-[#090d16] overflow-hidden select-none cursor-grab active:cursor-grabbing font-sans"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Background Radar Coordinate Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="radar-grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#radar-grid)" />
        </svg>
      </div>

      {/* Main Scalable Airside Aerodrome Chart */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      >
        <svg
          viewBox="0 0 1000 650"
          className="w-[1000px] h-[650px] pointer-events-auto"
          style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.85))' }}
        >
          <defs>
            {/* Runway Asphalt Gradient */}
            <linearGradient id="runway-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#17202e" />
              <stop offset="50%" stopColor="#0f1521" />
              <stop offset="100%" stopColor="#17202e" />
            </linearGradient>

            {/* Radar Sweep Radial Beam */}
            <radialGradient id="radar-beam" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.15)" />
              <stop offset="70%" stopColor="rgba(59, 130, 246, 0.03)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Airside Aerodrome Boundary (Base dark navy #0d1220) */}
          <rect
            x="24"
            y="36"
            width="952"
            height="578"
            rx="12"
            fill="#0d1220"
            stroke="#1c2638"
            strokeWidth="1.5"
          />

          {/* Perimeter Service Roads */}
          <path
            d="M 100 196 L 900 196 M 100 464 L 900 464 M 290 196 L 290 464 M 690 196 L 690 464"
            fill="none"
            stroke="#151d2c"
            strokeWidth="6"
            strokeDasharray="4 4"
          />

          {/* ================= TAXIWAYS (MUTED AMBER #d4a94a) ================= */}
          {/* Taxiway Alpha (Parallel to RWY 09L) */}
          <rect x="110" y="168" width="780" height="18" rx="3" fill="#141c2a" />
          <line x1="110" y1="177" x2="890" y2="177" stroke="#d4a94a" strokeWidth="1.2" />

          {/* Taxiway Bravo (Parallel to RWY 09R) */}
          <rect x="110" y="474" width="780" height="18" rx="3" fill="#141c2a" />
          <line x1="110" y1="483" x2="890" y2="483" stroke="#d4a94a" strokeWidth="1.2" />

          {/* High-speed Exit Taxiways & Connectors */}
          {/* North Connectors (C1, C2, C3, C4) */}
          <path d="M 270 122 L 310 177" stroke="#141c2a" strokeWidth="18" strokeLinecap="round" />
          <path d="M 270 122 L 310 177" stroke="#d4a94a" strokeWidth="1.2" fill="none" />

          <path d="M 510 122 L 550 177" stroke="#141c2a" strokeWidth="18" strokeLinecap="round" />
          <path d="M 510 122 L 550 177" stroke="#d4a94a" strokeWidth="1.2" fill="none" />

          <path d="M 730 122 L 770 177" stroke="#141c2a" strokeWidth="18" strokeLinecap="round" />
          <path d="M 730 122 L 770 177" stroke="#d4a94a" strokeWidth="1.2" fill="none" />

          {/* South Connectors (D1, D2) */}
          <path d="M 310 538 L 350 483" stroke="#141c2a" strokeWidth="18" strokeLinecap="round" />
          <path d="M 310 538 L 350 483" stroke="#d4a94a" strokeWidth="1.2" fill="none" />

          <path d="M 550 538 L 590 483" stroke="#141c2a" strokeWidth="18" strokeLinecap="round" />
          <path d="M 550 538 L 590 483" stroke="#d4a94a" strokeWidth="1.2" fill="none" />

          {/* Apron Taxilanes connecting Terminal Piers */}
          <rect x="280" y="272" width="540" height="22" rx="3" fill="#141c2a" />
          <line x1="280" y1="283" x2="820" y2="283" stroke="#d4a94a" strokeWidth="1.2" />

          {/* Cross Connectors East & West */}
          <rect x="210" y="177" width="20" height="306" rx="3" fill="#141c2a" />
          <line x1="220" y1="177" x2="220" y2="483" stroke="#d4a94a" strokeWidth="1.2" />

          <rect x="840" y="177" width="20" height="306" rx="3" fill="#141c2a" />
          <line x1="850" y1="177" x2="850" y2="483" stroke="#d4a94a" strokeWidth="1.2" />

          {/* Taxiway Informational Identification Badges (Muted Amber #d4a94a) */}
          <g className="font-mono-hud text-[9px] font-semibold">
            {/* TWY A */}
            <rect x="120" y="152" width="20" height="12" rx="2" fill="#090d16" stroke="#d4a94a" strokeWidth="0.8" />
            <text x="130" y="161" textAnchor="middle" dominantBaseline="middle" fill="#d4a94a">A</text>

            {/* TWY B */}
            <rect x="120" y="496" width="20" height="12" rx="2" fill="#090d16" stroke="#d4a94a" strokeWidth="0.8" />
            <text x="130" y="505" textAnchor="middle" dominantBaseline="middle" fill="#d4a94a">B</text>

            {/* TWY C2 */}
            <rect x="320" y="140" width="22" height="12" rx="2" fill="#090d16" stroke="#d4a94a" strokeWidth="0.8" />
            <text x="331" y="149" textAnchor="middle" dominantBaseline="middle" fill="#d4a94a">C2</text>

            {/* TWY C3 */}
            <rect x="560" y="140" width="22" height="12" rx="2" fill="#090d16" stroke="#d4a94a" strokeWidth="0.8" />
            <text x="571" y="149" textAnchor="middle" dominantBaseline="middle" fill="#d4a94a">C3</text>

            {/* TWY D1 */}
            <rect x="360" y="506" width="22" height="12" rx="2" fill="#090d16" stroke="#d4a94a" strokeWidth="0.8" />
            <text x="371" y="515" textAnchor="middle" dominantBaseline="middle" fill="#d4a94a">D1</text>
          </g>

          {/* ================= TERMINAL STRUCTURES & CONCOURSES ================= */}
          {/* Main Terminal Hub */}
          <rect x="460" y="272" width="80" height="22" rx="3" fill="#182232" stroke="#23324a" strokeWidth="1" />
          <text x="500" y="284" textAnchor="middle" dominantBaseline="middle" className="font-sans text-[9px] font-semibold fill-slate-300">
            TERMINAL HUB
          </text>

          {/* Concourse A Pier (West) */}
          <rect x="320" y="244" width="130" height="18" rx="2" fill="#131b28" stroke="#1f2c40" strokeWidth="1" />
          <text x="385" y="254" textAnchor="middle" dominantBaseline="middle" className="font-mono-hud text-[8px] font-normal fill-slate-400">
            CONCOURSE A (HEAVY)
          </text>

          {/* Concourse B Pier (Center) */}
          <rect x="510" y="244" width="130" height="18" rx="2" fill="#131b28" stroke="#1f2c40" strokeWidth="1" />
          <text x="575" y="254" textAnchor="middle" dominantBaseline="middle" className="font-mono-hud text-[8px] font-normal fill-slate-400">
            CONCOURSE B (DOMESTIC)
          </text>

          {/* Concourse C Pier (East) */}
          <rect x="700" y="244" width="90" height="18" rx="2" fill="#131b28" stroke="#1f2c40" strokeWidth="1" />
          <text x="745" y="254" textAnchor="middle" dominantBaseline="middle" className="font-mono-hud text-[8px] font-normal fill-slate-400">
            CONCOURSE C
          </text>

          {/* GSE Vehicle Depot */}
          <rect x="430" y="412" width="140" height="26" rx="3" fill="#101724" stroke="#d4a94a" strokeWidth="1" strokeDasharray="3 3" />
          <text x="500" y="426" textAnchor="middle" dominantBaseline="middle" className="font-mono-hud text-[8px] font-semibold fill-[#d4a94a]">
            GSE MOTOR POOL
          </text>

          {/* ARFF Crash Fire Rescue Station (Alert Red #e0555a) */}
          <rect x="135" y="432" width="65" height="26" rx="3" fill="#1f1115" stroke="#e0555a" strokeWidth="1" />
          <text x="167" y="446" textAnchor="middle" dominantBaseline="middle" className="font-mono-hud text-[8px] font-semibold fill-[#fca5a5]">
            ARFF RESCUE
          </text>

          {/* ================= GATES & STANDS (NO COLLISION DESIGN) ================= */}
          {gates.map((gate) => {
            const isSelected = selectedGateId === gate.id;
            const occupiedFlight = flights.find((f) => f.gateId === gate.id && ['AT_GATE', 'TURNAROUND', 'BOARDING'].includes(f.status));
            const hasConflict = conflicts.some((c) => c.gateId === gate.id);

            return (
              <g
                key={gate.id}
                id={`gate-node-${gate.id}`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedGateId(gate.id);
                  if (occupiedFlight) setSelectedFlightId(occupiedFlight.id);
                }}
              >
                {/* Gate Parking Stand Box (Self-contained, avoids taxilane protrusion) */}
                <rect
                  x={gate.x - 16}
                  y={gate.y - 16}
                  width="32"
                  height="32"
                  rx="3"
                  fill={
                    hasConflict
                      ? 'rgba(224, 85, 90, 0.15)'
                      : occupiedFlight
                      ? 'rgba(59, 130, 246, 0.1)'
                      : 'rgba(17, 24, 38, 0.75)'
                  }
                  stroke={
                    isSelected
                      ? '#3b82f6'
                      : hasConflict
                      ? '#e0555a'
                      : occupiedFlight
                      ? '#3b82f6'
                      : '#1e293b'
                  }
                  strokeWidth={isSelected ? 2 : 1}
                  strokeDasharray={occupiedFlight ? undefined : '2 2'}
                />

                {/* Jetbridge visual indicator */}
                {gate.hasJetbridge && (
                  <line
                    x1={gate.x}
                    y1={gate.headingDeg === 180 ? gate.y - 16 : gate.y + 16}
                    x2={gate.x}
                    y2={gate.headingDeg === 180 ? gate.y - 22 : gate.y + 22}
                    stroke="#475569"
                    strokeWidth="2.5"
                  />
                )}

                {/* Stand Name (Centered inside stand box) */}
                <text
                  x={gate.x}
                  y={gate.y - 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={`font-mono-hud text-[10px] font-semibold ${
                    hasConflict ? 'fill-[#fca5a5]' : occupiedFlight ? 'fill-[#3b82f6]' : 'fill-[#94a3b8]'
                  }`}
                >
                  {gate.name}
                </text>

                {/* Max ICAO Code Badge ([E], [F], [C]) nested INSIDE the gate box bottom */}
                <rect
                  x={gate.x - 7}
                  y={gate.y + 5}
                  width="14"
                  height="8"
                  rx="1.5"
                  fill="#090d16"
                  stroke={
                    gate.maxAircraftCode === 'F'
                      ? '#a855f7'
                      : gate.maxAircraftCode === 'E'
                      ? '#3b82f6'
                      : '#d4a94a'
                  }
                  strokeWidth="0.6"
                />
                <text
                  x={gate.x}
                  y={gate.y + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-mono-hud text-[6px] font-semibold fill-slate-200"
                >
                  {gate.maxAircraftCode}
                </text>
              </g>
            );
          })}

          {/* ================= RUNWAYS (UNCLIPPED WITH PIANO KEYS) ================= */}
          {runways.map((runway) => {
            const isClosed = !runway.isOpen;
            const runwayWidth = runway.id === 'RWY-09L' ? 42 : 34;
            const y = runway.startY;

            return (
              <g key={runway.id} id={`runway-element-${runway.id}`}>
                {/* Runway Asphalt Surface */}
                <rect
                  x={runway.startX}
                  y={y - runwayWidth / 2}
                  width={runway.endX - runway.startX}
                  height={runwayWidth}
                  rx="3"
                  fill="url(#runway-grad)"
                  stroke={isClosed ? '#e0555a' : '#223046'}
                  strokeWidth="1.5"
                />

                {/* Centerline Dashes */}
                <line
                  x1={runway.startX + 55}
                  y1={y}
                  x2={runway.endX - 55}
                  y2={y}
                  stroke="#f8fafc"
                  strokeWidth="1.8"
                  strokeDasharray="14 10"
                  opacity={isClosed ? 0.25 : 0.85}
                />

                {/* Piano Key Threshold Markings */}
                <g stroke="#ffffff" strokeWidth="2" opacity={isClosed ? 0.25 : 0.85}>
                  {/* West Threshold (09) */}
                  <line x1={runway.startX + 12} y1={y - 12} x2={runway.startX + 34} y2={y - 12} />
                  <line x1={runway.startX + 12} y1={y - 6} x2={runway.startX + 34} y2={y - 6} />
                  <line x1={runway.startX + 12} y1={y} x2={runway.startX + 34} y2={y} />
                  <line x1={runway.startX + 12} y1={y + 6} x2={runway.startX + 34} y2={y + 6} />
                  <line x1={runway.startX + 12} y1={y + 12} x2={runway.startX + 34} y2={y + 12} />

                  {/* East Threshold (27) */}
                  <line x1={runway.endX - 34} y1={y - 12} x2={runway.endX - 12} y2={y - 12} />
                  <line x1={runway.endX - 34} y1={y - 6} x2={runway.endX - 12} y2={y - 6} />
                  <line x1={runway.endX - 34} y1={y} x2={runway.endX - 12} y2={y} />
                  <line x1={runway.endX - 34} y1={y + 6} x2={runway.endX - 12} y2={y + 6} />
                  <line x1={runway.endX - 34} y1={y + 12} x2={runway.endX - 12} y2={y + 12} />
                </g>

                {/* Runway Designator Numbers (Unclipped) */}
                <text
                  x={runway.startX + 44}
                  y={y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-mono-hud text-[11px] font-semibold fill-white tracking-widest"
                >
                  {runway.id === 'RWY-09L' ? '09L' : '09R'}
                </text>
                <text
                  x={runway.endX - 44}
                  y={y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-mono-hud text-[11px] font-semibold fill-white tracking-widest"
                >
                  {runway.id === 'RWY-09L' ? '27R' : '27L'}
                </text>

                {/* ILS Localizer Beacon */}
                <line
                  x1={30}
                  y1={y}
                  x2={runway.startX}
                  y2={y}
                  stroke={isClosed ? '#e0555a' : '#3b82f6'}
                  strokeWidth="1"
                  strokeDasharray="3 4"
                  opacity="0.5"
                />

                {/* Runway Closed Warning Banner & Crosses */}
                {isClosed && (
                  <g>
                    <rect
                      x={runway.startX}
                      y={y - runwayWidth / 2}
                      width={runway.endX - runway.startX}
                      height={runwayWidth}
                      fill="rgba(224, 85, 90, 0.25)"
                    />
                    {[240, 480, 720].map((xPos) => (
                      <g key={xPos} stroke="#d4a94a" strokeWidth="4" strokeLinecap="round">
                        <line x1={xPos - 12} y1={y - 9} x2={xPos + 12} y2={y + 9} />
                        <line x1={xPos - 12} y1={y + 9} x2={xPos + 12} y2={y - 9} />
                      </g>
                    ))}
                    <rect x="420" y={y - 12} width="160" height="24" rx="3" fill="#881337" stroke="#fda4af" strokeWidth="1" />
                    <text
                      x="500"
                      y={y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="font-mono-hud text-[10px] font-semibold fill-white tracking-wider"
                    >
                      RWY CLOSED / FOD
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ================= GROUND SERVICE FLEET (UNIFIED LINE ICONS) ================= */}
          {showVehicles &&
            vehicles.map((v) => {
              const isRescue = v.type === 'ARFF_RESCUE';
              const strokeColor = isRescue
                ? '#e0555a'
                : v.type === 'REFUELER'
                ? '#3b82f6'
                : v.type === 'PUSHBACK_TUG'
                ? '#22c55e'
                : '#d4a94a';

              return (
                <g
                  key={v.id}
                  id={`vehicle-${v.id}`}
                  className="transition-all duration-200"
                  style={{ transform: `translate(${v.x}px, ${v.y}px)` }}
                >
                  {/* Single-weight Flat Line Icon for Ground Vehicle */}
                  {v.type === 'PUSHBACK_TUG' && (
                    <g stroke={strokeColor} strokeWidth="1.2" fill="#0d1220">
                      <rect x="-5" y="-3.5" width="10" height="7" rx="1" />
                      <line x1="-2" y1="-3.5" x2="-2" y2="3.5" />
                      <line x1="5" y1="0" x2="8" y2="0" strokeWidth="1.5" />
                    </g>
                  )}

                  {v.type === 'REFUELER' && (
                    <g stroke={strokeColor} strokeWidth="1.2" fill="#0d1220">
                      <rect x="-6" y="-3" width="12" height="6" rx="2" />
                      <line x1="-2" y1="-3" x2="-2" y2="3" />
                      <circle cx="2" cy="0" r="1.2" fill={strokeColor} />
                    </g>
                  )}

                  {v.type === 'ARFF_RESCUE' && (
                    <g stroke={strokeColor} strokeWidth="1.2" fill="#1f1115">
                      <rect x="-7" y="-4" width="14" height="8" rx="1.5" />
                      <line x1="2" y1="-4" x2="2" y2="4" />
                      <line x1="-1" y1="0" x2="5" y2="0" />
                      {v.status === 'EMERGENCY_DISPATCH' && (
                        <circle cx="0" cy="0" r="10" fill="rgba(224,85,90,0.35)" className="animate-ping" />
                      )}
                    </g>
                  )}

                  {(v.type === 'BAGGAGE_TUG' || v.type === 'CATERING' || v.type === 'FOLLOW_ME') && (
                    <g stroke={strokeColor} strokeWidth="1.2" fill="#0d1220">
                      <rect x="-5" y="-3" width="10" height="6" rx="1" />
                      <line x1="0" y1="-3" x2="0" y2="3" />
                    </g>
                  )}

                  {/* Micro Callsign label */}
                  <text
                    x="8"
                    y="2"
                    className="font-mono-hud text-[6px] font-normal fill-[#94a3b8] pointer-events-none"
                  >
                    {v.callsign}
                  </text>
                </g>
              );
            })}

          {/* ================= AIRCRAFT SPRITES & NON-COLLIDING LABELS ================= */}
          {flights
            .filter((f) => f.status !== 'DEPARTED' && f.status !== 'CANCELLED' && f.status !== 'DIVERTED')
            .map((flight) => {
              const isSelected = selectedFlightId === flight.id;
              const isHovered = hoveredFlightId === flight.id;
              const hasConflict = flightConflictsMap.has(flight.id);
              const isEmergency = flight.isEmergency;

              // Size scale by ICAO reference code
              const planeScale = flight.aircraftCode === 'F' ? 1.3 : flight.aircraftCode === 'E' ? 1.15 : 0.95;

              // Status dot color
              const statusDotColor = isEmergency || hasConflict
                ? '#e0555a'
                : flight.delayMinutes > 10
                ? '#d4a94a'
                : '#22c55e';

              // Aircraft fill color
              const aircraftFill = isEmergency || hasConflict
                ? '#e0555a'
                : isSelected
                ? '#3b82f6'
                : flight.isArrival
                ? '#38bdf8'
                : '#60a5fa';

              return (
                <g
                  key={flight.id}
                  id={`aircraft-${flight.id}`}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredFlightId(flight.id)}
                  onMouseLeave={() => setHoveredFlightId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFlightId(flight.id);
                    if (flight.gateId) setSelectedGateId(flight.gateId);
                  }}
                >
                  {/* Wake Turbulence Separation Ring */}
                  {showSafetyZones && flight.altitudeFt > 0 && (
                    <circle
                      cx={flight.x}
                      cy={flight.y}
                      r={flight.wakeCategory === 'SUPER' ? 32 : flight.wakeCategory === 'HEAVY' ? 24 : 16}
                      fill="none"
                      stroke={hasConflict ? 'rgba(224, 85, 90, 0.45)' : 'rgba(59, 130, 246, 0.25)'}
                      strokeWidth="1"
                      strokeDasharray="2 3"
                    />
                  )}

                  {/* Flashing Emergency Beacon */}
                  {isEmergency && (
                    <circle
                      cx={flight.x}
                      cy={flight.y}
                      r="20"
                      fill="rgba(224, 85, 90, 0.35)"
                      className="animate-ping"
                    />
                  )}

                  {/* Unified Flat Aircraft Vector Sprite */}
                  <g
                    transform={`translate(${flight.x}, ${flight.y}) rotate(${flight.headingDeg}) scale(${planeScale})`}
                  >
                    {/* Airborne Drop Shadow */}
                    {flight.altitudeFt > 0 && (
                      <path
                        d="M 0 -11 L 2.5 -3 L 12 2 L 12 4 L 2.5 2.5 L 1.5 8 L 5 11 L 5 13 L 0 12 L -5 13 L -5 11 L -1.5 8 L -2.5 2.5 L -12 4 L -12 2 L -2.5 -3 Z"
                        fill="rgba(0, 0, 0, 0.45)"
                        transform="translate(3, 3)"
                      />
                    )}

                    {/* Clean Aircraft Silhouette with Unified 1.2px Line Stroke */}
                    <path
                      d="M 0 -11 L 2.5 -3 L 12 2 L 12 4 L 2.5 2.5 L 1.5 8 L 5 11 L 5 13 L 0 12 L -5 13 L -5 11 L -1.5 8 L -2.5 2.5 L -12 4 L -12 2 L -2.5 -3 Z"
                      fill={aircraftFill}
                      stroke={isSelected ? '#ffffff' : '#0d1220'}
                      strokeWidth="1.2"
                    />
                  </g>

                  {/* SHORT PERSISTENT TAG (FLIGHT ID + STATUS DOT ONLY - ZERO OVERLAP) */}
                  {showDataTags && (
                    <g transform={`translate(${flight.x + 9}, ${flight.y - 12})`}>
                      {/* Micro hair connector */}
                      <line x1="-9" y1="12" x2="0" y2="0" stroke="#334155" strokeWidth="0.8" />

                      {/* Tag pill */}
                      <rect
                        x="0"
                        y="-7"
                        width="46"
                        height="14"
                        rx="2"
                        fill="#090d16"
                        stroke={hasConflict ? '#e0555a' : isSelected ? '#3b82f6' : '#1c2638'}
                        strokeWidth="0.8"
                        opacity="0.95"
                      />

                      {/* Status Dot */}
                      <circle cx="5" cy="0" r="2" fill={statusDotColor} />

                      {/* Flight Number */}
                      <text
                        x="10"
                        y="0"
                        dominantBaseline="middle"
                        className="font-mono-hud text-[7.5px] font-semibold fill-white"
                      >
                        {flight.flightNumber}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

          {/* Rotating Authentic Airside Radar Sweep */}
          {showRadarSweep && (
            <g className="animate-radar-sweep pointer-events-none" style={{ transformOrigin: '500px 325px' }}>
              <path
                d="M 500 325 L 1000 325 A 500 500 0 0 0 950 150 Z"
                fill="url(#radar-beam)"
                opacity="0.3"
              />
              <line x1="500" y1="325" x2="1000" y2="325" stroke="#3b82f6" strokeWidth="1" opacity="0.35" />
            </g>
          )}

          {/* Live Wind Vector Indicator on Map (Unclipped at bottom left) */}
          {showWindOverlay && (
            <g transform="translate(55, 545)">
              <circle cx="20" cy="20" r="18" fill="rgba(9, 13, 22, 0.9)" stroke="#1c2638" strokeWidth="1" />
              <g transform={`translate(20, 20) rotate(${weather.windHeadingDeg})`}>
                <line x1="0" y1="11" x2="0" y2="-11" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" />
                <polygon points="0,-13 -3.5,-6 3.5,-6" fill="#3b82f6" />
              </g>
              <text x="44" y="16" className="font-mono-hud text-[8px] font-semibold fill-[#3b82f6]">
                WIND {weather.windHeadingDeg}° / {weather.windSpeedKts}KT
              </text>
              <text x="44" y="27" className="font-mono-hud text-[7px] font-normal fill-[#94a3b8]">
                GUST {weather.windGustKts}KT &middot; {weather.condition}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* FLOATING AIRCRAFT HOVER TOOLTIP (Zero-Canvas Collision, shown only on hover) */}
      {hoveredFlight && !isDragging && (
        <div
          className="absolute pointer-events-none z-30 bg-[#0d1220]/95 border border-[#243048] px-2.5 py-1.5 rounded-lg shadow-xl backdrop-blur-md text-[11px] space-y-1"
          style={{
            left: `${hoveredFlight.x * scale + pan.x}px`,
            top: `${hoveredFlight.y * scale + pan.y - 50}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex items-center gap-2 font-mono-hud font-semibold text-white">
            <span>{hoveredFlight.flightNumber}</span>
            <span className="text-[#94a3b8] font-normal">({hoveredFlight.callsign})</span>
            <span className="px-1 py-0.2 text-[9px] bg-[#162032] text-[#3b82f6] border border-[#1e2c44] rounded">
              [{hoveredFlight.aircraftCode}]
            </span>
          </div>
          <div className="text-[10px] text-[#94a3b8] font-sans">
            {hoveredFlight.origin} &rarr; {hoveredFlight.destination} &middot; {hoveredFlight.aircraftType}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono-hud text-slate-300">
            <span>{hoveredFlight.altitudeFt > 0 ? `ALT: ${hoveredFlight.altitudeFt}ft` : 'SURFACE GND'}</span>
            <span>&middot;</span>
            <span>{hoveredFlight.speedKts}kt</span>
            <span>&middot;</span>
            <span className={hoveredFlight.gateId ? 'text-[#3b82f6]' : 'text-[#d4a94a]'}>
              {hoveredFlight.gateId ? `GATE ${hoveredFlight.gateId}` : 'NO GATE'}
            </span>
          </div>
        </div>
      )}

      {/* Floating Toolbar (Top Right): Map Controls, Legend & Layer Selector */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
        {/* Status Key & Legend Trigger */}
        <button
          id="status-key-legend-btn"
          onClick={() => setLegendOpen(true)}
          title="Airfield Legend & ICAO Reference Key"
          className="px-3 py-1.5 rounded-lg border border-[#1c2638] bg-[#0d1220]/95 hover:bg-[#162032] text-xs font-semibold text-white shadow-xl flex items-center gap-1.5 transition"
        >
          <HelpCircle className="w-3.5 h-3.5 text-[#3b82f6]" />
          <span>Legend &amp; Status Key</span>
        </button>

        {/* Layer Toggle Menu */}
        <div className="relative">
          <button
            id="map-layers-toggle-btn"
            onClick={() => setLayerMenuOpen(!layerMenuOpen)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 shadow-xl transition ${
              layerMenuOpen
                ? 'bg-[#3b82f6] text-white border-[#3b82f6]'
                : 'bg-[#0d1220]/95 border-[#1c2638] text-white hover:bg-[#162032]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>Layers</span>
          </button>

          {layerMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[#0d1220] border border-[#222f46] rounded-xl p-3 shadow-2xl z-30 text-xs space-y-2.5">
              <div className="text-[10px] uppercase text-[#94a3b8] font-normal pb-1 border-b border-[#1c2638] tracking-wider font-sans">
                Airside Map Layers
              </div>

              <label className="flex items-center justify-between cursor-pointer text-[#cbd5e1] hover:text-white transition">
                <span className="flex items-center gap-2 font-normal font-sans">
                  <Plane className="w-3.5 h-3.5 text-[#3b82f6]" />
                  Aircraft Callsign Tags
                </span>
                <input
                  type="checkbox"
                  checked={showDataTags}
                  onChange={(e) => setShowDataTags(e.target.checked)}
                  className="rounded border-[#2a384e] bg-[#090d16] text-[#3b82f6] focus:ring-[#3b82f6]"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-[#cbd5e1] hover:text-white transition">
                <span className="flex items-center gap-2 font-normal font-sans">
                  <Truck className="w-3.5 h-3.5 text-[#d4a94a]" />
                  Ground Vehicle Fleet (GSE)
                </span>
                <input
                  type="checkbox"
                  checked={showVehicles}
                  onChange={(e) => setShowVehicles(e.target.checked)}
                  className="rounded border-[#2a384e] bg-[#090d16] text-[#3b82f6] focus:ring-[#3b82f6]"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-[#cbd5e1] hover:text-white transition">
                <span className="flex items-center gap-2 font-normal font-sans">
                  <Wind className="w-3.5 h-3.5 text-[#3b82f6]" />
                  Wind Vector Overlay
                </span>
                <input
                  type="checkbox"
                  checked={showWindOverlay}
                  onChange={(e) => setShowWindOverlay(e.target.checked)}
                  className="rounded border-[#2a384e] bg-[#090d16] text-[#3b82f6] focus:ring-[#3b82f6]"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-[#cbd5e1] hover:text-white transition">
                <span className="flex items-center gap-2 font-normal font-sans">
                  <Activity className="w-3.5 h-3.5 text-[#3b82f6]" />
                  Radar Primary Sweep
                </span>
                <input
                  type="checkbox"
                  checked={showRadarSweep}
                  onChange={(e) => setShowRadarSweep(e.target.checked)}
                  className="rounded border-[#2a384e] bg-[#090d16] text-[#3b82f6] focus:ring-[#3b82f6]"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer text-[#cbd5e1] hover:text-white transition">
                <span className="flex items-center gap-2 font-normal font-sans">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#e0555a]" />
                  Wake Separation Rings
                </span>
                <input
                  type="checkbox"
                  checked={showSafetyZones}
                  onChange={(e) => setShowSafetyZones(e.target.checked)}
                  className="rounded border-[#2a384e] bg-[#090d16] text-[#3b82f6] focus:ring-[#3b82f6]"
                />
              </label>

              <div className="pt-2 border-t border-[#1c2638]">
                <button
                  onClick={() => {
                    setLayerMenuOpen(false);
                    setLegendOpen(true);
                  }}
                  className="w-full text-left py-1 text-[11px] text-[#3b82f6] hover:text-white font-semibold transition"
                >
                  &rarr; Open Legend &amp; Status Key
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Zoom In, Out, Reset */}
        <div className="flex items-center bg-[#0d1220]/95 border border-[#1c2638] rounded-lg p-0.5 shadow-xl">
          <button
            id="map-zoom-in-btn"
            onClick={() => setScale((s) => Math.min(3.5, s * 1.2))}
            title="Zoom In"
            className="p-1.5 text-[#94a3b8] hover:text-white hover:bg-[#162032] rounded transition"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            id="map-zoom-out-btn"
            onClick={() => setScale((s) => Math.max(0.65, s * 0.8))}
            title="Zoom Out"
            className="p-1.5 text-[#94a3b8] hover:text-white hover:bg-[#162032] rounded transition"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            id="map-reset-btn"
            onClick={resetView}
            title="Reset Airfield Fit"
            className="p-1.5 text-[#94a3b8] hover:text-white hover:bg-[#162032] rounded transition"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Comprehensive Legend & Status Key Modal */}
      {legendOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#0d1220] border border-[#222f46] rounded-xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl text-xs">
            {/* Header */}
            <div className="p-4 border-b border-[#1c2638] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#3b82f6]/10 border border-[#3b82f6]/40 rounded-lg text-[#3b82f6]">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-wide font-sans">
                    Airside Radar Legend &amp; ICAO Reference Codes
                  </h2>
                  <p className="text-[11px] text-[#94a3b8] font-normal font-sans">
                    ICAO Annex 14 &middot; Aerodrome Reference Codes &amp; Operations Standard
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLegendOpen(false)}
                className="text-[#94a3b8] hover:text-white p-1 rounded-md transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 overflow-y-auto space-y-4">
              {/* Section 1: Aircraft Color Meaning & Status Dots */}
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-[#94a3b8] font-semibold font-sans">
                  Aircraft Status &amp; Map Beacon Colors
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-[#090d16] border border-[#1c2638] rounded-lg flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#3b82f6] shrink-0" />
                    <div>
                      <div className="text-white font-semibold">Active Airborne / Selected</div>
                      <div className="text-[10px] text-[#94a3b8]">En route or selected flight</div>
                    </div>
                  </div>

                  <div className="p-2 bg-[#090d16] border border-[#1c2638] rounded-lg flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#22c55e] shrink-0" />
                    <div>
                      <div className="text-white font-semibold">On-Time / Nominal</div>
                      <div className="text-[10px] text-[#94a3b8]">Delay &le; 10 minutes</div>
                    </div>
                  </div>

                  <div className="p-2 bg-[#090d16] border border-[#1c2638] rounded-lg flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#d4a94a] shrink-0" />
                    <div>
                      <div className="text-white font-semibold">Delayed / Precautionary</div>
                      <div className="text-[10px] text-[#94a3b8]">Delay &gt; 10 min or gate turn</div>
                    </div>
                  </div>

                  <div className="p-2 bg-[#090d16] border border-[#1c2638] rounded-lg flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#e0555a] shrink-0 animate-pulse" />
                    <div>
                      <div className="text-white font-semibold">Critical Conflict / Emergency</div>
                      <div className="text-[10px] text-[#fca5a5]">Stand clash or in-flight issue</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: ICAO Aerodrome Reference Codes ([C], [D], [E], [F]) */}
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-[#94a3b8] font-semibold font-sans">
                  ICAO Aerodrome Reference Codes (Wingspan &amp; Gate Capability)
                </div>
                <div className="space-y-1.5">
                  <div className="p-2 bg-[#090d16] border border-[#1c2638] rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded font-mono-hud font-semibold text-[10px] bg-[#d4a94a]/20 border border-[#d4a94a] text-[#d4a94a]">
                        Code [C]
                      </span>
                      <div>
                        <div className="text-white font-semibold">Narrowbody / Regional</div>
                        <div className="text-[10px] text-[#94a3b8]">A320, B737, E190 &middot; Wingspan &lt; 36m</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#94a3b8] font-mono-hud">Gates A1-C3</span>
                  </div>

                  <div className="p-2 bg-[#090d16] border border-[#1c2638] rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded font-mono-hud font-semibold text-[10px] bg-[#3b82f6]/20 border border-[#3b82f6] text-[#3b82f6]">
                        Code [D]
                      </span>
                      <div>
                        <div className="text-white font-semibold">Intermediate Airliner</div>
                        <div className="text-[10px] text-[#94a3b8]">B757, B767 &middot; Wingspan 36m &ndash; 52m</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#94a3b8] font-mono-hud">Gates A1-B3</span>
                  </div>

                  <div className="p-2 bg-[#090d16] border border-[#1c2638] rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded font-mono-hud font-semibold text-[10px] bg-[#38bdf8]/20 border border-[#38bdf8] text-[#38bdf8]">
                        Code [E]
                      </span>
                      <div>
                        <div className="text-white font-semibold">Widebody / Heavy</div>
                        <div className="text-[10px] text-[#94a3b8]">A350, B777, B787, A330 &middot; Wingspan 52m &ndash; 65m</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#94a3b8] font-mono-hud">Gates A1, A2, B1</span>
                  </div>

                  <div className="p-2 bg-[#090d16] border border-[#1c2638] rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded font-mono-hud font-semibold text-[10px] bg-[#a855f7]/20 border border-[#a855f7] text-[#a855f7]">
                        Code [F]
                      </span>
                      <div>
                        <div className="text-white font-semibold">Super Heavy</div>
                        <div className="text-[10px] text-[#94a3b8]">Airbus A380, Boeing 747-8 &middot; Wingspan 65m &ndash; 80m</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#94a3b8] font-mono-hud">Gate A1 Only</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Unified Ground Support Equipment (GSE) Icons */}
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-[#94a3b8] font-semibold font-sans">
                  Ground Support Equipment (GSE Fleet)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-[#090d16] border border-[#1c2638] rounded-lg flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#22c55e]/15 border border-[#22c55e]/40 flex items-center justify-center text-[#22c55e]">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-white font-semibold">Pushback Tug</div>
                      <div className="text-[10px] text-[#94a3b8]">Ramp departure dispatch</div>
                    </div>
                  </div>

                  <div className="p-2 bg-[#090d16] border border-[#1c2638] rounded-lg flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#3b82f6]/15 border border-[#3b82f6]/40 flex items-center justify-center text-[#3b82f6]">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-white font-semibold">Hydrant Refueler</div>
                      <div className="text-[10px] text-[#94a3b8]">Jet A-1 fuel servicing</div>
                    </div>
                  </div>

                  <div className="p-2 bg-[#090d16] border border-[#1c2638] rounded-lg flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#d4a94a]/15 border border-[#d4a94a]/40 flex items-center justify-center text-[#d4a94a]">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-white font-semibold">Baggage / Belt Loader</div>
                      <div className="text-[10px] text-[#94a3b8]">Cargo &amp; luggage loading</div>
                    </div>
                  </div>

                  <div className="p-2 bg-[#090d16] border border-[#1c2638] rounded-lg flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-[#e0555a]/15 border border-[#e0555a]/40 flex items-center justify-center text-[#e0555a]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-white font-semibold">ARFF Fire Rescue</div>
                      <div className="text-[10px] text-[#fca5a5]">Crash / rapid intervention</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[#1c2638] flex justify-end">
              <button
                onClick={() => setLegendOpen(false)}
                className="px-4 py-1.5 bg-[#162032] hover:bg-[#202c40] text-slate-200 border border-[#23354f] rounded-lg text-xs font-semibold"
              >
                Close Legend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Aircraft Dossier Side Drawer */}
      {selectedFlight && (
        <div
          id="flight-spatial-inspector"
          className="absolute bottom-4 left-4 max-w-sm w-full bg-[#0d1220]/95 border border-[#222f46] rounded-xl p-4 shadow-2xl backdrop-blur-md z-20 text-xs animate-in fade-in slide-in-from-bottom-3 space-y-3"
        >
          <div className="flex items-start justify-between pb-2 border-b border-[#1c2638]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white tracking-tight font-mono-hud">{selectedFlight.flightNumber}</span>
                <span className="text-[10px] px-2 py-0.5 bg-[#162032] text-slate-200 rounded font-semibold border border-[#23354f]">
                  {selectedFlight.airline}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-[#3b82f6]/10 border border-[#3b82f6]/40 text-[#3b82f6] rounded font-mono-hud font-semibold">
                  ICAO [{selectedFlight.aircraftCode}]
                </span>
              </div>
              <div className="text-[11px] text-[#94a3b8] mt-0.5 font-normal font-sans">
                {selectedFlight.origin} ({selectedFlight.originName}) &rarr; {selectedFlight.destination} ({selectedFlight.destinationName})
              </div>
            </div>

            <button
              onClick={() => setSelectedFlightId(null)}
              className="text-[#94a3b8] hover:text-white p-1 rounded-md transition"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[#090d16] p-2 rounded-lg border border-[#1c2638]">
              <span className="text-[9px] text-[#64748b] block font-normal uppercase font-sans">AIRCRAFT</span>
              <span className="font-semibold text-white text-xs font-mono-hud">{selectedFlight.aircraftType}</span>
            </div>
            <div className="bg-[#090d16] p-2 rounded-lg border border-[#1c2638]">
              <span className="text-[9px] text-[#64748b] block font-normal uppercase font-sans">STATUS</span>
              <span className="font-semibold text-[#3b82f6] text-xs font-mono-hud">{selectedFlight.status}</span>
            </div>
            <div className="bg-[#090d16] p-2 rounded-lg border border-[#1c2638]">
              <span className="text-[9px] text-[#64748b] block font-normal uppercase font-sans">ASSIGNED GATE</span>
              <span className={`font-semibold text-xs font-mono-hud ${selectedFlight.gateId ? 'text-[#22c55e]' : 'text-[#d4a94a]'}`}>
                {selectedFlight.gateId ? `Gate ${selectedFlight.gateId}` : 'NONE'}
              </span>
            </div>
          </div>

          {/* Turnaround Milestones if at gate */}
          {selectedFlight.turnaroundMilestones.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] uppercase tracking-wider text-[#94a3b8] font-normal font-sans flex justify-between">
                <span>Turnaround Progress</span>
                <span className="text-white font-mono-hud font-semibold">
                  {Math.round(
                    selectedFlight.turnaroundMilestones.reduce((acc, m) => acc + m.progressPercent, 0) /
                      selectedFlight.turnaroundMilestones.length
                  )}
                  %
                </span>
              </div>
              <div className="w-full bg-[#162032] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#3b82f6] h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(
                      selectedFlight.turnaroundMilestones.reduce((acc, m) => acc + m.progressPercent, 0) /
                        selectedFlight.turnaroundMilestones.length
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Conflict notice if any (Alert Red #e0555a) */}
          {flightConflictsMap.has(selectedFlight.id) && (
            <div className="p-2.5 bg-[#e0555a]/15 border border-[#e0555a]/70 rounded-lg flex items-start gap-2 text-[#fca5a5]">
              <AlertTriangle className="w-4 h-4 text-[#e0555a] shrink-0 mt-0.5" />
              <div className="text-[11px] font-sans">
                <div className="font-semibold text-[#fca5a5]">Conflict Active</div>
                <div className="text-white">{flightConflictsMap.get(selectedFlight.id)}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
