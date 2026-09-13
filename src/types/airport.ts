export type IcaoAircraftCode = 'C' | 'D' | 'E' | 'F';

export interface AircraftModel {
  icaoType: string;
  name: string;
  code: IcaoAircraftCode;
  wingspanM: number;
  lengthM: number;
  wakeCategory: 'LIGHT' | 'MEDIUM' | 'HEAVY' | 'SUPER';
  minTurnaroundMinutes: number; // ICAO / IATA MTT
  cruiseSpeedKts: number;
  approachSpeedKts: number;
  taxiSpeedKts: number;
}

export type FlightStatus =
  | 'SCHEDULED'
  | 'EN_ROUTE'
  | 'FINAL_APPROACH'
  | 'LANDED'
  | 'TAXIING_IN'
  | 'AT_GATE'
  | 'TURNAROUND'
  | 'BOARDING'
  | 'PUSHBACK'
  | 'TAXIING_OUT'
  | 'HOLDING_SHORT'
  | 'TAKEOFF_ROLL'
  | 'DEPARTED'
  | 'HOLDING_AIR'
  | 'DIVERTED'
  | 'CANCELLED';

export interface TurnaroundMilestone {
  id: string;
  name: string;
  durationMinutes: number;
  progressPercent: number; // 0 - 100
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  assignedVehicleType?: 'REFUELER' | 'BAGGAGE_TUG' | 'CATERING' | 'PUSHBACK_TUG';
}

export interface Flight {
  id: string;
  flightNumber: string;
  callsign: string;
  airline: string;
  airlineCode: string;
  airlineColor: string;
  aircraftType: string;
  aircraftCode: IcaoAircraftCode;
  wakeCategory: 'LIGHT' | 'MEDIUM' | 'HEAVY' | 'SUPER';
  isArrival: boolean;
  origin: string;
  originName: string;
  destination: string;
  destinationName: string;
  scheduledTime: number; // minutes from midnight or timestamp
  estimatedTime: number;
  actualTime?: number;
  gateId: string | null;
  assignedRunway: string;
  status: FlightStatus;
  passengers: number;
  fuelRemainingKg: number;
  delayMinutes: number;
  delayReason?: string;
  // Live spatial state
  x: number; // map coordinates (0 - 1000 scale)
  y: number;
  altitudeFt: number;
  speedKts: number;
  headingDeg: number;
  targetX?: number;
  targetY?: number;
  activePathIndex?: number;
  turnaroundMilestones: TurnaroundMilestone[];
  isEmergency?: boolean;
  emergencyType?: 'MEDICAL' | 'HYDRAULIC' | 'LOW_FUEL' | 'BIRD_STRIKE';
}

export interface Gate {
  id: string;
  name: string;
  concourse: 'A' | 'B' | 'C' | 'REMOTE';
  maxAircraftCode: IcaoAircraftCode;
  x: number;
  y: number;
  headingDeg: number;
  occupiedByFlightId: string | null;
  hasJetbridge: boolean;
  bufferMinutes: number; // clearance time required between planes (default 15m)
  isClosed?: boolean;
  closureReason?: string;
}

export interface Runway {
  id: string;
  designator: string; // e.g., "09L/27R"
  activeDesignator: string; // e.g., "09L"
  lengthMeters: number;
  widthMeters: number;
  ilsCat: 'CAT I' | 'CAT II' | 'CAT IIIb';
  maxAircraftCode: IcaoAircraftCode;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  headingDeg: number;
  isOpen: boolean;
  closureReason?: string;
  frictionCoefficient: number; // 0.20 (poor) to 0.60 (good)
  surfaceCondition: 'DRY' | 'WET' | 'CONTAMINATED' | 'FROZEN';
  occupyingFlightId?: string | null;
}

export interface TaxiwayNode {
  id: string;
  name: string;
  x: number;
  y: number;
  type: 'INTERSECTION' | 'RUNWAY_HOLD' | 'GATE_LEAD_IN' | 'APRON_LANE' | 'RUNWAY_EXIT';
  runwayId?: string;
}

export interface GroundVehicle {
  id: string;
  callsign: string;
  type: 'REFUELER' | 'BAGGAGE_TUG' | 'CATERING' | 'PUSHBACK_TUG' | 'FOLLOW_ME' | 'ARFF_RESCUE';
  assignedFlightId?: string | null;
  assignedGateId?: string | null;
  status: 'IDLE' | 'EN_ROUTE' | 'SERVICING' | 'RETURNING' | 'EMERGENCY_DISPATCH';
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  headingDeg: number;
  depotX: number;
  depotY: number;
  speedKts: number;
}

export type ConflictSeverity = 'CRITICAL' | 'MAJOR' | 'WARNING';

export type ConflictType =
  | 'SIZE_MISMATCH'
  | 'TURNAROUND_VIOLATION'
  | 'SCHEDULE_OVERLAP'
  | 'RUNWAY_CLOSED_ROUTING'
  | 'WAKE_TURBULENCE_SPACING'
  | 'FUEL_CRITICAL'
  | 'GATE_CLOSED';

export interface OperationalConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  title: string;
  description: string;
  flightId: string;
  conflictingFlightId?: string;
  gateId?: string;
  runwayId?: string;
  recommendedResolutions: {
    id: string;
    label: string;
    description: string;
    actionType: 'REASSIGN_GATE' | 'RESCHEDULE_DELAY' | 'REROUTE_RUNWAY' | 'EXPEDITE_TURNAROUND' | 'DIVERT_FLIGHT';
    targetValue?: string | number;
  }[];
}

export interface WeatherState {
  rawMetar: string;
  windHeadingDeg: number;
  windSpeedKts: number;
  windGustKts: number;
  visibilityKm: number;
  cloudBaseFt: number;
  temperatureC: number;
  dewPointC: number;
  qnhHpa: number;
  condition: 'VMC' | 'IMC' | 'LVP_ACTIVE' | 'THUNDERSTORM';
  rainIntensity: 'NONE' | 'LIGHT' | 'MODERATE' | 'HEAVY';
}

export interface OperationalDisruption {
  id: string;
  name: string;
  type: 'RUNWAY_CLOSURE' | 'WEATHER_CELL' | 'GROUND_STRIKE' | 'MEDICAL_EMERGENCY' | 'BIRD_STRIKE' | 'GATE_MAINTENANCE';
  active: boolean;
  affectedRunwayId?: string;
  affectedGateId?: string;
  affectedFlightId?: string;
  impactSummary: string;
}

export interface AirportKpi {
  onTimePerformancePercent: number;
  averageDelayMinutes: number;
  runwayCapacityPerHour: number;
  activeMovementsCount: number;
  gateOccupancyPercent: number;
  criticalConflictsCount: number;
  safetyIndexScore: number;
}
