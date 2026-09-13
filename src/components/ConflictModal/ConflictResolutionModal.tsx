import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  Zap,
  CheckCircle2,
  ShieldCheck,
  Plane,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useAirport } from '../../context/AirportContext';
import { OperationalConflict } from '../../types/airport';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({ isOpen, onClose }) => {
  const { conflicts, executeResolution, flights, gates } = useAirport();
  const [activeTab, setActiveTab] = useState<'ALL' | 'GATE' | 'RUNWAY'>('ALL');

  if (!isOpen) return null;

  const filteredConflicts = conflicts.filter((c) => {
    if (activeTab === 'GATE') return c.type === 'SIZE_MISMATCH' || c.type === 'SCHEDULE_OVERLAP' || c.type === 'GATE_CLOSED';
    if (activeTab === 'RUNWAY') return c.type === 'RUNWAY_CLOSED_ROUTING' || c.type === 'WAKE_TURBULENCE_SPACING';
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-[#0f1420] border border-[#222f46] rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl font-mono-hud text-xs">
        {/* Header */}
        <div className="p-4 border-b border-[#1c2638] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-600/20 border border-rose-500 rounded-lg text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                ICAO / IATA CONFLICT RESOLUTION CENTER
                <span className="text-[10px] px-2 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-800/80 rounded font-bold">
                  {conflicts.length} Active
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Automated separation, turnaround buffer, and aircraft-to-stand compatibility validation.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="px-4 py-2 bg-[#090d15] border-b border-[#1c2638] flex items-center gap-2">
          <span className="text-[10px] uppercase text-slate-500 font-bold">Scope:</span>
          {(['ALL', 'GATE', 'RUNWAY'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                activeTab === tab
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-[#162032]'
              }`}
            >
              {tab === 'ALL' ? 'All Conflicts' : tab === 'GATE' ? 'Gate Stand Overlaps' : 'Runway Separation'}
            </button>
          ))}
        </div>

        {/* Conflicts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filteredConflicts.length > 0 ? (
            filteredConflicts.map((conflict) => {
              return (
                <div
                  key={conflict.id}
                  className="p-4 bg-[#090d15] rounded-xl border border-rose-900/60 space-y-3 shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{conflict.title}</span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-rose-600 text-white rounded font-bold uppercase">
                          {conflict.severity}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-[#162032] text-slate-300 border border-[#23354f] rounded">
                          {conflict.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                        {conflict.description}
                      </p>
                    </div>
                  </div>

                  {/* Resolution options */}
                  <div className="space-y-1.5 pt-2 border-t border-[#1c2638]">
                    <div className="text-[10px] uppercase text-sky-400 font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3 text-sky-400" />
                      Recommended 1-Click Mitigations:
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {conflict.recommendedResolutions.map((res) => (
                        <button
                          key={res.id}
                          onClick={() => {
                            executeResolution(conflict.id, res.id);
                          }}
                          className="p-2.5 bg-[#0f1420] hover:bg-sky-950/20 border border-[#1c2638] hover:border-sky-500/50 rounded-lg text-left transition group flex flex-col justify-between"
                        >
                          <div>
                            <div className="font-bold text-white group-hover:text-sky-300 text-xs">
                              {res.label}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {res.description}
                            </div>
                          </div>
                          <div className="mt-2 text-right">
                            <span className="px-2 py-0.5 bg-sky-600 group-hover:bg-sky-500 text-white font-semibold rounded text-[10px] inline-block">
                              Apply Fix
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="text-sm font-bold text-white">No Active Operational Conflicts</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                All gate stand allocations, wake separation intervals, and turnaround buffers strictly comply with ICAO Annex 14 standards.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1c2638] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#162032] hover:bg-[#202c40] text-slate-200 border border-[#23354f] rounded text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
