'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Trash2, History } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useWatchHistory, HistoryEntry } from '@/hooks/useWatchHistory';

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [showClear, setShowClear] = useState(false);
  const { getHistory, clearHistory } = useWatchHistory();

  useEffect(() => {
    setEntries(getHistory());
  }, [getHistory]);

  function handleClear() {
    clearHistory();
    setEntries([]);
    setShowClear(false);
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Navbar onRefresh={() => {}} />
      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Watch History</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{entries.length} video{entries.length !== 1 ? 's' : ''} watched</p>
            </div>
          </div>
          {entries.length > 0 && (
            <button
              onClick={() => setShowClear(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors text-red-400 hover:bg-red-500/10"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-hover)' }}
            >
              <Trash2 className="w-4 h-4" /> Clear All
            </button>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: 'var(--bg-card)' }}>
              <Clock className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No watch history</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Videos you watch will appear here.</p>
            <Link href="/" className="mt-6 px-6 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 transition-all">
              Browse Videos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {entries.map(entry => (
              <Link key={entry.videoId} href={`/watch/${entry.videoId}`} className="group block">
                <div className="relative aspect-video rounded-xl overflow-hidden mb-3" style={{ background: 'var(--bg-card)' }}>
                  <Image
                    src={entry.thumbnailUrl}
                    alt={entry.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/70 border border-white/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white fill-white ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                </div>
                <h3 className="text-sm font-semibold leading-snug line-clamp-2 mb-1" style={{ color: 'var(--text-primary)' }}>{entry.title}</h3>
                <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <Clock className="w-3 h-3" /> {timeAgo(entry.watchedAt)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Clear confirmation modal */}
      {showClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowClear(false)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Clear Watch History?</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>This will remove all {entries.length} videos from your history. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowClear(false)} className="flex-1 py-2 rounded-xl text-sm font-semibold border" style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>Cancel</button>
              <button onClick={handleClear} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors">Clear All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
