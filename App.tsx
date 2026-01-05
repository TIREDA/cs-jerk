
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { KeyType, ReactionAttempt, GameState, AICoachFeedback, GameStatus, SessionRecord } from './types';
import { GET_TARGET_FOR_PROMPT } from './constants';
import KeyCap from './components/KeyCap';
import StatsChart from './components/StatsChart';
import HistoryList from './components/HistoryList';
import Crosshair from './components/Crosshair';
import { getPerformanceAnalysis } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: 'IDLE',
    score: 0,
    combo: 0,
    attempts: [],
  });

  const [pressedKeys, setPressedKeys] = useState<Set<KeyType>>(new Set());
  const [currentPrompt, setCurrentPrompt] = useState<KeyType[]>([]);
  const [targetKeys, setTargetKeys] = useState<KeyType[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AICoachFeedback | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [velocity, setVelocity] = useState(0);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [isLastHitPerfect, setIsLastHitPerfect] = useState(false);
  const [showProgressBar, setShowProgressBar] = useState(false);

  // Timing refs
  const signalTimeRef = useRef<number>(0);
  const releaseTimeRef = useRef<number>(0);
  const tapStartTimeRef = useRef<number>(0);
  const holdStartTimeRef = useRef<number>(0);
  const targetHoldDurationRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('cs_reflex_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history");
      }
    }
  }, []);

  const playSound = (freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.1) => {
    if (!audioContextRef.current) audioContextRef.current = new AudioContext();
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const startRound = useCallback(() => {
    const keys: KeyType[] = ['W', 'A', 'S', 'D'];
    const count = Math.random() > 0.8 ? 2 : 1;
    const selection: KeyType[] = [];
    const shuffled = [...keys].sort(() => Math.random() - 0.5);
    for (let k of shuffled) {
      if (selection.length >= count) break;
      if (selection.includes('W') && k === 'S') continue;
      if (selection.includes('S') && k === 'W') continue;
      if (selection.includes('A') && k === 'D') continue;
      if (selection.includes('D') && k === 'A') continue;
      selection.push(k);
    }

    setCurrentPrompt(selection);
    setTargetKeys(GET_TARGET_FOR_PROMPT(selection));
    setGameState(prev => ({ ...prev, status: 'HOLDING' }));
    setIsLastHitPerfect(false);
    
    targetHoldDurationRef.current = 600 + Math.random() * 1900;
    
    setVelocity(0);
    releaseTimeRef.current = 0;
    tapStartTimeRef.current = 0;
    holdStartTimeRef.current = 0;
  }, []);

  const triggerCounterSignal = useCallback(() => {
    setGameState(prev => ({ ...prev, status: 'COUNTERING' }));
    signalTimeRef.current = performance.now();
    playSound(440, 0.05, 'square', 0.05);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase() as KeyType;
      if (!['W', 'A', 'S', 'D'].includes(key)) return;
      setPressedKeys(prev => new Set(prev).add(key));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase() as KeyType;
      if (!['W', 'A', 'S', 'D'].includes(key)) return;
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });

      if (gameState.status === 'COUNTERING' && currentPrompt.includes(key)) {
        if (releaseTimeRef.current === 0) {
           releaseTimeRef.current = performance.now();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.status, currentPrompt]);

  useEffect(() => {
    const now = performance.now();

    if (gameState.status === 'HOLDING') {
      const isHoldingPrompt = currentPrompt.every(k => pressedKeys.has(k));
      if (isHoldingPrompt) {
        if (holdStartTimeRef.current === 0) holdStartTimeRef.current = now;
        const elapsed = now - holdStartTimeRef.current;
        setVelocity(Math.min(100, (elapsed / targetHoldDurationRef.current) * 100));
        if (elapsed >= targetHoldDurationRef.current) triggerCounterSignal();
      } else {
        holdStartTimeRef.current = 0;
        setVelocity(0);
      }
    }

    if (gameState.status === 'COUNTERING') {
      const isPromptReleased = currentPrompt.every(k => !pressedKeys.has(k));
      const isTargetPressed = targetKeys.every(k => pressedKeys.has(k));
      if (isPromptReleased && isTargetPressed) {
        tapStartTimeRef.current = now;
        setGameState(prev => ({ ...prev, status: 'TAPPING' }));
      }
    }

    if (gameState.status === 'TAPPING') {
      const isTargetReleased = targetKeys.every(k => !pressedKeys.has(k));
      if (isTargetReleased) {
        const relLat = releaseTimeRef.current - signalTimeRef.current;
        const countLat = tapStartTimeRef.current - releaseTimeRef.current;
        const tapDur = now - tapStartTimeRef.current;
        
        const isPerfect = countLat < 70 && relLat < 250 && tapDur < 80;
        setIsLastHitPerfect(isPerfect);

        const score = Math.max(0, 100 - (countLat + Math.max(0, relLat - 150) + Math.max(0, tapDur - 50)) / 4);

        const attempt: ReactionAttempt = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          prompt: [...currentPrompt],
          target: [...targetKeys],
          holdDuration: now - holdStartTimeRef.current,
          releaseLatency: relLat,
          counterLatency: countLat,
          tapDuration: tapDur,
          isCorrect: true,
          score
        };

        setGameState(prev => {
          const nextAttempts = [...prev.attempts, attempt];
          const newCombo = isPerfect ? prev.combo + 1 : (relLat < 400 ? prev.combo : 0);
          if (newCombo > maxComboRef.current) maxComboRef.current = newCombo;

          if (nextAttempts.length >= 15) {
             finishGame(nextAttempts, prev.score + Math.floor(score));
             return { ...prev, attempts: nextAttempts, status: 'FINISHED' };
          }
          return { ...prev, attempts: nextAttempts, status: 'COOLDOWN', combo: newCombo, score: prev.score + Math.floor(score) };
        });
        
        if (isPerfect) {
          playSound(1400, 0.1, 'sine', 0.15);
          playSound(800, 0.05, 'square', 0.1);
        } else {
          playSound(600, 0.2);
        }
        
        setTimeout(startRound, 800);
      }
    }
  }, [pressedKeys, gameState.status, currentPrompt, targetKeys, startRound, triggerCounterSignal]);

  const finishGame = async (attempts: ReactionAttempt[], finalScore: number) => {
    setIsAnalyzing(true);
    const feedback = await getPerformanceAnalysis(attempts);
    setAiAnalysis(feedback);
    setIsAnalyzing(false);

    const avgCounter = attempts.reduce((a, b) => a + b.counterLatency, 0) / attempts.length;
    const avgTap = attempts.reduce((a, b) => a + b.tapDuration, 0) / attempts.length;
    
    const newRecord: SessionRecord = {
      id: Math.random().toString(36).substr(2, 9),
      date: Date.now(),
      avgCounterLat: avgCounter,
      avgTapDuration: avgTap,
      maxCombo: maxComboRef.current,
      rating: feedback.rating,
      totalScore: finalScore
    };

    setHistory(prev => {
      const next = [newRecord, ...prev].slice(0, 12);
      localStorage.setItem('cs_reflex_history', JSON.stringify(next));
      return next;
    });
  };

  const resetGame = () => {
    setGameState({ status: 'IDLE', score: 0, combo: 0, attempts: [] });
    setAiAnalysis(null);
    maxComboRef.current = 0;
  };

  const clearHistory = () => {
    if (confirm('确定要清除所有历史训练记录吗？')) {
      localStorage.removeItem('cs_reflex_history');
      setHistory([]);
    }
  };

  const renderKey = (label: KeyType) => (
    <KeyCap 
      key={label} 
      label={label} 
      isActive={pressedKeys.has(label)}
      isPrompt={currentPrompt.includes(label)}
      isTarget={targetKeys.includes(label)}
    />
  );

  const bestLat = history.length > 0 ? Math.min(...history.map(r => r.avgCounterLat)) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 pb-20">
      <header className="w-full max-w-5xl flex justify-between items-center mb-8 bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
             <i className="fas fa-crosshairs text-slate-950 text-2xl"></i>
          </div>
          <div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter">CS <span className="text-emerald-400">极限急停训练</span></h1>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">FPS Counter-Strafing Precision Trainer</p>
          </div>
        </div>
        <div className="flex gap-6 font-mono">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-emerald-500 uppercase font-bold">历史最佳急停</div>
            <div className="text-xl font-bold">{bestLat ? `${bestLat.toFixed(1)}ms` : '--'}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase">完美连击</div>
            <div className="text-xl font-bold text-cyan-400">{gameState.combo}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase">精准评分</div>
            <div className="text-xl font-bold">{gameState.score}</div>
          </div>
        </div>
      </header>

      <main className="w-full max-w-5xl flex flex-col items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <div className={`relative aspect-video rounded-3xl border-2 transition-all duration-300 flex flex-col items-center justify-center overflow-hidden
              ${gameState.status === 'COUNTERING' || gameState.status === 'TAPPING' ? 'border-red-500 bg-red-950/20' : 'border-slate-800 bg-slate-900/40'}`}>
              
              <button 
                onClick={() => setShowProgressBar(!showProgressBar)}
                className="absolute top-4 right-4 z-30 p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition-all flex items-center gap-2 group active:scale-95"
              >
                <i className={`fas ${showProgressBar ? 'fa-eye' : 'fa-eye-slash'} text-[10px] ${showProgressBar ? 'text-emerald-400' : 'text-slate-500'}`}></i>
                <span className="text-[9px] font-black uppercase tracking-tighter text-slate-400 group-hover:text-white">
                  {showProgressBar ? "进度条: 开" : "进度条: 关"}
                </span>
              </button>

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <Crosshair status={gameState.status} isPerfect={isLastHitPerfect} />
              </div>

              {gameState.status === 'IDLE' && (
                <div className="text-center z-10 space-y-4 px-6">
                  <h2 className="text-4xl font-black uppercase italic tracking-tighter">磨练肌肉记忆</h2>
                  <p className="text-slate-400 max-w-xs mx-auto text-sm leading-relaxed">
                    长按模拟移动。
                    信号触发后，<span className="text-white font-bold">松开原键</span>并<span className="text-white font-bold">瞬间敲击反向键</span>。
                  </p>
                  <button onClick={startRound} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 px-12 rounded-full uppercase transition-all shadow-lg active:scale-95">开始训练</button>
                </div>
              )}

              {(gameState.status === 'HOLDING' || gameState.status === 'COUNTERING' || gameState.status === 'TAPPING') && (
                <div className="text-center z-10">
                  <div className="mb-12 h-10">
                     <div className={`text-2xl font-black italic uppercase transition-all duration-75 ${gameState.status !== 'HOLDING' ? 'text-red-500 animate-pulse' : 'text-slate-500'}`}>
                        {gameState.status === 'HOLDING' ? `按住 ${currentPrompt.join('+')}` : 
                         gameState.status === 'COUNTERING' ? '立刻反击！' : '松开反向键！'}
                     </div>
                  </div>
                  
                  {/* WASD Cluster Layout */}
                  <div className="flex flex-col items-center gap-2 scale-110 opacity-60">
                     <div className="flex justify-center w-full">
                        {renderKey('W')}
                     </div>
                     <div className="flex gap-2 justify-center">
                        {renderKey('A')}
                        {renderKey('S')}
                        {renderKey('D')}
                     </div>
                  </div>
                </div>
              )}

              {gameState.status === 'COOLDOWN' && (
                <div className="text-center animate-in zoom-in duration-300 z-10">
                  <div className={`${isLastHitPerfect ? 'text-cyan-400' : 'text-emerald-400'} text-6xl font-black italic mb-2 tracking-tighter`}>
                    {isLastHitPerfect ? '神级表现！' : '稳如泰山！'}
                  </div>
                  <div className="flex gap-8 justify-center">
                    <div className="text-slate-400 font-mono text-xs text-left space-y-1 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                       <div>切换延迟: <span className="text-white">{(gameState.attempts[gameState.attempts.length-1].counterLatency).toFixed(1)}ms</span></div>
                       <div>敲击时长: <span className="text-emerald-400">{(gameState.attempts[gameState.attempts.length-1].tapDuration).toFixed(1)}ms</span></div>
                    </div>
                  </div>
                </div>
              )}

              {showProgressBar && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 z-30">
                  <div className="h-full bg-emerald-500 transition-all duration-100 ease-linear" style={{ width: `${velocity}%` }}></div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
                  <h3 className="text-[10px] text-slate-400 uppercase font-bold mb-4 flex justify-between items-center">
                    最近 5 次敲击时长 (ms)
                    <span className="text-cyan-400 text-[8px]">目标: &lt; 80ms</span>
                  </h3>
                  <div className="flex items-end gap-2 h-20">
                     {gameState.attempts.slice(-5).map((a, i) => (
                       <div key={i} className={`flex-1 border-t-2 relative group transition-all ${a.tapDuration < 80 ? 'bg-cyan-500/20 border-cyan-500' : 'bg-red-500/20 border-red-500'}`} style={{ height: `${Math.min(100, (a.tapDuration/200)*100)}%` }}>
                          <span className="absolute -top-6 left-0 right-0 text-center text-[8px] font-mono">{a.tapDuration.toFixed(0)}</span>
                       </div>
                     ))}
                     {gameState.attempts.length < 5 && Array(5 - gameState.attempts.length).fill(0).map((_, i) => (
                       <div key={`empty-${i}`} className="flex-1 bg-slate-800/20 h-1 border-t-2 border-slate-800/30"></div>
                     ))}
                  </div>
               </div>
               <StatsChart attempts={gameState.attempts} />
            </div>
          </div>

          <aside className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <i className="fas fa-brain text-6xl"></i>
               </div>
               <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                  <i className="fas fa-robot text-emerald-400"></i> 神经性能报告
               </h2>

               {isAnalyzing ? (
                 <div className="py-12 flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-[10px] text-slate-500 font-mono uppercase animate-pulse text-center">正在解析肌肉同步相位...</p>
                 </div>
               ) : aiAnalysis ? (
                 <div className="space-y-6">
                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                       <div className="text-[10px] text-slate-500 uppercase mb-1">训练表现评级</div>
                       <div className="text-3xl font-black italic text-cyan-400">{aiAnalysis.rating}</div>
                    </div>
                    <div>
                       <h4 className="text-[10px] text-red-400 uppercase font-black mb-1">痛点分析</h4>
                       <p className="text-sm text-slate-300 leading-relaxed">{aiAnalysis.weakness}</p>
                    </div>
                    <div>
                       <h4 className="text-[10px] text-emerald-400 uppercase font-black mb-1">教练寄语</h4>
                       <p className="text-sm text-slate-400 leading-relaxed italic">"{aiAnalysis.advice}"</p>
                    </div>
                    <button onClick={resetGame} className="w-full py-3 bg-emerald-500 text-slate-950 hover:bg-emerald-400 rounded-xl text-xs font-black uppercase transition-all active:scale-95">再练一轮</button>
                 </div>
               ) : (
                 <div className="py-12 text-center space-y-4">
                    <p className="text-xs text-slate-500 leading-relaxed">完成 15 次有效急停以解锁神经画像。</p>
                    <div className="text-2xl font-black text-slate-800">{gameState.attempts.length} / 15</div>
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(gameState.attempts.length / 15) * 100}%` }}></div>
                    </div>
                 </div>
               )}
            </div>

            <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-4">
               <h3 className="text-xs font-black uppercase text-slate-400">急停段位参考 (延迟)</h3>
               <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-slate-950 rounded border-l-2 border-cyan-400">
                    <span className="text-[10px] font-bold">职业水平</span>
                    <span className="text-xs font-mono text-cyan-400">&lt; 40ms</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-slate-950 rounded border-l-2 border-emerald-400">
                    <span className="text-[10px] font-bold">Faceit 10级</span>
                    <span className="text-xs font-mono text-emerald-400">40 - 70ms</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-slate-950 rounded border-l-2 border-amber-400">
                    <span className="text-[10px] font-bold">平均水平</span>
                    <span className="text-xs font-mono text-amber-400">70 - 120ms</span>
                  </div>
               </div>
            </div>
          </aside>
        </div>

        <HistoryList records={history} onClear={clearHistory} />
      </main>
    </div>
  );
};

export default App;
