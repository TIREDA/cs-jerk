
import { KeyType } from './types';

export const KEY_OPPOSITES: Record<KeyType, KeyType> = {
  'W': 'S',
  'S': 'W',
  'A': 'D',
  'D': 'A'
};

export const KEY_COLORS = {
  W: 'bg-blue-500',
  A: 'bg-emerald-500',
  S: 'bg-red-500',
  D: 'bg-amber-500',
};

export const GET_TARGET_FOR_PROMPT = (prompt: KeyType[]): KeyType[] => {
  return prompt.map(k => KEY_OPPOSITES[k]).sort();
};

export const ARE_ARRAYS_EQUAL = <T,>(a: T[], b: T[]): boolean => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, index) => val === sortedB[index]);
};
