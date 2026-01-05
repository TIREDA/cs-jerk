
import React from 'react';
import { KeyType } from '../types';

interface KeyCapProps {
  label: KeyType;
  isActive: boolean;
  isPrompt?: boolean;
  isTarget?: boolean;
}

const KeyCap: React.FC<KeyCapProps> = ({ label, isActive, isPrompt, isTarget }) => {
  let borderColor = 'border-slate-700';
  let bgColor = 'bg-slate-900';
  let textColor = 'text-slate-400';
  let shadow = '';

  if (isActive) {
    borderColor = 'border-cyan-400';
    bgColor = 'bg-cyan-900/40';
    textColor = 'text-cyan-200';
    shadow = 'shadow-[0_0_15px_rgba(34,211,238,0.5)]';
  }

  if (isPrompt) {
    borderColor = 'border-red-500';
    bgColor = isActive ? 'bg-red-900/60' : 'bg-red-900/20';
    textColor = 'text-red-400';
    shadow = 'shadow-[0_0_10px_rgba(239,68,68,0.3)]';
  }

  if (isTarget) {
    borderColor = 'border-emerald-500';
    bgColor = isActive ? 'bg-emerald-900/60' : 'bg-emerald-900/20';
    textColor = 'text-emerald-400';
    shadow = 'shadow-[0_0_10px_rgba(16,185,129,0.3)]';
  }

  return (
    <div className={`
      w-16 h-16 rounded-xl border-2 flex items-center justify-center font-bold text-2xl transition-all duration-75
      ${borderColor} ${bgColor} ${textColor} ${shadow}
      ${isActive ? 'scale-95 translate-y-0.5' : 'translate-y-0'}
    `}>
      {label}
    </div>
  );
};

export default KeyCap;
