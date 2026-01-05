
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ReactionAttempt } from '../types';

interface StatsChartProps {
  attempts: ReactionAttempt[];
}

const StatsChart: React.FC<StatsChartProps> = ({ attempts }) => {
  const data = attempts.map((a, i) => ({
    round: i + 1,
    time: a.isCorrect ? a.counterLatency : 1500, // 关注切换延迟
    accuracy: a.isCorrect ? 1 : 0
  }));

  return (
    <div className="h-64 w-full bg-slate-900/50 p-4 rounded-xl border border-slate-800">
      <h3 className="text-slate-400 text-sm font-medium mb-4 uppercase tracking-wider">急停延迟趋势 (毫秒)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="round" stroke="#64748b" label={{ value: '次数', position: 'insideBottomRight', offset: -5 }} />
          <YAxis stroke="#64748b" domain={[0, 'auto']} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
            itemStyle={{ color: '#34d399' }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: any) => [`${Number(value).toFixed(1)} ms`, '延迟']}
          />
          <Line 
            type="monotone" 
            dataKey="time" 
            stroke="#10b981" 
            strokeWidth={2} 
            dot={{ fill: '#10b981', r: 4 }} 
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatsChart;
