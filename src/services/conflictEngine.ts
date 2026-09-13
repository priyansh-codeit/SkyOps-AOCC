import { Flight, Gate, Runway, OperationalConflict, IcaoAircraftCode } from '../types/airport';

const CODE_RANK: Record<IcaoAircraftCode, number> = {
  C: 1,
  D: 2,
  E: 3,
  F: 4,
};

export const MIN_TURNAROUND_TIMES: Record<IcaoAircraftCode, number> = {
  C: 35,
  D: 45,
  E: 60,
  F: 90,
};

export function canAircraftFitGate(aircraftCode: IcaoAircraftCode, gateMaxCode: IcaoAircraftCode): boolean {
  return CODE_RANK[aircraftCode] <= CODE_RANK[gateMaxCode];
}

export function detectConflicts(
  flights: Flight[],
  gates: Gate[],
  runways: Runway[]
): OperationalConflict[] {
  const conflicts: OperationalConflict[] = [];
  const gateMap = new Map<string, Gate>(gates.map((g) => [g.id, g]));
  const runwayMap = new Map<string, Runway>(runways.map((r) => [r.id, r]));

  // 1. Gate Size Mismatch check
  for (const flight of flights) {
    if (flight.gateId) {
      const gate = gateMap.get(flight.gateId);
      if (gate) {
        if (!canAircraftFitGate(flight.aircraftCode, gate.maxAircraftCode)) {
          // Find alternative compatible gates
          const compatibleGates = gates.filter(
            (g) =>
              canAircraftFitGate(flight.aircraftCode, g.maxAircraftCode) &&
              !g.isClosed &&
              g.id !== gate.id
          );

          conflicts.push({
            id: `conf-size-${flight.id}-${gate.id}`,
            type: 'SIZE_MISMATCH',
            severity: 'CRITICAL',
            title: `ICAO Size Mismatch: ${flight.flightNumber} at Gate ${gate.name}`,
            description: `Aircraft ${flight.aircraftType} (Code ${flight.aircraftCode}) exceeds Gate ${gate.name} physical capacity (Max Code ${gate.maxAircraftCode}). Risk of wingtip collision with adjacent taxi lane.`,
            flightId: flight.id,
            gateId: gate.id,
            recommendedResolutions: compatibleGates.slice(0, 3).map((g) => ({
              id: `res-reassign-${g.id}`,
              label: `Reassign to Gate ${g.name} (Code ${g.maxAircraftCode})`,
              description: `Concourse ${g.concourse} has sufficient wing clearance and jetbridge compatibility.`,
              actionType: 'REASSIGN_GATE',
              targetValue: g.id,
            })),
          });
        }

        if (gate.isClosed) {
          const alternativeGates = gates.filter(
            (g) =>
              canAircraftFitGate(flight.aircraftCode, g.maxAircraftCode) &&
              !g.isClosed &&
              g.id !== gate.id
          );

          conflicts.push({
            id: `conf-gateclosed-${flight.id}-${gate.id}`,
            type: 'GATE_CLOSED',
            severity: 'CRITICAL',
            title: `Assigned Gate ${gate.name} is Closed`,
            description: `Gate ${gate.name} is currently out of service (${gate.closureReason || 'Maintenance'}). Aircraft must be rerouted.`,
            flightId: flight.id,
            gateId: gate.id,
            recommendedResolutions: alternativeGates.slice(0, 2).map((g) => ({
              id: `res-alt-gate-${g.id}`,
              label: `Reroute to ${g.name}`,
              description: `Concourse ${g.concourse} ready to accept aircraft.`,
              actionType: 'REASSIGN_GATE',
              targetValue: g.id,
            })),
          });
        }
      }
    }
  }

  // 2. Gate Schedule Overlap & Turnaround Violations (Two flights assigned to same gate)
  const flightsByGate = new Map<string, Flight[]>();
  for (const flight of flights) {
    if (flight.gateId && flight.status !== 'DEPARTED' && flight.status !== 'CANCELLED' && flight.status !== 'DIVERTED') {
      const list = flightsByGate.get(flight.gateId) || [];
      list.push(flight);
      flightsByGate.set(flight.gateId, list);
    }
  }

  flightsByGate.forEach((gateFlights, gateId) => {
    const gate = gateMap.get(gateId);
    if (!gate || gateFlights.length <= 1) return;

    // Check overlaps between flights
    for (let i = 0; i < gateFlights.length; i++) {
      for (let j = i + 1; j < gateFlights.length; j++) {
        const f1 = gateFlights[i];
        const f2 = gateFlights[j];

        const mtt1 = MIN_TURNAROUND_TIMES[f1.aircraftCode];
        const mtt2 = MIN_TURNAROUND_TIMES[f2.aircraftCode];
        const buffer = gate.bufferMinutes;

        // Approximate occupancy windows
        const start1 = f1.estimatedTime;
        const end1 = start1 + mtt1;
        const start2 = f2.estimatedTime;
        const end2 = start2 + mtt2;

        const isOverlapping = Math.max(start1, start2) < Math.min(end1, end2) + buffer;

        if (isOverlapping) {
          const laterFlight = f1.estimatedTime >= f2.estimatedTime ? f1 : f2;
          const earlierFlight = laterFlight === f1 ? f2 : f1;

          const compatibleGates = gates.filter(
            (g) =>
              canAircraftFitGate(laterFlight.aircraftCode, g.maxAircraftCode) &&
              !g.isClosed &&
              g.id !== gate.id
          );

          conflicts.push({
            id: `conf-overlap-${gateId}-${f1.id}-${f2.id}`,
            type: 'SCHEDULE_OVERLAP',
            severity: 'CRITICAL',
            title: `Gate Overlap at ${gate.name}: ${f1.flightNumber} vs ${f2.flightNumber}`,
            description: `${f1.flightNumber} and ${f2.flightNumber} require Gate ${gate.name} with less than the mandatory ${buffer}m separation. Minimum turnaround violation.`,
            flightId: laterFlight.id,
            conflictingFlightId: earlierFlight.id,
            gateId: gate.id,
            recommendedResolutions: [
              ...compatibleGates.slice(0, 2).map((g) => ({
                id: `res-overlap-reassign-${g.id}`,
                label: `Reassign ${laterFlight.flightNumber} to Gate ${g.name}`,
                description: `Immediate slot availability with proper ICAO clearance.`,
                actionType: 'REASSIGN_GATE' as const,
                targetValue: g.id,
              })),
              {
                id: `res-overlap-delay-${laterFlight.id}`,
                label: `Delay ${laterFlight.flightNumber} Arrival (+25m)`,
                description: `Adjust arrival slot to clear gate after ${earlierFlight.flightNumber} departs.`,
                actionType: 'RESCHEDULE_DELAY' as const,
                targetValue: 25,
              },
            ],
          });
        }
      }
    }
  });

  // 3. Runway Closure Conflict
  for (const flight of flights) {
    if (
      flight.status !== 'DEPARTED' &&
      flight.status !== 'CANCELLED' &&
      flight.status !== 'DIVERTED' &&
      ['EN_ROUTE', 'FINAL_APPROACH', 'TAXIING_OUT', 'HOLDING_SHORT', 'TAKEOFF_ROLL'].includes(flight.status)
    ) {
      const runway = runwayMap.get(flight.assignedRunway);
      if (runway && !runway.isOpen) {
        // Find alternative open runway
        const openRunway = runways.find(
          (r) => r.isOpen && canAircraftFitGate(flight.aircraftCode, r.maxAircraftCode) && r.id !== runway.id
        );

        conflicts.push({
          id: `conf-rwyclosed-${flight.id}-${runway.id}`,
          type: 'RUNWAY_CLOSED_ROUTING',
          severity: 'CRITICAL',
          title: `Runway Closed: ${flight.flightNumber} assigned to ${runway.designator}`,
          description: `${runway.designator} is closed (${runway.closureReason || 'Incident/FOD'}). Aircraft must be rerouted or held.`,
          flightId: flight.id,
          runwayId: runway.id,
          recommendedResolutions: openRunway
            ? [
                {
                  id: `res-rwy-reroute-${openRunway.id}`,
                  label: `Reroute to ${openRunway.designator}`,
                  description: `Active runway with CAT ${openRunway.ilsCat} approach capability.`,
                  actionType: 'REROUTE_RUNWAY',
                  targetValue: openRunway.id,
                },
                {
                  id: `res-rwy-hold-${flight.id}`,
                  label: `Hold Flight (+15m)`,
                  description: `Issue holding pattern instructions pending runway reopening.`,
                  actionType: 'RESCHEDULE_DELAY',
                  targetValue: 15,
                },
              ]
            : [
                {
                  id: `res-rwy-divert-${flight.id}`,
                  label: `Divert to Alternate (OAK / SJC)`,
                  description: `No active runways capable of supporting Code ${flight.aircraftCode}.`,
                  actionType: 'DIVERT_FLIGHT',
                },
              ],
        });
      }
    }
  }

  return conflicts;
}
