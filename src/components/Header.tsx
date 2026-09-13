import React from 'react';
import {
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Volume2,
  VolumeX,
  AlertTriangle,
  Plane,
  ShieldCheck,
  Clock,
  Radio,
  SlidersHorizontal,
  CloudSun,
  LayoutDashboard,
  CalendarDays,
  Truck,
  Flame,
} from 'lucide-react';
import { useAirport } from '../context/AirportContext';
import { setAudioEnabled } from '../services/soundEffects';

export type ActiveTab = 'MAP' | 'BOARD' | 'GATES' | 'DISRUPTIONS' | 'GROUND_WEATHER';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenConflictsModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenConflictsModal,
}) => {
  const {
    simTimeFormatted,
    isPlaying,
    simSpeed,
    togglePlay,
    setSimSpeed,
    stepSimulation,
    resetSimulation,
    kpis,
    conflicts,
    disruptions,
    isAudioMuted,
    setIsAudioMuted,
  } = useAirport();

  const handleAudioToggle = () => {
    const next = !isAudioMuted;
    setIsAudioMuted(next);
    setAudioEnabled(!next);
  };

  const activeDisruptionsCount = disruptions.filter((d) => d.active).length;
  const criticalConflicts = conflicts.filter((c) => c.severity === 'CRITICAL');

  return (
    <header className="bg-[#0d1220] border-b border-[#1c2638] text-white select-none shrink-0 z-30 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      {/* Top Bar: Delineated Mission Control Zones */}
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Zone 1: Airport & Facility Identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/40 flex items-center justify-center text-[#3b82f6] shadow-sm">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tracking-tight text-sm text-white font-sans">SkyOps AOCC</span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono-hud font-semibold bg-[#111726] text-[#3b82f6] border border-[#1e2c44] rounded">
                  KSFO / OPS-C2
                </span>
              </div>
              <p className="text-[11px] text-[#94a3b8] flex items-center gap-1.5 font-normal font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" />
                Airside Operations Control Center
              </p>
            </div>
          </div>
        </div>

        {/* Zone 2: Master Simulation Clock & Speed/Playback Zone */}
        <div className="flex items-center gap-2 bg-[#090d16] border border-[#1c2638] px-2.5 py-1.5 rounded-lg shadow-inner">
          <div className="flex items-center gap-2 pr-2.5 border-r border-[#1c2638]">
            <Clock className="w-3.5 h-3.5 text-[#3b82f6]" />
            <div>
              <div className="text-[9px] uppercase tracking-wider text-[#94a3b8] font-normal leading-none font-sans">UTC Sim Clock</div>
              <div className="text-sm font-mono-hud font-semibold text-[#3b82f6] tracking-wider leading-tight">{simTimeFormatted}</div>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-1 pl-1">
            <button
              id="sim-play-pause-btn"
              onClick={togglePlay}
              title={isPlaying ? 'Pause Simulation' : 'Resume Simulation'}
              className={`p-1.5 rounded transition ${
                isPlaying
                  ? 'bg-[#d4a94a]/20 text-[#d4a94a] hover:bg-[#d4a94a]/30'
                  : 'bg-[#22c55e]/20 text-[#22c55e] hover:bg-[#22c55e]/30'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <button
              id="sim-step-btn"
              onClick={() => stepSimulation(1)}
              title="Step +1 minute"
              className="px-2 py-1 text-xs font-mono-hud font-normal text-slate-200 hover:text-white hover:bg-[#162032] rounded transition"
            >
              +1m
            </button>

            <div className="flex items-center gap-0.5 border-l border-[#1c2638] pl-1.5 ml-1">
              {[1, 2, 5, 10, 30].map((speed) => (
                <button
                  key={speed}
                  id={`speed-btn-${speed}x`}
                  onClick={() => setSimSpeed(speed)}
                  className={`px-1.5 py-0.5 text-[11px] font-mono-hud font-semibold rounded transition ${
                    simSpeed === speed
                      ? 'bg-[#3b82f6] text-white shadow-sm'
                      : 'text-[#94a3b8] hover:text-white hover:bg-[#162032]'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            <button
              id="sim-reset-btn"
              onClick={resetSimulation}
              title="Reset Simulation to 08:30 UTC"
              className="p-1.5 text-[#94a3b8] hover:text-white hover:bg-[#162032] rounded transition ml-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Zone 3: Alert & Contingency Status */}
        <div className="flex items-center gap-2.5">
          {conflicts.length > 0 ? (
            <button
              id="conflicts-alert-badge"
              onClick={onOpenConflictsModal}
              className="px-2.5 py-1.5 rounded-lg flex items-center gap-2 border text-xs font-semibold font-sans bg-[#e0555a]/15 border-[#e0555a]/70 text-[#fca5a5] hover:bg-[#e0555a]/25 transition"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[#e0555a]" />
              <span>{conflicts.length} CRITICAL CONFLICT{conflicts.length > 1 ? 'S' : ''}</span>
              <span className="bg-[#e0555a] text-white text-[10px] px-1.5 py-0.2 rounded font-semibold">
                Resolve
              </span>
            </button>
          ) : (
            <div className="px-2.5 py-1.5 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/40 text-[#4ade80] text-xs font-semibold font-sans flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#22c55e]" />
              <span>ICAO NOMINAL &middot; NO CONFLICTS</span>
            </div>
          )}

          {activeDisruptionsCount > 0 && (
            <button
              id="active-disruption-badge"
              onClick={() => setActiveTab('DISRUPTIONS')}
              className="px-2.5 py-1.5 rounded-lg bg-[#d4a94a]/15 border border-[#d4a94a]/60 text-[#fde68a] text-xs font-semibold font-sans flex items-center gap-1.5 hover:bg-[#d4a94a]/25 transition"
            >
              <Flame className="w-3.5 h-3.5 text-[#d4a94a]" />
              <span>{activeDisruptionsCount} ACTIVE DISRUPTION{activeDisruptionsCount > 1 ? 'S' : ''}</span>
            </button>
          )}

          {/* Zone 4: Telemetry KPI Badges */}
          <div className="hidden xl:flex items-center gap-2 text-xs">
            <div className="bg-[#090d16] border border-[#1c2638] px-2.5 py-1 rounded-lg">
              <span className="text-[#64748b] text-[9px] block uppercase font-normal font-sans">OTP Rate</span>
              <span className={`font-mono-hud font-semibold ${kpis.onTimePerformancePercent >= 85 ? 'text-[#22c55e]' : 'text-[#d4a94a]'}`}>
                {kpis.onTimePerformancePercent}%
              </span>
            </div>

            <div className="bg-[#090d16] border border-[#1c2638] px-2.5 py-1 rounded-lg">
              <span className="text-[#64748b] text-[9px] block uppercase font-normal font-sans">Avg Delay</span>
              <span className={`font-mono-hud font-semibold ${kpis.averageDelayMinutes > 15 ? 'text-[#e0555a]' : 'text-slate-200'}`}>
                +{kpis.averageDelayMinutes}m
              </span>
            </div>

            <div className="bg-[#090d16] border border-[#1c2638] px-2.5 py-1 rounded-lg">
              <span className="text-[#64748b] text-[9px] block uppercase font-normal font-sans">Gate Load</span>
              <span className="font-mono-hud font-semibold text-[#3b82f6]">{kpis.gateOccupancyPercent}%</span>
            </div>
          </div>

          {/* Audio ATC Mute Toggle */}
          <button
            id="audio-toggle-btn"
            onClick={handleAudioToggle}
            title={isAudioMuted ? 'Unmute ATC Acoustic Alerts' : 'Mute ATC Acoustic Alerts'}
            className="p-2 rounded-lg border border-[#1c2638] bg-[#090d16] text-[#94a3b8] hover:text-white hover:bg-[#162032] transition"
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5 text-[#e0555a]" /> : <Volume2 className="w-3.5 h-3.5 text-[#3b82f6]" />}
          </button>
        </div>
      </div>

      {/* Navigation Sub-bar: Unified Active Tab State (Background fill + Bottom blue accent bar) */}
      <nav className="px-4 bg-[#090d16] border-t border-[#182030] flex items-center justify-between overflow-x-auto gap-2">
        <div className="flex items-center gap-1">
          <button
            id="tab-map"
            onClick={() => setActiveTab('MAP')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold font-sans transition relative ${
              activeTab === 'MAP'
                ? 'bg-[#121827] text-white border-b-2 border-[#3b82f6]'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#0e1422] border-b-2 border-transparent'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>Airside Spatial Radar</span>
          </button>

          <button
            id="tab-board"
            onClick={() => setActiveTab('BOARD')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold font-sans transition relative ${
              activeTab === 'BOARD'
                ? 'bg-[#121827] text-white border-b-2 border-[#3b82f6]'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#0e1422] border-b-2 border-transparent'
            }`}
          >
            <Plane className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>Flight Board</span>
          </button>

          <button
            id="tab-gates"
            onClick={() => setActiveTab('GATES')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold font-sans transition relative ${
              activeTab === 'GATES'
                ? 'bg-[#121827] text-white border-b-2 border-[#3b82f6]'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#0e1422] border-b-2 border-transparent'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>Gate Stand Planner</span>
            {conflicts.some((c) => c.type === 'SIZE_MISMATCH' || c.type === 'SCHEDULE_OVERLAP') && (
              <span className="w-2 h-2 rounded-full bg-[#e0555a] animate-ping ml-1" />
            )}
          </button>

          <button
            id="tab-disruptions"
            onClick={() => setActiveTab('DISRUPTIONS')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold font-sans transition relative ${
              activeTab === 'DISRUPTIONS'
                ? 'bg-[#121827] text-white border-b-2 border-[#3b82f6]'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#0e1422] border-b-2 border-transparent'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-[#d4a94a]" />
            <span>Disruption Simulator</span>
            {activeDisruptionsCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-mono-hud bg-[#d4a94a] text-[#0d1220] rounded font-semibold ml-1">
                {activeDisruptionsCount}
              </span>
            )}
          </button>

          <button
            id="tab-ground-weather"
            onClick={() => setActiveTab('GROUND_WEATHER')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold font-sans transition relative ${
              activeTab === 'GROUND_WEATHER'
                ? 'bg-[#121827] text-white border-b-2 border-[#3b82f6]'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#0e1422] border-b-2 border-transparent'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>Ground Fleet & Weather</span>
          </button>
        </div>

        <div className="text-[11px] text-[#64748b] font-normal font-mono-hud hidden md:flex items-center gap-2">
          <span>ICAO ANNEX 14</span>
          <span>&middot;</span>
          <span>IATA AHM OPS</span>
        </div>
      </nav>
    </header>
  );
};
