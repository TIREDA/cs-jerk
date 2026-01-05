
import React from 'react';
import { SessionRecord } from '../types';

interface HistoryListProps {
  records: SessionRecord[];
  onClear: () => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ records, onClear }) => {
  if (records.length === 0) return null;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 mt-8 w-full max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <i className="fas fa-history text-cyan-400"></i> 历史训练战报
        </h2>
        <button 
          onClick={onClear}
          className="text-[10px] text-slate-600 hover:text-red-400 font-bold uppercase transition-colors"
        >
          清除全部记录
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {records.map((record) => (
          <div key={record.id} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl hover:border-slate-700 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div className="text-[10px] text-slate-500 font-mono">
                {new Date(record.date).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase italic
                ${record.rating.includes('级') || record.rating.includes('Elite') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                {record.rating}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[9px] text-slate-600 uppercase font-bold">平均急停延迟</div>
                <div className="text-lg font-black text-white">{record.avgCounterLat.toFixed(1)}<span className="text-[10px] ml-1 text-slate-500">ms</span></div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-slate-600 uppercase font-bold">最高连击</div>
                <div className="text-lg font-black text-cyan-400">{record.maxCombo}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;
