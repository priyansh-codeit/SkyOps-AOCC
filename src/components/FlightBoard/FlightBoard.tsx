import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  PlaneTakeoff,
  PlaneLanding,
  Clock,
  AlertTriangle,
  CheckCircle,
  Maximize2,
  ChevronRight,
  SlidersHorizontal,
  X,
  ShieldAlert,
  Calendar,
  Fuel,
  Users,
} from 'lucide-react';
import { useAirport } from '../../context/AirportContext';
import { Flight, FlightStatus, IcaoAircraftCode } from '../../types/airport';
import { MIN_TURNAROUND_TIMES, canAircraftFitGate } from '../../services/conflictEngine';

interface FlightBoardProps {
  onFocusFlightOnMap?: (flightId: string) => void;
  onOpenGatePlanner?: () => void;
}

export const FlightBoard: React.FC<FlightBoardProps> = ({ onFocusFlightOnMap, onOpenGatePlanner }) => {
  const {
    flights,
    gates,
    runways,
    conflicts,
    selectedFlightId,
    setSelectedFlightId,
    reassignGate,
    updateFlightDelay,
  } = useAirport();

  // Filters & Search
  const [filterType, setFilterType] = useState<'ALL' | 'ARRIVALS' | 'DEPARTURES' | 'CONFLICTS' | 'DELAYED' | 'GROUND'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'time' | 'flight' | 'airline' | 'delay' | 'status'>('time');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Quick Reassign Modal state for a flight
  const [reassignModalFlight, setReassignModalFlight] = useState<Flight | null>(null);

  // Map of conflicts per flight
  const conflictsByFlight = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of conflicts) {
      const list = map.get(c.flightId) || [];
      list.push(c.title);
      map.set(c.flightId, list);
    }
    return map;
  }, [conflicts]);

  // Filtered & Sorted Flights
  const displayedFlights = useMemo(() => {
    let result = [...flights];

    // Filter type
    if (filterType === 'ARRIVALS') {
      result = result.filter((f) => f.isArrival);
    } else if (filterType === 'DEPARTURES') {
      result = result.filter((f) => !f.isArrival);
    } else if (filterType === 'CONFLICTS') {
      result = result.filter((f) => conflictsByFlight.has(f.id));
    } else if (filterType === 'DELAYED') {
      result = result.filter((f) => f.delayMinutes > 0);
    } else if (filterType === 'GROUND') {
      result = result.filter((f) => ['AT_GATE', 'TURNAROUND', 'BOARDING', 'PUSHBACK'].includes(f.status));
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.flightNumber.toLowerCase().includes(q) ||
          f.callsign.toLowerCase().includes(q) ||
          f.airline.toLowerCase().includes(q) ||
          f.origin.toLowerCase().includes(q) ||
          f.originName.toLowerCase().includes(q) ||
          f.destination.toLowerCase().includes(q) ||
          f.destinationName.toLowerCase().includes(q) ||
          f.aircraftType.toLowerCase().includes(q) ||
          (f.gateId && f.gateId.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'time') {
        comparison = a.estimatedTime - b.estimatedTime;
      } else if (sortField === 'flight') {
        comparison = a.flightNumber.localeCompare(b.flightNumber);
      } else if (sortField === 'airline') {
        comparison = a.airline.localeCompare(b.airline);
      } else if (sortField === 'delay') {
        comparison = a.delayMinutes - b.delayMinutes;
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return sortAsc ? comparison : -comparison;
    });

    return result;
  }, [flights, filterType, searchQuery, sortField, sortAsc, conflictsByFlight]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const selectedFlight = useMemo(() => {
    return flights.find((f) => f.id === selectedFlightId) || null;
  }, [flights, selectedFlightId]);

  // Format time (minutes from 00:00) to HH:MM
  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60) % 24;
    const mins = Math.floor(minutes % 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const getStatusBadge = (status: FlightStatus, isEmergency?: boolean) => {
    if (isEmergency) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#e0555a] text-white animate-pulse">
          EMERGENCY
        </span>
      );
    }

    switch (status) {
      case 'SCHEDULED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-normal bg-[#111726] text-[#94a3b8] border border-[#1c2638]">SCHEDULED</span>;
      case 'EN_ROUTE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#3b82f6]/15 text-[#60a5fa] border border-[#3b82f6]/40">EN ROUTE</span>;
      case 'FINAL_APPROACH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#3b82f6]/20 text-[#93c5fd] border border-[#3b82f6]/50">APPROACH</span>;
      case 'LANDED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/40">LANDED</span>;
      case 'TAXIING_IN':
      case 'TAXIING_OUT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#d4a94a]/15 text-[#d4a94a] border border-[#d4a94a]/40">TAXIING</span>;
      case 'AT_GATE':
      case 'TURNAROUND':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#3b82f6]/15 text-[#3b82f6] border border-[#3b82f6]/40">AT GATE</span>;
      case 'BOARDING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/40">BOARDING</span>;
      case 'PUSHBACK':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950/40 text-purple-300 border border-purple-800/40">PUSHBACK</span>;
      case 'HOLDING_SHORT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#d4a94a]/20 text-[#fde68a] border border-[#d4a94a]/60">HOLD SHORT</span>;
      case 'TAKEOFF_ROLL':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#22c55e] text-[#090d16]">TAKEOFF</span>;
      case 'DEPARTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-normal bg-[#111726] text-[#64748b]">DEPARTED</span>;
      case 'DIVERTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#e0555a]/20 text-[#fca5a5] border border-[#e0555a]">DIVERTED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-normal bg-[#111726] text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1220] text-white select-none font-sans">
      {/* Search & Filter Toolbar */}
      <div className="p-3 bg-[#090d16] border-b border-[#1c2638] flex flex-wrap items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#0d1220] p-1 rounded-lg border border-[#1c2638]">
          {[
            { key: 'ALL', label: `All (${flights.length})` },
            { key: 'ARRIVALS', label: `Arrivals (${flights.filter((f) => f.isArrival).length})` },
            { key: 'DEPARTURES', label: `Departures (${flights.filter((f) => !f.isArrival).length})` },
            { key: 'CONFLICTS', label: `Conflicts (${conflicts.length})`, alert: conflicts.length > 0 },
            { key: 'DELAYED', label: `Delayed (${flights.filter((f) => f.delayMinutes > 0).length})` },
            { key: 'GROUND', label: 'At Gate / Turnaround' },
          ].map((tab) => (
            <button
              key={tab.key}
              id={`filter-tab-${tab.key.toLowerCase()}`}
              onClick={() => setFilterType(tab.key as typeof filterType)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                filterType === tab.key
                  ? 'bg-[#3b82f6] text-white shadow-sm'
                  : 'text-[#94a3b8] hover:text-white hover:bg-[#141c2b]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.alert && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#e0555a] animate-ping inline-block" />
              )}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-[#94a3b8]" />
          <input
            id="flight-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Flight, Callsign, City..."
            className="w-full bg-[#0d1220] border border-[#1c2638] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-[#94a3b8] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#090d16] sticky top-0 z-10 border-b border-[#1c2638] text-[#94a3b8] text-[11px] font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3 font-semibold">Flight / Callsign</th>
              <th className="py-2.5 px-3 font-semibold">Type</th>
              <th className="py-2.5 px-3 font-semibold">Route</th>
              <th className="py-2.5 px-3 font-semibold">Aircraft</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-white font-semibold"
                onClick={() => handleSort('time')}
              >
                <div className="flex items-center gap-1">
                  <span>Sched / Est</span>
                  <ArrowUpDown className="w-3 h-3 text-[#3b82f6]" />
                </div>
              </th>
              <th className="py-2.5 px-3 font-semibold">Gate Stand</th>
              <th className="py-2.5 px-3 font-semibold">Runway</th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-white font-semibold"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3 text-[#3b82f6]" />
                </div>
              </th>
              <th
                className="py-2.5 px-3 cursor-pointer hover:text-white font-semibold"
                onClick={() => handleSort('delay')}
              >
                <div className="flex items-center gap-1">
                  <span>Delay</span>
                  <ArrowUpDown className="w-3 h-3 text-[#3b82f6]" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#182232]">
            {displayedFlights.map((flight) => {
              const hasConflict = conflictsByFlight.has(flight.id);
              const isSelected = selectedFlightId === flight.id;
              const assignedGate = gates.find((g) => g.id === flight.gateId);

              return (
                <tr
                  key={flight.id}
                  id={`flight-row-${flight.id}`}
                  onClick={() => setSelectedFlightId(flight.id)}
                  className={`cursor-pointer transition hover:bg-[#141d2d] ${
                    isSelected ? 'bg-[#3b82f6]/10 border-l-2 border-[#3b82f6]' : ''
                  } ${hasConflict ? 'bg-[#e0555a]/10' : ''}`}
                >
                  {/* Flight / Callsign */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: flight.airlineColor || '#38bdf8' }}
                      />
                      <div>
                        <span className="font-semibold text-white tracking-tight font-mono-hud">{flight.flightNumber}</span>
                        <span className="text-[11px] text-[#94a3b8] block font-mono-hud font-normal">{flight.callsign}</span>
                      </div>
                    </div>
                  </td>

                  {/* Arrival / Departure Type */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1 text-[11px] font-semibold">
                      {flight.isArrival ? (
                        <span className="flex items-center gap-1 text-[#38bdf8]">
                          <PlaneLanding className="w-3.5 h-3.5" /> ARR
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#22c55e]">
                          <PlaneTakeoff className="w-3.5 h-3.5" /> DEP
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Route */}
                  <td className="py-2.5 px-3">
                    <div className="text-[11px]">
                      <span className="text-white font-semibold font-mono-hud">{flight.origin}</span>
                      <span className="text-[#94a3b8] mx-1">&rarr;</span>
                      <span className="text-white font-semibold font-mono-hud">{flight.destination}</span>
                      <span className="text-[11px] text-[#94a3b8] block font-normal">
                        {flight.isArrival ? flight.originName : flight.destinationName}
                      </span>
                    </div>
                  </td>

                  {/* Aircraft */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-normal">{flight.aircraftType}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-mono-hud font-semibold ${
                          flight.aircraftCode === 'F'
                            ? 'bg-purple-950/60 text-purple-300 border border-purple-800/60'
                            : flight.aircraftCode === 'E'
                            ? 'bg-[#3b82f6]/20 text-[#60a5fa] border border-[#3b82f6]/50'
                            : 'bg-[#d4a94a]/20 text-[#d4a94a] border border-[#d4a94a]/50'
                        }`}
                      >
                        {flight.aircraftCode}
                      </span>
                    </div>
                  </td>

                  {/* Sched / Est Time */}
                  <td className="py-2.5 px-3 font-mono-hud">
                    <div className="text-[11px]">
                      <span className="text-[#94a3b8] font-normal">{formatTime(flight.scheduledTime)}</span>
                      <span className="text-[#64748b] mx-1">/</span>
                      <span
                        className={`font-semibold ${
                          flight.delayMinutes > 0 ? 'text-[#e0555a]' : 'text-[#22c55e]'
                        }`}
                      >
                        {formatTime(flight.estimatedTime)}
                      </span>
                    </div>
                  </td>

                  {/* Gate Stand */}
                  <td className="py-2.5 px-3 font-mono-hud">
                    {flight.gateId ? (
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-[#090d16] border border-[#1c2638] text-[#3b82f6] font-semibold">
                          {assignedGate?.name || `Gate ${flight.gateId}`}
                        </span>
                        {assignedGate && !canAircraftFitGate(flight.aircraftCode, assignedGate.maxAircraftCode) && (
                          <span
                            title="ICAO Gate Size Mismatch!"
                            className="text-[#e0555a]"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#94a3b8] italic font-sans font-normal">Unassigned</span>
                    )}
                  </td>

                  {/* Assigned Runway */}
                  <td className="py-2.5 px-3 font-mono-hud">
                    <span className="px-1.5 py-0.5 rounded bg-[#090d16] border border-[#1c2638] text-white text-[11px] font-semibold">
                      {flight.assignedRunway}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-2.5 px-3">
                    {getStatusBadge(flight.status, flight.isEmergency)}
                  </td>

                  {/* Delay */}
                  <td className="py-2.5 px-3 font-mono-hud">
                    {flight.delayMinutes > 0 ? (
                      <span className="text-[#e0555a] font-semibold">+{flight.delayMinutes}m</span>
                    ) : (
                      <span className="text-[#22c55e] font-semibold">ON TIME</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        id={`reassign-gate-btn-${flight.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setReassignModalFlight(flight);
                        }}
                        className="px-2 py-1 bg-[#141d2d] hover:bg-[#1c2638] text-[#3b82f6] border border-[#23354f] rounded text-[11px] font-semibold transition font-sans"
                      >
                        Gate
                      </button>

                      {onFocusFlightOnMap && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFlightId(flight.id);
                            onFocusFlightOnMap(flight.id);
                          }}
                          title="Locate on Airside Map"
                          className="p-1 bg-[#141d2d] hover:bg-[#1c2638] text-[#94a3b8] hover:text-white border border-[#23354f] rounded transition"
                        >
                          <Maximize2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Slide-out Flight Turnaround Timeline & Dossier Drawer */}
      {selectedFlight && (
        <div
          id="flight-dossier-drawer"
          className="border-t border-[#1c2638] bg-[#090d16] p-4 flex flex-col md:flex-row gap-4 justify-between items-start z-10 text-xs"
        >
          {/* Left Column: Key Flight Profile */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold text-white tracking-tight font-mono-hud">{selectedFlight.flightNumber}</span>
              <span className="px-2 py-0.5 bg-[#141d2d] border border-[#23354f] text-[#3b82f6] rounded font-semibold font-sans">
                {selectedFlight.airline}
              </span>
              <span className="text-[#94a3b8] font-sans">Callsign: <strong className="text-white font-mono-hud font-semibold">{selectedFlight.callsign}</strong></span>
              {getStatusBadge(selectedFlight.status, selectedFlight.isEmergency)}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-[#0d1220] p-2 rounded-lg border border-[#1c2638]">
                <span className="text-[#64748b] block text-[9px] uppercase font-normal font-sans">Route</span>
                <span className="font-semibold text-white font-mono-hud">{selectedFlight.origin} &rarr; {selectedFlight.destination}</span>
              </div>
              <div className="bg-[#0d1220] p-2 rounded-lg border border-[#1c2638]">
                <span className="text-[#64748b] block text-[9px] uppercase font-normal font-sans">ICAO Category</span>
                <span className="font-semibold text-[#d4a94a] font-mono-hud">Code [{selectedFlight.aircraftCode}] ({selectedFlight.aircraftType})</span>
              </div>
              <div className="bg-[#0d1220] p-2 rounded-lg border border-[#1c2638]">
                <span className="text-[#64748b] block text-[9px] uppercase font-normal font-sans flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#3b82f6]" /> Pax Load
                </span>
                <span className="font-semibold text-white font-mono-hud">{selectedFlight.passengers} Souls</span>
              </div>
              <div className="bg-[#0d1220] p-2 rounded-lg border border-[#1c2638]">
                <span className="text-[#64748b] block text-[9px] uppercase font-normal font-sans flex items-center gap-1">
                  <Fuel className="w-3 h-3 text-[#22c55e]" /> Fuel Remaining
                </span>
                <span className="font-semibold text-white font-mono-hud">{(selectedFlight.fuelRemainingKg / 1000).toFixed(1)} T</span>
              </div>
            </div>
          </div>

          {/* Right Column: Turnaround Milestones & Quick Delay Adjuster */}
          <div className="flex-1 w-full md:w-auto bg-[#0d1220] p-3 rounded-lg border border-[#1c2638] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-white uppercase tracking-wider font-sans">
                Turnaround Milestones &amp; Gate Buffer
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-[#94a3b8] font-sans">Slot Delay:</span>
                <button
                  id="delay-plus-5-btn"
                  onClick={() => updateFlightDelay(selectedFlight.id, 5)}
                  className="px-2 py-0.5 bg-[#141d2d] hover:bg-[#1c2638] text-[#3b82f6] font-semibold border border-[#23354f] rounded text-[11px] font-mono-hud"
                >
                  +5m
                </button>
                <button
                  id="delay-plus-15-btn"
                  onClick={() => updateFlightDelay(selectedFlight.id, 15)}
                  className="px-2 py-0.5 bg-[#141d2d] hover:bg-[#1c2638] text-[#d4a94a] font-semibold border border-[#23354f] rounded text-[11px] font-mono-hud"
                >
                  +15m
                </button>
              </div>
            </div>

            {selectedFlight.turnaroundMilestones.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {selectedFlight.turnaroundMilestones.map((m) => (
                  <div key={m.id} className="bg-[#090d16] p-2 rounded border border-[#1c2638]">
                    <div className="flex items-center justify-between text-[11px] text-white mb-1">
                      <span className="truncate font-sans font-normal">{m.name}</span>
                      <span className="font-semibold text-[#3b82f6] font-mono-hud">{m.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-[#141d2d] h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          m.status === 'COMPLETED'
                            ? 'bg-[#22c55e]'
                            : m.status === 'IN_PROGRESS'
                            ? 'bg-[#3b82f6]'
                            : 'bg-slate-700'
                        }`}
                        style={{ width: `${m.progressPercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[#94a3b8] italic text-center py-2 text-xs font-sans font-normal">
                Aircraft is currently airborne / in approach corridor. Ground turnaround commences at gate stand.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Gate Reassignment Modal */}
      {reassignModalFlight && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0d1220] border border-[#222f46] rounded-xl max-w-md w-full p-5 shadow-2xl text-xs space-y-4 font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-[#1c2638]">
              <div>
                <h3 className="text-sm font-semibold text-white">Reassign Gate Stand</h3>
                <p className="text-[11px] text-[#94a3b8] mt-0.5 font-normal">
                  {reassignModalFlight.flightNumber} ({reassignModalFlight.aircraftType} &middot; Code [{reassignModalFlight.aircraftCode}])
                </p>
              </div>
              <button
                onClick={() => setReassignModalFlight(null)}
                className="text-[#94a3b8] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <div className="text-[10px] uppercase text-[#94a3b8] font-semibold tracking-wider">
                Available Aerodrome Gate Stands
              </div>

              {gates.map((gate) => {
                const canFit = canAircraftFitGate(reassignModalFlight.aircraftCode, gate.maxAircraftCode);
                const isCurrent = gate.id === reassignModalFlight.gateId;
                const isOccupied = gate.occupiedByFlightId !== null && !isCurrent;

                return (
                  <button
                    key={gate.id}
                    disabled={isCurrent}
                    onClick={() => {
                      reassignGate(reassignModalFlight.id, gate.id);
                      setReassignModalFlight(null);
                    }}
                    className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition ${
                      isCurrent
                        ? 'bg-[#3b82f6]/15 border-[#3b82f6]/50 text-white'
                        : canFit
                        ? 'bg-[#090d16] border-[#1c2638] hover:border-[#3b82f6]/60 text-white'
                        : 'bg-[#e0555a]/15 border-[#e0555a]/50 text-[#fca5a5] hover:bg-[#e0555a]/25'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white font-mono-hud">{gate.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-[#141d2d] text-slate-200 rounded border border-[#23354f]">
                          Concourse {gate.concourse}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono-hud font-semibold ${
                            gate.maxAircraftCode === 'F'
                              ? 'bg-purple-950/60 text-purple-300'
                              : gate.maxAircraftCode === 'E'
                              ? 'bg-[#3b82f6]/20 text-[#60a5fa]'
                              : 'bg-[#d4a94a]/20 text-[#d4a94a]'
                          }`}
                        >
                          Max {gate.maxAircraftCode}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#94a3b8] mt-0.5 font-normal">
                        {isCurrent
                          ? 'Currently Assigned'
                          : isOccupied
                          ? 'Occupied by another flight'
                          : canFit
                          ? 'Available & ICAO Compliant'
                          : `ICAO Size Mismatch (requires max ${gate.maxAircraftCode})`}
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-[#94a3b8]" />
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1c2638]">
              <button
                onClick={() => {
                  reassignGate(reassignModalFlight.id, null);
                  setReassignModalFlight(null);
                }}
                className="px-3 py-1.5 bg-[#141d2d] hover:bg-[#1c2638] text-slate-200 font-normal border border-[#23354f] rounded-lg text-xs"
              >
                Unassign Gate
              </button>
              <button
                onClick={() => setReassignModalFlight(null)}
                className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold rounded-lg text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
