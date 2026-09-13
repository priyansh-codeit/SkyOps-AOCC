import React, { useState } from 'react';
import {
  Wind,
  Compass,
  Thermometer,
  CloudRain,
  Eye,
  Activity,
  Truck,
  Fuel,
  Luggage,
  Coffee,
  ShieldAlert,
  Send,
  CheckCircle2,
  RefreshCw,
  Gauge,
  Sliders,
} from 'lucide-react';
import { useAirport } from '../../context/AirportContext';
import { GroundVehicle, Flight } from '../../types/airport';

export const GroundWeatherPanel: React.FC = () => {
  const {
    weather,
    updateWeather,
    vehicles,
    dispatchVehicle,
    flights,
    gates,
    runways,
  } = useAirport();

  // Selected vehicle for manual dispatch
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [targetFlightId, setTargetFlightId] = useState<string>(flights[0]?.id || '');

  // Crosswind & Headwind calculations for RWY 09L / 27R (Heading 090° / 270°)
  const windAngleRad = ((weather.windHeadingDeg - 270) * Math.PI) / 180;
  const headwindKts = Math.round(weather.windSpeedKts * Math.cos(windAngleRad));
  const crosswindKts = Math.round(Math.abs(weather.windSpeedKts * Math.sin(windAngleRad)));

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId || !targetFlightId) return;
    dispatchVehicle(selectedVehicleId, targetFlightId);
  };

  const getVehicleIcon = (type: GroundVehicle['type']) => {
    switch (type) {
      case 'PUSHBACK_TUG':
        return <Truck className="w-4 h-4 text-emerald-400" />;
      case 'REFUELER':
        return <Fuel className="w-4 h-4 text-sky-400" />;
      case 'BAGGAGE_TUG':
        return <Luggage className="w-4 h-4 text-amber-400" />;
      case 'CATERING':
        return <Coffee className="w-4 h-4 text-purple-400" />;
      case 'ARFF_RESCUE':
        return <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />;
      case 'FOLLOW_ME':
        return <Activity className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0e17] text-slate-100 font-mono-hud select-none overflow-y-auto p-4 space-y-6">
      {/* SECTION 1: LIVE METAR & WEATHER OVERLAY */}
      <div className="bg-[#0f1420] border border-[#1c2638] rounded-xl p-4 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1c2638]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#162032] border border-[#23354f] rounded-lg text-sky-400">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider">AERODROME METEOROLOGICAL STATION (METAR)</h2>
              <span className="text-[10px] text-slate-400">Live KSFO Weather Sensor Telemetry & Runway Braking Action</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded text-xs font-bold border ${
                weather.condition === 'VMC'
                  ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                  : weather.condition === 'LVP_ACTIVE'
                  ? 'bg-amber-950/60 border-amber-600/60 text-amber-300 animate-pulse'
                  : 'bg-rose-950/60 border-rose-700/60 text-rose-300'
              }`}
            >
              {weather.condition === 'VMC' ? 'VMC · VISUAL APPROACHES' : 'LVP ACTIVE · CAT III ILS'}
            </span>
          </div>
        </div>

        {/* Raw METAR String Box */}
        <div className="p-3 bg-[#090d15] rounded-lg border border-[#1c2638] font-mono text-xs text-sky-300 flex items-center justify-between">
          <div className="tracking-widest overflow-x-auto">{weather.rawMetar}</div>
          <span className="text-[10px] text-slate-500 uppercase shrink-0 ml-2">ICAO METAR</span>
        </div>

        {/* Weather Readings Grid & Wind Rose */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          {/* Interactive Wind Rose Compass */}
          <div className="bg-[#090d15] p-3 rounded-lg border border-[#1c2638] flex flex-col items-center text-center">
            <div className="text-[10px] text-slate-400 uppercase font-bold mb-2">Wind Rose & Direction</div>
            <div className="relative w-28 h-28 rounded-full border border-[#222f46] flex items-center justify-center">
              <div className="absolute text-[8px] top-1 text-slate-400 font-bold">N</div>
              <div className="absolute text-[8px] right-1.5 text-slate-400 font-bold">E</div>
              <div className="absolute text-[8px] bottom-1 text-slate-400 font-bold">S</div>
              <div className="absolute text-[8px] left-1.5 text-slate-400 font-bold">W</div>

              {/* Needle pointing in wind direction */}
              <div
                className="w-1.5 h-20 bg-gradient-to-t from-transparent via-sky-400 to-rose-500 rounded transition-transform duration-500"
                style={{ transform: `rotate(${weather.windHeadingDeg}deg)` }}
              />
              <div className="w-3 h-3 rounded-full bg-sky-400 absolute" />
            </div>

            <div className="mt-2 text-xs font-bold text-white">
              {weather.windHeadingDeg}° at {weather.windSpeedKts} kts
            </div>
            <div className="text-[10px] text-amber-400">Gusts: {weather.windGustKts} kts</div>
          </div>

          {/* Runway 28/09 Wind Decomposition */}
          <div className="bg-[#090d15] p-3 rounded-lg border border-[#1c2638] space-y-2">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Runway 27R Components</div>
            <div className="flex justify-between items-center py-1 border-b border-[#141b27] text-xs">
              <span className="text-slate-400">Headwind:</span>
              <span className="font-bold text-emerald-400">{headwindKts} kts</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#141b27] text-xs">
              <span className="text-slate-400">Crosswind:</span>
              <span className="font-bold text-amber-400">{crosswindKts} kts</span>
            </div>
            <div className="flex justify-between items-center py-1 text-xs">
              <span className="text-slate-400">Max Demonst. Cross:</span>
              <span className="font-bold text-slate-300">33 kts</span>
            </div>
          </div>

          {/* Visibility & Altimeter */}
          <div className="bg-[#090d15] p-3 rounded-lg border border-[#1c2638] space-y-2">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Atmospheric & RVR</div>
            <div className="flex justify-between items-center py-1 border-b border-[#141b27] text-xs">
              <span className="text-slate-400">Visibility (RVR):</span>
              <span className="font-bold text-sky-300">{weather.visibilityKm} km (10+ SM)</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#141b27] text-xs">
              <span className="text-slate-400">Cloud Ceiling:</span>
              <span className="font-bold text-slate-200">{weather.cloudBaseFt} ft BKN</span>
            </div>
            <div className="flex justify-between items-center py-1 text-xs">
              <span className="text-slate-400">Baro QNH:</span>
              <span className="font-bold text-emerald-400">{weather.qnhHpa} hPa (29.94)</span>
            </div>
          </div>

          {/* Temperature & Braking Action */}
          <div className="bg-[#090d15] p-3 rounded-lg border border-[#1c2638] space-y-2">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Surface & Friction</div>
            <div className="flex justify-between items-center py-1 border-b border-[#141b27] text-xs">
              <span className="text-slate-400">OAT / Dewpoint:</span>
              <span className="font-bold text-white">{weather.temperatureC}°C / {weather.dewPointC}°C</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#141b27] text-xs">
              <span className="text-slate-400">Runway Friction (μ):</span>
              <span className="font-bold text-emerald-400">0.55 (GOOD)</span>
            </div>
            <div className="flex justify-between items-center py-1 text-xs">
              <span className="text-slate-400">Precipitation:</span>
              <span className="font-bold text-slate-300">{weather.rainIntensity}</span>
            </div>
          </div>
        </div>

        {/* Interactive Weather Controller Sliders */}
        <div className="p-3 bg-[#090d15] rounded-lg border border-[#1c2638] space-y-2">
          <div className="text-[10px] uppercase text-slate-400 font-bold flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>Interactive Weather Simulation Controls</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Wind Direction:</span>
                <span className="font-bold text-sky-300">{weather.windHeadingDeg}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="10"
                value={weather.windHeadingDeg}
                onChange={(e) => updateWeather({ windHeadingDeg: Number(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Wind Speed:</span>
                <span className="font-bold text-sky-300">{weather.windSpeedKts} kts</span>
              </div>
              <input
                type="range"
                min="0"
                max="45"
                step="1"
                value={weather.windSpeedKts}
                onChange={(e) => updateWeather({ windSpeedKts: Number(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Visibility:</span>
                <span className="font-bold text-sky-300">{weather.visibilityKm} km</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="20"
                step="0.5"
                value={weather.visibilityKm}
                onChange={(e) => updateWeather({ visibilityKm: Number(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: GROUND SERVICE EQUIPMENT (GSE) FLEET */}
      <div className="bg-[#0f1420] border border-[#1c2638] rounded-xl p-4 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1c2638]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#162032] border border-[#23354f] rounded-lg text-amber-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wider">GROUND SUPPORT EQUIPMENT (GSE) FLEET</h2>
              <span className="text-[10px] text-slate-400">Fuel Hydrant, Baggage Tug, Catering, and ARFF Crash Tender Dispatch</span>
            </div>
          </div>

          {/* Quick Dispatch Form */}
          <form onSubmit={handleDispatch} className="flex items-center gap-2">
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="bg-[#090d15] border border-[#1c2638] rounded px-2.5 py-1 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.callsign} ({v.type}) · {v.status}
                </option>
              ))}
            </select>

            <select
              value={targetFlightId}
              onChange={(e) => setTargetFlightId(e.target.value)}
              className="bg-[#090d15] border border-[#1c2638] rounded px-2.5 py-1 text-xs text-slate-200 focus:border-sky-500 focus:outline-none"
            >
              {flights
                .filter((f) => f.gateId !== null)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.flightNumber} ({f.airline} - Gate {f.gateId})
                  </option>
                ))}
            </select>

            <button
              type="submit"
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded text-xs transition flex items-center gap-1 shadow"
            >
              <Send className="w-3.5 h-3.5" />
              Dispatch
            </button>
          </form>
        </div>

        {/* Vehicles Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {vehicles.map((vehicle) => {
            const assignedFlight = flights.find((f) => f.id === vehicle.assignedFlightId);

            return (
              <div
                key={vehicle.id}
                className="p-3 bg-[#090d15] rounded-lg border border-[#1c2638] flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[#162032] border border-[#23354f] rounded-lg">
                    {getVehicleIcon(vehicle.type)}
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{vehicle.callsign}</span>
                      <span className="text-[9px] px-1 py-0.2 bg-[#162032] text-slate-300 rounded border border-[#23354f]">
                        {vehicle.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {vehicle.status === 'SERVICING' && assignedFlight
                        ? `Servicing ${assignedFlight.flightNumber} at Gate ${vehicle.assignedGateId}`
                        : vehicle.status === 'EN_ROUTE'
                        ? `En route to Gate ${vehicle.assignedGateId}`
                        : 'Parked at GSE Motor Pool Depot'}
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                    vehicle.status === 'SERVICING'
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                      : vehicle.status === 'EN_ROUTE'
                      ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60 animate-pulse'
                      : vehicle.status === 'EMERGENCY_DISPATCH'
                      ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60 animate-bounce'
                      : 'bg-[#162032] text-slate-400 border border-[#23354f]'
                  }`}
                >
                  {vehicle.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
