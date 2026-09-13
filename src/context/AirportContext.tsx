import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  Flight,
  Gate,
  Runway,
  GroundVehicle,
  WeatherState,
  OperationalDisruption,
  OperationalConflict,
  AirportKpi,
  IcaoAircraftCode,
} from '../types/airport';
import {
  INITIAL_RUNWAYS,
  INITIAL_GATES,
  INITIAL_VEHICLES,
  INITIAL_FLIGHTS,
  INITIAL_WEATHER,
  INITIAL_DISRUPTIONS,
} from '../data/initialAirportData';
import { detectConflicts, MIN_TURNAROUND_TIMES, canAircraftFitGate } from '../services/conflictEngine';
import { playConflictAlert, playRadioClick } from '../services/soundEffects';

interface AirportContextType {
  // Clock & Simulation Controls
  simTimeMinutes: number; // e.g. 510 = 08:30 UTC
  simTimeFormatted: string; // "08:30:00 UTC"
  isPlaying: boolean;
  simSpeed: number; // 1, 2, 5, 10, 30
  togglePlay: () => void;
  setSimSpeed: (speed: number) => void;
  stepSimulation: (deltaMinutes: number) => void;
  resetSimulation: () => void;

  // Domain Entities
  flights: Flight[];
  gates: Gate[];
  runways: Runway[];
  vehicles: GroundVehicle[];
  weather: WeatherState;
  disruptions: OperationalDisruption[];
  conflicts: OperationalConflict[];
  kpis: AirportKpi;

  // Selected state for details drawers
  selectedFlightId: string | null;
  selectedGateId: string | null;
  selectedRunwayId: string | null;
  setSelectedFlightId: (id: string | null) => void;
  setSelectedGateId: (id: string | null) => void;
  setSelectedRunwayId: (id: string | null) => void;

  // Actions
  reassignGate: (flightId: string, targetGateId: string | null) => { success: boolean; message: string };
  updateFlightDelay: (flightId: string, additionalMinutes: number, reason?: string) => void;
  rerouteRunway: (flightId: string, targetRunwayId: string) => void;
  divertFlight: (flightId: string, alternateIcao?: string) => void;
  toggleDisruption: (disruptionId: string) => void;
  updateWeather: (partial: Partial<WeatherState>) => void;
  toggleRunwayOpen: (runwayId: string, reason?: string) => void;
  executeResolution: (conflictId: string, resolutionId: string) => void;
  dispatchVehicle: (vehicleId: string, flightId: string) => void;
  addNewCustomScenario: (title: string, type: OperationalDisruption['type'], impact: string) => void;

  // Audio Toggle
  isAudioMuted: boolean;
  setIsAudioMuted: (muted: boolean) => void;
}

const AirportContext = createContext<AirportContextType | null>(null);

export const AirportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [simTimeMinutes, setSimTimeMinutes] = useState<number>(510); // 08:30 UTC
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(2); // Default 2x speed for comfortable live viewing
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  const [flights, setFlights] = useState<Flight[]>(INITIAL_FLIGHTS);
  const [gates, setGates] = useState<Gate[]>(INITIAL_GATES);
  const [runways, setRunways] = useState<Runway[]>(INITIAL_RUNWAYS);
  const [vehicles, setVehicles] = useState<GroundVehicle[]>(INITIAL_VEHICLES);
  const [weather, setWeather] = useState<WeatherState>(INITIAL_WEATHER);
  const [disruptions, setDisruptions] = useState<OperationalDisruption[]>(INITIAL_DISRUPTIONS);

  const [selectedFlightId, setSelectedFlightId] = useState<string | null>(null);
  const [selectedGateId, setSelectedGateId] = useState<string | null>(null);
  const [selectedRunwayId, setSelectedRunwayId] = useState<string | null>(null);

  // Compute live ICAO conflicts
  const conflicts = React.useMemo(() => {
    return detectConflicts(flights, gates, runways);
  }, [flights, gates, runways]);

  const prevConflictCountRef = useRef(conflicts.length);
  useEffect(() => {
    if (!isAudioMuted && conflicts.length > prevConflictCountRef.current) {
      playConflictAlert();
    }
    prevConflictCountRef.current = conflicts.length;
  }, [conflicts.length, isAudioMuted]);

  // Compute Airport KPIs
  const kpis = React.useMemo<AirportKpi>(() => {
    const activeFlights = flights.filter((f) => f.status !== 'CANCELLED' && f.status !== 'DIVERTED');
    const onTimeCount = activeFlights.filter((f) => f.delayMinutes <= 15).length;
    const totalDelay = activeFlights.reduce((acc, f) => acc + f.delayMinutes, 0);
    const occupiedGates = gates.filter((g) => g.occupiedByFlightId !== null).length;
    const criticalCount = conflicts.filter((c) => c.severity === 'CRITICAL').length;

    // Safety index derived from conflicts and runway condition
    const safetyScore = Math.max(
      60,
      100 - criticalCount * 12 - (weather.condition === 'LVP_ACTIVE' ? 8 : 0)
    );

    return {
      onTimePerformancePercent: activeFlights.length ? Math.round((onTimeCount / activeFlights.length) * 100) : 100,
      averageDelayMinutes: activeFlights.length ? Math.round(totalDelay / activeFlights.length) : 0,
      runwayCapacityPerHour: runways.filter((r) => r.isOpen).length * (weather.condition === 'VMC' ? 32 : 18),
      activeMovementsCount: activeFlights.filter((f) => ['FINAL_APPROACH', 'LANDED', 'TAXIING_IN', 'PUSHBACK', 'TAXIING_OUT', 'TAKEOFF_ROLL'].includes(f.status)).length,
      gateOccupancyPercent: Math.round((occupiedGates / gates.length) * 100),
      criticalConflictsCount: criticalCount,
      safetyIndexScore: safetyScore,
    };
  }, [flights, gates, runways, conflicts, weather]);

  // Time formatter
  const simTimeFormatted = React.useMemo(() => {
    const totalSeconds = Math.floor(simTimeMinutes * 60);
    const hours = Math.floor((totalSeconds / 3600) % 24);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} UTC`;
  }, [simTimeMinutes]);

  // Gate Reassignment with instant conflict clearance / feedback
  const reassignGate = useCallback(
    (flightId: string, targetGateId: string | null): { success: boolean; message: string } => {
      const flight = flights.find((f) => f.id === flightId);
      if (!flight) return { success: false, message: 'Flight not found' };

      if (targetGateId) {
        const targetGate = gates.find((g) => g.id === targetGateId);
        if (!targetGate) return { success: false, message: 'Target gate not found' };

        if (!canAircraftFitGate(flight.aircraftCode, targetGate.maxAircraftCode)) {
          return {
            success: false,
            message: `ICAO violation: ${flight.aircraftType} (${flight.aircraftCode}) exceeds ${targetGate.name} max capacity (${targetGate.maxAircraftCode})`,
          };
        }
      }

      // Update gates occupancy and flight
      setGates((prev) =>
        prev.map((g) => {
          if (g.occupiedByFlightId === flightId && g.id !== targetGateId) {
            return { ...g, occupiedByFlightId: null };
          }
          if (targetGateId && g.id === targetGateId) {
            return { ...g, occupiedByFlightId: flightId };
          }
          return g;
        })
      );

      setFlights((prev) =>
        prev.map((f) => {
          if (f.id === flightId) {
            // Reposition if flight is at gate
            const targetGate = targetGateId ? gates.find((g) => g.id === targetGateId) : null;
            return {
              ...f,
              gateId: targetGateId,
              x: targetGate && ['AT_GATE', 'TURNAROUND', 'BOARDING'].includes(f.status) ? targetGate.x : f.x,
              y: targetGate && ['AT_GATE', 'TURNAROUND', 'BOARDING'].includes(f.status) ? targetGate.y : f.y,
            };
          }
          return f;
        })
      );

      playRadioClick();
      return { success: true, message: `Gate ${targetGateId ? targetGateId : 'Cleared'} reassigned successfully` };
    },
    [flights, gates]
  );

  const updateFlightDelay = useCallback((flightId: string, additionalMinutes: number, reason?: string) => {
    setFlights((prev) =>
      prev.map((f) => {
        if (f.id === flightId) {
          const newDelay = Math.max(0, f.delayMinutes + additionalMinutes);
          return {
            ...f,
            delayMinutes: newDelay,
            estimatedTime: f.scheduledTime + newDelay,
            delayReason: reason || f.delayReason || 'Operational slot adjustment',
          };
        }
        return f;
      })
    );
    playRadioClick();
  }, []);

  const rerouteRunway = useCallback((flightId: string, targetRunwayId: string) => {
    setFlights((prev) =>
      prev.map((f) => {
        if (f.id === flightId) {
          return {
            ...f,
            assignedRunway: targetRunwayId,
            delayReason: `Rerouted to ${targetRunwayId}`,
          };
        }
        return f;
      })
    );
    playRadioClick();
  }, []);

  const divertFlight = useCallback((flightId: string, alternateIcao = 'KOAK') => {
    setFlights((prev) =>
      prev.map((f) => {
        if (f.id === flightId) {
          return {
            ...f,
            status: 'DIVERTED',
            destination: alternateIcao,
            destinationName: `${alternateIcao} (Alternate)`,
            delayReason: `Diverted due to runway / operational emergency`,
            headingDeg: 270,
            altitudeFt: 5000,
            speedKts: 280,
          };
        }
        return f;
      })
    );
    playRadioClick();
  }, []);

  const toggleRunwayOpen = useCallback((runwayId: string, reason?: string) => {
    setRunways((prev) =>
      prev.map((r) => {
        if (r.id === runwayId) {
          const nextState = !r.isOpen;
          return {
            ...r,
            isOpen: nextState,
            closureReason: nextState ? undefined : reason || 'Maintenance / FOD Hazard',
          };
        }
        return r;
      })
    );
    playRadioClick();
  }, []);

  const toggleDisruption = useCallback((disruptionId: string) => {
    setDisruptions((prev) =>
      prev.map((d) => {
        if (d.id === disruptionId) {
          const nextActive = !d.active;

          // Cascade operational side-effects
          if (d.type === 'RUNWAY_CLOSURE' && d.affectedRunwayId) {
            toggleRunwayOpen(d.affectedRunwayId, nextActive ? 'FOD Hazard & Safety Inspection' : undefined);
          }

          if (d.type === 'WEATHER_CELL') {
            setWeather((w) => ({
              ...w,
              condition: nextActive ? 'LVP_ACTIVE' : 'VMC',
              visibilityKm: nextActive ? 0.8 : 16,
              windSpeedKts: nextActive ? 28 : 14,
              windGustKts: nextActive ? 42 : 22,
              rainIntensity: nextActive ? 'HEAVY' : 'NONE',
            }));
          }

          if (d.type === 'MEDICAL_EMERGENCY' && d.affectedFlightId) {
            setFlights((fls) =>
              fls.map((f) => {
                if (f.id === d.affectedFlightId) {
                  return {
                    ...f,
                    isEmergency: nextActive,
                    emergencyType: nextActive ? 'MEDICAL' : undefined,
                    delayMinutes: 0,
                    status: nextActive ? 'FINAL_APPROACH' : f.status,
                  };
                }
                return f;
              })
            );

            // Dispatch ARFF Crash Tender to runway exit
            setVehicles((vs) =>
              vs.map((v) => {
                if (v.type === 'ARFF_RESCUE') {
                  return {
                    ...v,
                    status: nextActive ? 'EMERGENCY_DISPATCH' : 'IDLE',
                    targetX: nextActive ? 300 : v.depotX,
                    targetY: nextActive ? 160 : v.depotY,
                  };
                }
                return v;
              })
            );
          }

          return { ...d, active: nextActive };
        }
        return d;
      })
    );
    playRadioClick();
  }, [toggleRunwayOpen]);

  const updateWeather = useCallback((partial: Partial<WeatherState>) => {
    setWeather((prev) => ({ ...prev, ...partial }));
  }, []);

  const dispatchVehicle = useCallback((vehicleId: string, flightId: string) => {
    const flight = flights.find((f) => f.id === flightId);
    if (!flight || !flight.gateId) return;
    const gate = gates.find((g) => g.id === flight.gateId);
    if (!gate) return;

    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id === vehicleId) {
          return {
            ...v,
            assignedFlightId: flightId,
            assignedGateId: gate.id,
            status: 'EN_ROUTE',
            targetX: gate.x,
            targetY: gate.y + (v.type === 'PUSHBACK_TUG' ? 12 : -10),
          };
        }
        return v;
      })
    );
  }, [flights, gates]);

  const executeResolution = useCallback(
    (conflictId: string, resolutionId: string) => {
      const conflict = conflicts.find((c) => c.id === conflictId);
      if (!conflict) return;

      const resolution = conflict.recommendedResolutions.find((r) => r.id === resolutionId);
      if (!resolution) return;

      if (resolution.actionType === 'REASSIGN_GATE' && resolution.targetValue) {
        reassignGate(conflict.flightId, String(resolution.targetValue));
      } else if (resolution.actionType === 'RESCHEDULE_DELAY' && resolution.targetValue) {
        updateFlightDelay(conflict.flightId, Number(resolution.targetValue), 'ICAO buffer schedule resolution');
      } else if (resolution.actionType === 'REROUTE_RUNWAY' && resolution.targetValue) {
        rerouteRunway(conflict.flightId, String(resolution.targetValue));
      } else if (resolution.actionType === 'DIVERT_FLIGHT') {
        divertFlight(conflict.flightId);
      }
    },
    [conflicts, reassignGate, updateFlightDelay, rerouteRunway, divertFlight]
  );

  const addNewCustomScenario = useCallback((title: string, type: OperationalDisruption['type'], impact: string) => {
    const newDisruption: OperationalDisruption = {
      id: `DIS-${Date.now()}`,
      name: title,
      type,
      active: true,
      impactSummary: impact,
    };
    setDisruptions((prev) => [newDisruption, ...prev]);
    playRadioClick();
  }, []);

  const stepSimulation = useCallback((deltaMinutes: number) => {
    setSimTimeMinutes((m) => m + deltaMinutes);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const resetSimulation = useCallback(() => {
    setSimTimeMinutes(510);
    setFlights(INITIAL_FLIGHTS);
    setGates(INITIAL_GATES);
    setRunways(INITIAL_RUNWAYS);
    setVehicles(INITIAL_VEHICLES);
    setWeather(INITIAL_WEATHER);
    setDisruptions(INITIAL_DISRUPTIONS);
    setSelectedFlightId(null);
    setSelectedGateId(null);
    setSelectedRunwayId(null);
  }, []);

  // Main Simulation Loop (runs when isPlaying is true)
  useEffect(() => {
    if (!isPlaying) return;

    // Tick every 200ms for smooth 5fps/10fps physics updates
    const intervalMs = 200;
    const timer = setInterval(() => {
      // Delta time in simulation minutes: e.g. at 1x speed, 1 real second = 0.05 sim minutes (3 sim seconds)
      // At 10x speed, 1 real second = 0.5 sim minutes (30 sim seconds)
      const simDeltaMinutes = (0.05 * simSpeed * intervalMs) / 1000;

      setSimTimeMinutes((curr) => curr + simDeltaMinutes);

      // Advance aircraft physics and lifecycle states
      setFlights((prevFlights) =>
        prevFlights.map((flight) => {
          if (flight.status === 'DEPARTED' || flight.status === 'CANCELLED' || flight.status === 'DIVERTED') {
            return flight;
          }

          let { x, y, altitudeFt, speedKts, headingDeg, status } = flight;
          const milestones = [...flight.turnaroundMilestones];

          // 1. EN_ROUTE -> Approaching airport
          if (status === 'EN_ROUTE') {
            x += (speedKts / 60) * 0.15;
            if (altitudeFt > 1200) {
              altitudeFt = Math.max(1200, altitudeFt - 80);
            }
            if (x >= -40) {
              status = 'FINAL_APPROACH';
              headingDeg = 90;
              speedKts = 142;
              altitudeFt = 1100;
              y = flight.assignedRunway === 'RWY-09R' ? 530 : 120;
            }
          }
          // 2. FINAL_APPROACH -> Approaching Runway threshold (X=120)
          else if (status === 'FINAL_APPROACH') {
            x += (speedKts / 70) * 0.2;
            altitudeFt = Math.max(0, altitudeFt - 45);
            if (x >= 120) {
              status = 'LANDED';
              altitudeFt = 0;
              speedKts = 110;
            }
          }
          // 3. LANDED -> Rollout along runway towards exit
          else if (status === 'LANDED') {
            x += (speedKts / 60) * 0.18;
            speedKts = Math.max(22, speedKts - 8);
            if (x >= 360) {
              status = 'TAXIING_IN';
              headingDeg = flight.assignedRunway === 'RWY-09R' ? 0 : 180;
              speedKts = 18;
            }
          }
          // 4. TAXIING_IN -> Moving towards assigned gate
          else if (status === 'TAXIING_IN') {
            const targetGate = flight.gateId ? gates.find((g) => g.id === flight.gateId) : null;
            if (targetGate) {
              const dx = targetGate.x - x;
              const dy = targetGate.y - y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < 4) {
                x = targetGate.x;
                y = targetGate.y;
                speedKts = 0;
                headingDeg = targetGate.headingDeg;
                status = 'AT_GATE';
              } else {
                x += (dx / dist) * 1.2;
                y += (dy / dist) * 1.2;
                headingDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 90);
              }
            }
          }
          // 5. AT_GATE -> Progress turnaround milestones
          else if (status === 'AT_GATE' || status === 'TURNAROUND') {
            status = 'TURNAROUND';
            let allCompleted = true;
            for (let i = 0; i < milestones.length; i++) {
              const m = milestones[i];
              if (m.status === 'PENDING') {
                m.status = 'IN_PROGRESS';
                allCompleted = false;
                break;
              } else if (m.status === 'IN_PROGRESS') {
                allCompleted = false;
                m.progressPercent = Math.min(100, m.progressPercent + (simSpeed * 1.5));
                if (m.progressPercent >= 100) {
                  m.status = 'COMPLETED';
                }
                break;
              }
            }

            if (allCompleted && milestones.length > 0) {
              status = 'BOARDING';
            }
          }
          // 6. BOARDING -> When full, pushback
          else if (status === 'BOARDING') {
            const allDone = milestones.every((m) => m.status === 'COMPLETED');
            if (allDone) {
              status = 'PUSHBACK';
              speedKts = 4;
            }
          }
          // 7. PUSHBACK -> Reverse into taxiway lane
          else if (status === 'PUSHBACK') {
            y += headingDeg === 180 ? 0.6 : -0.6;
            if (Math.abs(y - 280) < 6 || Math.abs(y - 340) < 6) {
              status = 'TAXIING_OUT';
              headingDeg = 90;
              speedKts = 16;
            }
          }
          // 8. TAXIING_OUT -> Moving to departure runway threshold
          else if (status === 'TAXIING_OUT') {
            const targetX = 140;
            const targetY = 530; // RWY-09R threshold
            const dx = targetX - x;
            const dy = targetY - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 8) {
              x = targetX;
              y = targetY;
              status = 'HOLDING_SHORT';
              speedKts = 0;
              headingDeg = 90;
            } else {
              x += (dx / dist) * 1.4;
              y += (dy / dist) * 1.4;
              headingDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 90);
            }
          }
          // 9. HOLDING_SHORT -> Cleared for takeoff roll
          else if (status === 'HOLDING_SHORT') {
            // Check if runway is open and clear
            const runway = runways.find((r) => r.id === flight.assignedRunway);
            if (runway && runway.isOpen) {
              status = 'TAKEOFF_ROLL';
              speedKts = 40;
            }
          }
          // 10. TAKEOFF_ROLL -> Accelerate along runway
          else if (status === 'TAKEOFF_ROLL') {
            x += (speedKts / 45) * 0.35;
            speedKts = Math.min(170, speedKts + 8);
            if (x > 650) {
              altitudeFt += 60;
            }
            if (x > 900) {
              status = 'DEPARTED';
              altitudeFt = 3200;
              speedKts = 250;
            }
          }

          return {
            ...flight,
            x,
            y,
            altitudeFt,
            speedKts,
            headingDeg,
            status,
            turnaroundMilestones: milestones,
          };
        })
      );

      // Advance Ground Vehicle animations
      setVehicles((prevVehicles) =>
        prevVehicles.map((v) => {
          if (v.status === 'EN_ROUTE' && v.targetX !== undefined && v.targetY !== undefined) {
            const dx = v.targetX - v.x;
            const dy = v.targetY - v.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 4) {
              return { ...v, x: v.targetX, y: v.targetY, status: 'SERVICING' };
            }
            return {
              ...v,
              x: v.x + (dx / dist) * 1.2,
              y: v.y + (dy / dist) * 1.2,
              headingDeg: Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 90),
            };
          } else if (v.status === 'RETURNING') {
            const dx = v.depotX - v.x;
            const dy = v.depotY - v.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 4) {
              return { ...v, x: v.depotX, y: v.depotY, status: 'IDLE' };
            }
            return {
              ...v,
              x: v.x + (dx / dist) * 1.2,
              y: v.y + (dy / dist) * 1.2,
              headingDeg: Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 90),
            };
          }
          return v;
        })
      );
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, simSpeed, gates, runways]);

  return (
    <AirportContext.Provider
      value={{
        simTimeMinutes,
        simTimeFormatted,
        isPlaying,
        simSpeed,
        togglePlay,
        setSimSpeed,
        stepSimulation,
        resetSimulation,
        flights,
        gates,
        runways,
        vehicles,
        weather,
        disruptions,
        conflicts,
        kpis,
        selectedFlightId,
        selectedGateId,
        selectedRunwayId,
        setSelectedFlightId,
        setSelectedGateId,
        setSelectedRunwayId,
        reassignGate,
        updateFlightDelay,
        rerouteRunway,
        divertFlight,
        toggleDisruption,
        updateWeather,
        toggleRunwayOpen,
        executeResolution,
        dispatchVehicle,
        addNewCustomScenario,
        isAudioMuted,
        setIsAudioMuted,
      }}
    >
      {children}
    </AirportContext.Provider>
  );
};

export const useAirport = () => {
  const context = useContext(AirportContext);
  if (!context) {
    throw new Error('useAirport must be used within an AirportProvider');
  }
  return context;
};
