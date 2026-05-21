'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, ThumbsUp, Share2, Download, MoreHorizontal,
  Eye, Calendar, Tv2, Trash2, Pencil, Check, X, Shield,
} from 'lucide-react';
import { supabase, Video, Category } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import CommentsSection from '@/components/CommentsSection';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { formatDuration } from '@/utils/thumbnailGenerator';
import { useAuth } from '@/context/AuthContext';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (mins > 0) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  return 'just now';
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const LIKED_KEY = 'vv-liked-videos';
function getLiked(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || '[]')); } catch { return new Set(); }
}
function toggleLiked(id: string): boolean {
  const s = getLiked();
  s.has(id) ? s.delete(id) : s.add(id);
  localStorage.setItem(LIKED_KEY, JSON.stringify([...s]));
  return s.has(id);
}

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { isAdmin } = useAuth();

  const [video, setVideo] = useState<Video | null>(null);
  const [related, setRelated] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const [activeCategorySlug, setActiveCategorySlug] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'views' | 'likes'>('newest');
  const viewCounted = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: vid }, { data: all }, { data: cats }] = await Promise.all([
        supabase.from('videos').select('*, category:categories(id,name,slug,color)').eq('id', id).single(),
        supabase.from('videos').select('*, category:categories(id,name,slug,color)').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
      ]);
      if (vid) { setVideo(vid); setLocalLikes(vid.likes ?? 0); setTitleDraft(vid.title); }
      setRelated((all ?? []).filter((v: Video) => v.id !== id));
      setCategories(cats || []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setLiked(getLiked().has(id)); }, [id]);

  const filteredRelated = useMemo(() => {
    let result = [...related];

    // Filter by active category slug
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
  }, [related, activeCategorySlug, sortBy]);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  // View counter — once per page load
  useEffect(() => {
    if (!id || viewCounted.current) return;
    viewCounted.current = true;

    // 1. Try to increment views atomically using a database RPC function
    supabase.rpc('increment_views', { video_id: id }).then(({ error }) => {
      if (error) {
        // Fallback: If RPC is not created yet, do standard client-side SELECT + UPDATE
        console.warn('RPC increment_views not found, falling back to client-side update:', error.message);
        
        supabase.from('videos').select('views').eq('id', id).single().then(({ data, error: fetchError }) => {
          if (fetchError) {
            console.error('Failed to fetch current views:', fetchError.message);
            return;
          }
          if (data) {
            const nextViews = (data.views ?? 0) + 1;
            supabase.from('videos').update({ views: nextViews }).eq('id', id).then(({ error: updateError }) => {
              if (updateError) {
                console.error('Failed to update views:', updateError.message);
              } else {
                // Update local state immediately so user sees the increment
                setVideo(prev => prev ? { ...prev, views: nextViews } : prev);
              }
            });
          }
        });
      } else {
        // RPC succeeded! Increment local state immediately
        setVideo(prev => prev ? { ...prev, views: (prev.views ?? 0) + 1 } : prev);
      }
    });
  }, [id]);

  async function handleLike() {
    if (!video) return;
    const nowLiked = toggleLiked(id);
    const delta = nowLiked ? 1 : -1;
    setLiked(nowLiked);
    setLocalLikes(prev => Math.max(0, prev + delta));
    await supabase.from('videos').update({ likes: Math.max(0, (video.likes ?? 0) + delta) }).eq('id', id);
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    setShowShare(true);
    toast.success('Link copied!');
    setTimeout(() => setShowShare(false), 2000);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (error) throw new Error(error.message);
      toast.success('Video deleted.');
      router.push('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.');
      setDeleting(false);
    }
  }

  async function handleSaveTitle() {
    if (!titleDraft.trim() || titleDraft === video?.title) { setEditingTitle(false); return; }
    setSavingTitle(true);
    try {
      const { error } = await supabase.from('videos').update({ title: titleDraft.trim() }).eq('id', id);
      if (error) throw new Error(error.message);
      setVideo(prev => prev ? { ...prev, title: titleDraft.trim() } : prev);
      toast.success('Title updated!');
      setEditingTitle(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setSavingTitle(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
        <Navbar onRefresh={() => {}} />
        <div className="max-w-[1500px] mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <div className="aspect-video rounded-xl animate-pulse mb-4" style={{ background: 'var(--bg-card)' }} />
            <div className="h-7 rounded-lg w-3/4 animate-pulse mb-3" style={{ background: 'var(--bg-card)' }} />
            <div className="h-4 rounded w-1/4 animate-pulse" style={{ background: 'var(--bg-card)' }} />
          </div>
          <div className="w-full lg:w-[380px] space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-2 animate-pulse">
                <div className="w-40 aspect-video rounded-lg shrink-0" style={{ background: 'var(--bg-card)' }} />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 rounded w-full" style={{ background: 'var(--bg-card)' }} />
                  <div className="h-3 rounded w-2/3" style={{ background: 'var(--bg-card)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <p className="text-2xl font-bold mb-4">Video not found</p>
        <button onClick={() => router.push('/')} className="px-5 py-2 rounded-full text-sm font-semibold" style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}>Go Home</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <Toaster position="top-right" toastOptions={{ style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px' } }} />
      <Navbar onRefresh={() => {}} />

      <div className="max-w-[1500px] mx-auto px-3 sm:px-6 py-4 flex flex-col lg:flex-row gap-6">

        {/* ── LEFT ── */}
        <div className="flex-1 min-w-0">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm mb-3 lg:hidden transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {/* Player */}
          <div className="bg-black rounded-xl overflow-hidden aspect-video shadow-2xl">
            <video key={video.id} src={video.video_url} controls autoPlay className="w-full h-full" poster={video.thumbnail_url} />
          </div>

          {/* Category + title */}
          {video.category && (
            <div className="flex items-center gap-2 mt-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white" style={{ background: video.category.color }}>
                {video.category.name}
              </span>
            </div>
          )}

          {/* Title row */}
          <div className="flex items-start gap-2 mt-2 mb-1">
            {editingTitle && isAdmin ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  ref={titleInputRef}
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                  className="flex-1 text-lg sm:text-xl font-bold px-3 py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
                <button onClick={handleSaveTitle} disabled={savingTitle} className="p-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => { setEditingTitle(false); setTitleDraft(video.title); }} className="p-2 rounded-lg transition-colors" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <h1 className="flex-1 text-lg sm:text-xl font-bold leading-snug" style={{ color: 'var(--text-primary)' }}>{video.title}</h1>
                {/* Edit title — admin only */}
                {isAdmin && (
                  <button onClick={() => setEditingTitle(true)} className="p-2 rounded-lg transition-colors shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} title="Edit title (admin)">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Tags */}
          {video.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {video.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-violet-600/15 text-violet-400 border border-violet-600/20">#{tag}</span>
              ))}
            </div>
          )}

          {/* Meta + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-3">
            {/* Channel */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0">
                <Tv2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>VideoVault</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Serverless Gallery</p>
              </div>
              <button className="ml-3 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors" style={{ background: 'var(--text-primary)', color: 'var(--bg-base)' }}>
                Subscribe
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${liked ? 'bg-violet-600 text-white' : ''}`}
                style={!liked ? { background: 'var(--bg-hover)', color: 'var(--text-primary)' } : {}}
              >
                <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-white' : ''}`} />
                {localLikes > 0 ? formatViews(localLikes) : 'Like'}
              </button>

              <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                <Share2 className="w-4 h-4" />
                {showShare ? 'Copied!' : 'Share'}
              </button>

              <a href={video.video_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Download</span>
              </a>

              {/* Admin-only delete */}
              {isAdmin && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors text-red-400 hover:bg-red-500/10 border border-red-500/20"
                  style={{ background: 'var(--bg-hover)' }}
                  title="Delete video (admin only)"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}

              <button className="w-9 h-9 rounded-full flex items-center justify-center transition-colors" style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}>
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center gap-4 text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatViews(video.views ?? 0)}</span> views
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(video.created_at)}
              </span>
              {video.duration > 0 && (
                <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'var(--bg-hover)' }}>
                  {formatDuration(video.duration)}
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {video.title} · Uploaded {timeAgo(video.created_at)} · Hosted on Catbox.moe via VideoVault.
            </p>
            {isAdmin && (
              <p className="text-xs mt-2 flex items-center gap-1 text-violet-400">
                <Shield className="w-3 h-3" /> You are viewing as Admin — edit/delete controls are visible only to you.
              </p>
            )}
          </div>

          {/* Comments */}
          <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--bg-card)' }}>
            <CommentsSection videoId={id} />
          </div>
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <aside className="w-full lg:w-[380px] shrink-0">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Up next</h2>
              {(activeCategorySlug !== 'all' || sortBy !== 'newest') && (
                <button
                  onClick={() => { setActiveCategorySlug('all'); setSortBy('newest'); }}
                  className="text-xs text-violet-400 hover:text-violet-300 transition-colors font-semibold"
                >
                  Reset
                </button>
              )}
            </div>
            
            {/* Compact scrollable chips row */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                onClick={() => { setActiveCategorySlug('all'); setSortBy('newest'); }}
                className="px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all"
                style={{
                  background: activeCategorySlug === 'all' && sortBy === 'newest' ? 'var(--chip-active-bg)' : 'var(--bg-hover)',
                  color: activeCategorySlug === 'all' && sortBy === 'newest' ? 'var(--chip-active-fg)' : 'var(--text-primary)',
                }}
              >
                All
              </button>

              <button
                onClick={() => setSortBy('views')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all border"
                style={{
                  background: sortBy === 'views' ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-hover)',
                  color: sortBy === 'views' ? '#a78bfa' : 'var(--text-primary)',
                  borderColor: sortBy === 'views' ? 'rgba(139, 92, 246, 0.4)' : 'transparent',
                }}
              >
                👁️ Views
              </button>

              <button
                onClick={() => setSortBy('likes')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all border"
                style={{
                  background: sortBy === 'likes' ? 'rgba(236, 72, 153, 0.15)' : 'var(--bg-hover)',
                  color: sortBy === 'likes' ? '#f472b6' : 'var(--text-primary)',
                  borderColor: sortBy === 'likes' ? 'rgba(236, 72, 153, 0.4)' : 'transparent',
                }}
              >
                👍 Likes
              </button>

              {categories.length > 0 && <div className="w-[1px] h-4 bg-white/10 shrink-0 mx-0.5" />}

              {categories.map(cat => (
                <button
                  key={cat.slug}
                  onClick={() => setActiveCategorySlug(cat.slug)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all"
                  style={{
                    background: activeCategorySlug === cat.slug ? cat.color : 'var(--bg-hover)',
                    color: activeCategorySlug === cat.slug ? '#ffffff' : 'var(--text-primary)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: activeCategorySlug === cat.slug ? 'rgba(255,255,255,0.6)' : cat.color }} />
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {filteredRelated.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No matching videos found</p>
              <button
                onClick={() => { setActiveCategorySlug('all'); setSortBy('newest'); }}
                className="mt-2 text-xs text-violet-400 hover:text-violet-300 font-semibold"
              >
                Show all videos
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRelated.map(v => (
                <Link key={v.id} href={`/watch/${v.id}`} className="flex gap-2 group rounded-xl p-1 transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="relative w-40 aspect-video rounded-lg overflow-hidden shrink-0" style={{ background: 'var(--bg-card)' }}>
                    <Image src={v.thumbnail_url} alt={v.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="160px" />
                    {v.duration > 0 && (
                      <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/90 rounded text-[10px] font-bold text-white">
                        {formatDuration(v.duration)}
                      </div>
                    )}
                    {v.category && (
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-white" style={{ background: v.category.color + 'cc' }}>
                        {v.category.name}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <p className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: 'var(--text-primary)' }}>{v.title}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>VideoVault</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {v.views > 0 ? `${formatViews(v.views)} views · ` : ''}{timeAgo(v.created_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Shield className="w-4 h-4 text-violet-400" />
              <span className="text-xs font-bold text-violet-400">ADMIN ACTION</span>
            </div>
            <h3 className="text-lg font-bold text-center mb-2" style={{ color: 'var(--text-primary)' }}>Delete Video?</h3>
            <p className="text-sm text-center mb-6" style={{ color: 'var(--text-secondary)' }}>
              This permanently removes the record from the database. The Catbox file will still be accessible via its direct URL.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors" style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
