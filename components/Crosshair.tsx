
import React from 'react';
import { GameStatus } from '../types';

interface CrosshairProps {
  status: GameStatus;
  isPerfect: boolean;
}

const Crosshair: React.FC<CrosshairProps> = ({ status, isPerfect }) => {
  // Calculate gap based on status
  let gapSize = 'gap-2';
  let color = 'bg-emerald-400';
  let opacity = 'opacity-100';
  let scale = 'scale-100';

  if (status === 'HOLDING') {
    gapSize = 'gap-12';
    color = 'bg-white';
    opacity = 'opacity-50';
  } else if (status === 'COUNTERING' || status === 'TAPPING') {
    gapSize = 'gap-6';
    color = 'bg-red-500';
    scale = 'scale-110';
  } else if (status === 'COOLDOWN') {
    gapSize = 'gap-1';
    color = isPerfect ? 'bg-cyan-400' : 'bg-emerald-400';
    scale = 'scale-90';
  } else if (status === 'IDLE') {
    gapSize = 'gap-4';
    color = 'bg-slate-700';
    opacity = 'opacity-20';
  }

  return (
    <div className="relative flex items-center justify-center transition-all duration-150">
      {/* Target Marker for Perfect Hits */}
      {status === 'COOLDOWN' && isPerfect && (
        <div className="absolute animate-ping">
          <div className="w-16 h-16 border-2 border-cyan-400 rounded-full"></div>
        </div>
      )}
      
      {/* Crosshair Lines */}
      <div className={`flex flex-col items-center ${gapSize} transition-all duration-150 ${scale} ${opacity}`}>
        <div className={`w-[2px] h-3 ${color} rounded-full`}></div>
        <div className="flex items-center gap-inherit transition-all duration-150" style={{ gap: 'inherit' }}>
          <div className={`h-[2px] w-3 ${color} rounded-full`}></div>
          {/* Dot */}
          <div className={`w-1 h-1 rounded-full ${color}`}></div>
          <div className={`h-[2px] w-3 ${color} rounded-full`}></div>
        </div>
        <div className={`w-[2px] h-3 ${color} rounded-full`}></div>
      </div>

      {/* Hit Effect */}
      {status === 'COOLDOWN' && isPerfect && (
        <div className="absolute -top-12 animate-bounce flex flex-col items-center">
          <div className="bg-cyan-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded italic uppercase shadow-lg shadow-cyan-500/50">
            完美急停！
          </div>
          <div className="w-0.5 h-4 bg-cyan-500"></div>
        </div>
      )}
    </div>
  );
};

export default Crosshair;
