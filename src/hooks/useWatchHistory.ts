'use client';
import { useCallback } from 'react';

const HISTORY_KEY = 'dwx-watch-history';
const MAX_HISTORY = 50;

export interface HistoryEntry {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  watchedAt: number; // timestamp ms
  duration?: number;
}

export function useWatchHistory() {
  const getHistory = useCallback((): HistoryEntry[] => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch { return []; }
  }, []);

  const addToHistory = useCallback((entry: Omit<HistoryEntry, 'watchedAt'>) => {
    try {
      const history = getHistory().filter(h => h.videoId !== entry.videoId);
      const next = [{ ...entry, watchedAt: Date.now() }, ...history].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {}
  }, [getHistory]);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  return { getHistory, addToHistory, clearHistory };
}
