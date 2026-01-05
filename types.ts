
export type KeyType = 'W' | 'A' | 'S' | 'D';

export type GameStatus = 'IDLE' | 'HOLDING' | 'COUNTERING' | 'TAPPING' | 'COOLDOWN' | 'FINISHED';

export interface ReactionAttempt {
  id: string;
  timestamp: number;
  prompt: KeyType[];
  target: KeyType[];
  holdDuration: number;
  releaseLatency: number; 
  counterLatency: number; 
  tapDuration: number; // 反向键按下到松开的时间
  isCorrect: boolean;
  score: number;
}

export interface SessionRecord {
  id: string;
  date: number;
  avgCounterLat: number;
  avgTapDuration: number;
  maxCombo: number;
  rating: string;
  totalScore: number;
}

export interface GameState {
  status: GameStatus;
  score: number;
  combo: number;
  attempts: ReactionAttempt[];
}

export interface AICoachFeedback {
  rating: string;
  advice: string;
  weakness: string;
}
