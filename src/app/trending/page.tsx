'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Flame, Eye, ThumbsUp, TrendingUp, AlertCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { supabase, Video } from '@/lib/supabase';

interface TrendingVideo extends Video {
  score: number;
  rank: number;
}

function computeScore(video: Video): number {
  const ageDays = (Date.now() - new Date(video.created_at).getTime()) / (1000 * 60 * 60 * 24);
  return (video.views ?? 0) * 1 + (video.likes ?? 0) * 3 - ageDays * 2;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const RANK_CONFIGS = [
  { badge: '🥇', label: '#1', gradient: 'from-yellow-500 to-amber-400', border: 'border-yellow-500/40', glow: 'shadow-yellow-500/20' },
  { badge: '🥈', label: '#2', gradient: 'from-slate-400 to-slate-300', border: 'border-slate-400/40', glow: 'shadow-slate-400/20' },
  { badge: '🥉', label: '#3', gradient: 'from-amber-700 to-amber-600', border: 'border-amber-700/40', glow: 'shadow-amber-700/20' },
];

function SkeletonRow({ large }: { large?: boolean }) {
  return (
    <div className="flex items-center gap-4 animate-pulse p-4 rounded-2xl" style={{ background: 'var(--bg-card)' }}>
      <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: 'var(--bg-hover)' }} />
      <div
        className="rounded-xl shrink-0"
        style={{
          background: 'var(--bg-hover)',
          width: large ? '240px' : '160px',
          height: large ? '135px' : '90px',
        }}
      />
      <div className="flex-1 space-y-2">
        <div className="h-4 rounded w-3/4" style={{ background: 'var(--bg-hover)' }} />
        <div className="h-3 rounded w-1/2" style={{ background: 'var(--bg-hover)' }} />
        <div className="h-3 rounded w-1/3" style={{ background: 'var(--bg-hover)' }} />
      </div>
    </div>
  );
}

export default function TrendingPage() {
  const [videos, setVideos] = useState<TrendingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrending = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('videos')
        .select('*, category:categories(id, name, slug, color)')
        .order('created_at', { ascending: false });

      if (err) throw new Error(err.message);

      const scored = (data || [])
        .map(v => ({ ...v, score: computeScore(v) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 50)
        .map((v, i) => ({ ...v, rank: i + 1 }));

      setVideos(scored);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load trending videos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTrending(); }, [fetchTrending]);

  const topThree = videos.slice(0, 3);
  const rest = videos.slice(3);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Navbar onRefresh={fetchTrending} />

      <main className="max-w-[900px] mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Trending</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Top {videos.length} videos by score (views + likes − age)</p>
          </div>
        </div>

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: 'var(--bg-card)' }}>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Something went wrong</h2>
            <p className="text-sm max-w-xs mb-6" style={{ color: 'var(--text-muted)' }}>{error}</p>
            <button
              onClick={fetchTrending}
              className="px-5 py-2 rounded-full text-sm font-semibold transition-all bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonRow key={i} large />
            ))}
            <div className="h-px my-2" style={{ background: 'var(--border-subtle)' }} />
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonRow key={i + 3} />
            ))}
          </div>
        )}

        {/* Content */}
        {!loading && !error && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: 'var(--bg-card)' }}>
              <TrendingUp className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No videos yet</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Upload some videos to see them trend here.</p>
            <Link href="/" className="mt-6 px-6 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 transition-all">
              Go Home
            </Link>
          </div>
        )}

        {!loading && !error && videos.length > 0 && (
          <div className="space-y-2">
            {/* Top 3 — large featured rows */}
            {topThree.map((video) => {
              const cfg = RANK_CONFIGS[video.rank - 1];
              return (
                <Link
                  key={video.id}
                  href={`/watch/${video.id}`}
                  className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.01] shadow-lg ${cfg.glow} ${cfg.border}`}
                  style={{ background: 'var(--bg-card)', borderColor: undefined }}
                >
                  {/* Rank badge */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-2xl shrink-0 shadow-md`}>
                    {cfg.badge}
                  </div>

                  {/* Thumbnail */}
                  <div className="relative rounded-xl overflow-hidden shrink-0 shadow-md" style={{ width: '220px', height: '124px', background: 'var(--bg-hover)' }}>
                    {video.thumbnail_url ? (
                      <Image
                        src={video.thumbnail_url}
                        alt={video.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="220px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Flame className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {video.category && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                          style={{ background: video.category.color }}
                        >
                          {video.category.name}
                        </span>
                      )}
                      <span className={`text-[10px] font-bold bg-gradient-to-r ${cfg.gradient} bg-clip-text text-transparent`}>
                        {cfg.label} TRENDING
                      </span>
                    </div>
                    <h3 className="text-base font-bold leading-snug line-clamp-2 mb-2" style={{ color: 'var(--text-primary)' }}>
                      {video.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {formatNumber(video.views ?? 0)} views
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {formatNumber(video.likes ?? 0)} likes
                      </span>
                      <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
                        {Math.round(video.score).toLocaleString()} score
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}

            {/* Divider */}
            {rest.length > 0 && (
              <div className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>MORE TRENDING</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border-subtle)' }} />
              </div>
            )}

            {/* Ranks 4–50 — compact rows */}
            {rest.map((video) => (
              <Link
                key={video.id}
                href={`/watch/${video.id}`}
                className="group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 hover:scale-[1.005]"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                {/* Rank number */}
                <div
                  className="w-8 text-center text-sm font-bold shrink-0"
                  style={{ color: video.rank <= 10 ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  #{video.rank}
                </div>

                {/* Thumbnail */}
                <div className="relative rounded-lg overflow-hidden shrink-0" style={{ width: '142px', height: '80px', background: 'var(--bg-hover)' }}>
                  {video.thumbnail_url ? (
                    <Image
                      src={video.thumbnail_url}
                      alt={video.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="142px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Flame className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold leading-snug line-clamp-2 mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    {video.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {formatNumber(video.views ?? 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      {formatNumber(video.likes ?? 0)}
                    </span>
                    <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                      <TrendingUp className="w-3 h-3 text-orange-400" />
                      {Math.round(video.score).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Category pill — hidden on very small screens */}
                {video.category && (
                  <span
                    className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
                    style={{ background: video.category.color }}
                  >
                    {video.category.name}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
