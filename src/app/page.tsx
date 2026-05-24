'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Video as VideoIcon } from 'lucide-react';
import Navbar from '@/components/Navbar';
import VideoCard from '@/components/VideoCard';
import { supabase, Video, Category } from '@/lib/supabase';
import { Toaster } from 'react-hot-toast';
import { formatDuration } from '@/utils/thumbnailGenerator';

const PAGE_SIZE = 12;

export default function HomePage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [pinnedVideos, setPinnedVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategorySlug, setActiveCategorySlug] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'views' | 'likes'>('newest');
  const [page, setPage] = useState(1);

  // Track retry attempts with a ref so we don't need it in useCallback deps
  const retryCount = useRef(0);

  const fetchData = useCallback(async (isRetry = false) => {
    if (!isRetry) retryCount.current = 0;
    try {
      setLoading(true);
      setError(null);

      const [{ data: vids, error: vErr }, { data: cats, error: cErr }] = await Promise.all([
        supabase
          .from('videos')
          .select('*, category:categories(id, name, slug, color)')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
      ]);

      if (vErr) throw new Error(vErr.message);
      if (cErr) throw new Error(cErr.message);

      const allVids = vids || [];
      setPinnedVideos(allVids.filter((v: Video) => v.is_pinned));
      setVideos(allVids);
      setCategories(cats || []);
      retryCount.current = 0; // success — reset
    } catch (err) {
      retryCount.current += 1;
      if (retryCount.current < 3) {
        // Auto-retry: wait 1.5s then try again silently
        setTimeout(() => fetchData(true), 1500);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load videos');
        setLoading(false);
      }
    } finally {
      if (retryCount.current === 0) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, activeCategorySlug, sortBy]);

  // Re-fetch when user comes back to the tab or reconnects to the internet
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && videos.length === 0 && !loading) {
        fetchData();
      }
    };
    const onOnline = () => fetchData();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }, [fetchData, videos.length, loading]);


  // Filter and sort videos
  const filtered = useMemo(() => {
    let result = [...videos];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(v =>
        v.title.toLowerCase().includes(q) ||
        v.tags?.some(t => t.toLowerCase().includes(q)) ||
        v.category?.name.toLowerCase().includes(q)
      );
    }
    if (activeCategorySlug !== 'all') {
      result = result.filter(v => v.category?.slug === activeCategorySlug);
    }

    // Apply sorting
    if (sortBy === 'views') {
      result.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    } else if (sortBy === 'likes') {
      result.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    } else {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [videos, search, activeCategorySlug, sortBy]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  // Show all categories in the system so the filter is comprehensive
  const activeCategories = categories;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Toaster position="top-right" toastOptions={{
        style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px' },
        success: { iconTheme: { primary: '#a78bfa', secondary: 'transparent' } },
        error: { iconTheme: { primary: '#f87171', secondary: 'transparent' } },
      }} />

      <Navbar onRefresh={fetchData} onSearch={setSearch} searchValue={search} />

      {/* Vercel Environment Variables Warning Banner */}
      {(!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-400 py-3 px-4 text-center text-sm font-medium">
          ⚠️ <span className="font-semibold text-white">Missing Supabase credentials:</span> Please add <code className="bg-black/30 px-1.5 py-0.5 rounded text-fuchsia-300">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="bg-black/30 px-1.5 py-0.5 rounded text-fuchsia-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to your Vercel Environment Variables to load videos.
        </div>
      )}

      {/* Featured / Pinned Videos */}
      {pinnedVideos.length > 0 && (
        <div className="border-b" style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'linear-gradient(135deg, rgba(245,158,11,0.04), rgba(139,92,246,0.04))' }}>
          <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>⭐ Featured</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Pinned by admin</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {pinnedVideos.map(video => (
                <Link key={video.id} href={`/watch/${video.id}`} className="group shrink-0 w-56">
                  <div
                    className="relative aspect-video rounded-xl overflow-hidden mb-2"
                    style={{ border: '1.5px solid rgba(245,158,11,0.4)', boxShadow: '0 0 16px rgba(245,158,11,0.15)' }}
                  >
                    <Image
                      src={video.thumbnail_url}
                      alt={video.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="224px"
                    />
                    <div
                      className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: 'rgba(245,158,11,0.9)', color: '#000' }}
                    >
                      ⭐ FEATURED
                    </div>
                    {video.duration > 0 && (
                      <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/90 rounded text-[10px] font-bold text-white">
                        {formatDuration(video.duration)}
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                    {video.title}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {video.views > 0 ? `${video.views} views` : 'No views yet'}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category & Sorting chips */}
      <div className="sticky top-16 z-30" style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 flex items-center gap-2 py-3 overflow-x-auto scrollbar-none">
          {/* All chip */}
          <button
            onClick={() => { setActiveCategorySlug('all'); setSortBy('newest'); }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
            style={{
              background: activeCategorySlug === 'all' && sortBy === 'newest' ? 'var(--chip-active-bg)' : 'var(--bg-hover)',
              color: activeCategorySlug === 'all' && sortBy === 'newest' ? 'var(--chip-active-fg)' : 'var(--text-primary)',
            }}
          >
            All
          </button>

          {/* Most Viewed Chip */}
          <button
            onClick={() => setSortBy('views')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all border"
            style={{
              background: sortBy === 'views' ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-hover)',
              color: sortBy === 'views' ? '#a78bfa' : 'var(--text-primary)',
              borderColor: sortBy === 'views' ? 'rgba(139, 92, 246, 0.4)' : 'transparent',
            }}
          >
            👁️ Most Viewed
          </button>

          {/* Most Liked Chip */}
          <button
            onClick={() => setSortBy('likes')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all border"
            style={{
              background: sortBy === 'likes' ? 'rgba(236, 72, 153, 0.15)' : 'var(--bg-hover)',
              color: sortBy === 'likes' ? '#f472b6' : 'var(--text-primary)',
              borderColor: sortBy === 'likes' ? 'rgba(236, 72, 153, 0.4)' : 'transparent',
            }}
          >
            👍 Most Liked
          </button>

          {/* Vertical Divider */}
          <div className="w-[1px] h-6 bg-white/10 self-center mx-1 shrink-0" />

          {/* Category chips */}
          {activeCategories.map(cat => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategorySlug(cat.slug)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
              style={{
                background: activeCategorySlug === cat.slug ? cat.color : 'var(--bg-hover)',
                color: activeCategorySlug === cat.slug ? '#ffffff' : 'var(--text-primary)',
              }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: activeCategorySlug === cat.slug ? 'rgba(255,255,255,0.6)' : cat.color }} />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6">

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video rounded-xl mb-3" style={{ background: 'var(--bg-card)' }} />
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-full shrink-0" style={{ background: 'var(--bg-card)' }} />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 rounded w-full" style={{ background: 'var(--bg-card)' }} />
                    <div className="h-3 rounded w-2/3" style={{ background: 'var(--bg-card)' }} />
                    <div className="h-3 rounded w-1/2" style={{ background: 'var(--bg-card)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: 'var(--bg-card)' }}>
              <VideoIcon className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Something went wrong</h2>
            <p className="text-sm max-w-xs mb-6" style={{ color: 'var(--text-muted)' }}>{error}</p>
            <button onClick={() => fetchData()} className="px-5 py-2 rounded-full text-sm font-semibold" style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}>Try again</button>
          </div>
        )}

        {/* No results */}
        {!loading && !error && videos.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No videos match your filter</p>
            <button onClick={() => { setSearch(''); setActiveCategorySlug('all'); setSortBy('newest'); }} className="mt-3 text-sm text-violet-400 hover:text-violet-300">
              Clear filters
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: 'var(--bg-card)' }}>
              <VideoIcon className="w-12 h-12" style={{ color: 'var(--text-muted)' }} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No videos yet</h2>
            <p className="text-sm max-w-xs mb-6" style={{ color: 'var(--text-muted)' }}>Sign in and upload your first video.</p>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && paginated.length > 0 && (
          <>
            {(search || activeCategorySlug !== 'all') && (
              <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                {search && <> for &ldquo;<span style={{ color: 'var(--text-primary)' }}>{search}</span>&rdquo;</>}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
              {paginated.map(video => <VideoCard key={video.id} video={video} onRefresh={fetchData} />)}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="px-8 py-3 rounded-full text-sm font-semibold transition-all border hover:scale-105"
                  style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  Load More ({filtered.length - paginated.length} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
