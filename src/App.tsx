import React, { useState } from 'react';
import { AirportProvider } from './context/AirportContext';
import { Header, ActiveTab } from './components/Header';
import { SpatialMap } from './components/SpatialMap/SpatialMap';
import { FlightBoard } from './components/FlightBoard/FlightBoard';
import { GateTimeline } from './components/GateManager/GateTimeline';
import { DisruptionPanel } from './components/DisruptionSimulator/DisruptionPanel';
import { GroundWeatherPanel } from './components/GroundWeather/GroundWeatherPanel';
import { ConflictResolutionModal } from './components/ConflictModal/ConflictResolutionModal';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('MAP');
  const [isConflictsModalOpen, setIsConflictsModalOpen] = useState<boolean>(false);

  return (
    <div className="flex flex-col w-screen h-screen bg-[#0a0e17] text-slate-100 overflow-hidden font-mono-hud">
      {/* Top Operations Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenConflictsModal={() => setIsConflictsModalOpen(true)}
      />

      {/* Main Mission Control Workspace */}
      <main className="flex-1 relative overflow-hidden">
        {activeTab === 'MAP' && <SpatialMap />}
        {activeTab === 'BOARD' && (
          <FlightBoard
            onFocusFlightOnMap={() => setActiveTab('MAP')}
            onOpenGatePlanner={() => setActiveTab('GATES')}
          />
        )}
        {activeTab === 'GATES' && <GateTimeline />}
        {activeTab === 'DISRUPTIONS' && <DisruptionPanel />}
        {activeTab === 'GROUND_WEATHER' && <GroundWeatherPanel />}
      </main>

      {/* Central Conflict Resolution Assistant Modal */}
      <ConflictResolutionModal
        isOpen={isConflictsModalOpen}
        onClose={() => setIsConflictsModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AirportProvider>
      <MainLayout />
    </AirportProvider>
  );
}
