'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard, Eye, ThumbsUp, MessageSquare,
  Trash2, Pin, PinOff, Shield, Search, RefreshCw,
  Film, Loader2, ArrowLeft, Clock,
} from 'lucide-react';
import { supabase, Video as VideoType } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import toast, { Toaster } from 'react-hot-toast';
import { formatDuration } from '@/utils/thumbnailGenerator';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor(diff / 60000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function AdminPage() {
  const { isAdmin, authLoading } = useAuth();
  const router = useRouter();

  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [totalComments, setTotalComments] = useState(0);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/');
    }
  }, [authLoading, isAdmin, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: vids }, { count: commentCount }] = await Promise.all([
        supabase.from('videos').select('*, category:categories(id,name,slug,color)').order('created_at', { ascending: false }),
        supabase.from('comments').select('*', { count: 'exact', head: true }),
      ]);
      setVideos(vids || []);
      setTotalComments(commentCount || 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (isAdmin) fetchData(); }, [isAdmin, fetchData]);

  const totalViews = videos.reduce((s, v) => s + (v.views ?? 0), 0);
  const totalLikes = videos.reduce((s, v) => s + (v.likes ?? 0), 0);

  const filtered = videos.filter(v =>
    v.title.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (error) throw error;
      toast.success('Video deleted');
      setVideos(prev => prev.filter(v => v.id !== id));
      setDeleteTarget(null);
      setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  async function handleBulkDelete() {
    setDeletingBulk(true);
    try {
      const ids = [...selected];
      const { error } = await supabase.from('videos').delete().in('id', ids);
      if (error) throw error;
      toast.success(`Deleted ${ids.length} videos`);
      setVideos(prev => prev.filter(v => !selected.has(v.id)));
      setSelected(new Set());
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Bulk delete failed');
    } finally {
      setDeletingBulk(false);
    }
  }

  async function handleTogglePin(video: VideoType) {
    const next = !video.is_pinned;
    try {
      const { error } = await supabase.from('videos').update({ is_pinned: next }).eq('id', video.id);
      if (error) throw error;
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, is_pinned: next } : v));
      toast.success(next ? '📌 Video pinned to featured!' : 'Video unpinned');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update');
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(v => v.id)));
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const statCards = [
    { icon: Film, label: 'Total Videos', value: formatNum(videos.length), color: '#7c3aed' },
    { icon: Eye, label: 'Total Views', value: formatNum(totalViews), color: '#0ea5e9' },
    { icon: ThumbsUp, label: 'Total Likes', value: formatNum(totalLikes), color: '#ec4899' },
    { icon: MessageSquare, label: 'Comments', value: formatNum(totalComments), color: '#10b981' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Toaster position="top-right" toastOptions={{
        style: { background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
      }} />
      <Navbar onRefresh={fetchData} />

      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--text-muted)' }} title="Back to gallery">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Admin Dashboard</h1>
              <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <Shield className="w-3 h-3" /> Admin-only control panel
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="ml-auto p-2 rounded-lg transition-all hover:bg-white/5"
            style={{ color: 'var(--text-muted)' }}
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map(card => (
            <div
              key={card.label}
              className="rounded-2xl p-5 border"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: card.color + '22' }}>
                  <card.icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{card.label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Video Management Table */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Video Library
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                {filtered.length} video{filtered.length !== 1 ? 's' : ''}
              </span>
            </h2>
            <div className="ml-auto flex items-center gap-3">
              {selected.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={deletingBulk}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
                >
                  {deletingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Delete {selected.size}
                </button>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search videos..."
                  className="pl-9 pr-4 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)', width: '220px' }}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="accent-violet-500"
                    />
                  </th>
                  {['Video', 'Category', 'Views', 'Likes', 'Status', 'Uploaded', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 rounded animate-pulse" style={{ background: 'var(--bg-hover)', width: j === 1 ? '160px' : '60px' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      {search ? 'No videos match your search.' : 'No videos yet.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map(video => (
                    <tr
                      key={video.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        background: selected.has(video.id) ? 'rgba(139,92,246,0.08)' : 'transparent',
                      }}
                      className="transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(video.id)}
                          onChange={() => toggleSelect(video.id)}
                          className="accent-violet-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-20 aspect-video rounded-lg overflow-hidden shrink-0" style={{ background: 'var(--bg-hover)' }}>
                            <Image src={video.thumbnail_url} alt={video.title} fill className="object-cover" sizes="80px" />
                            {video.duration > 0 && (
                              <div className="absolute bottom-0.5 right-0.5 px-1 bg-black/80 rounded text-[9px] text-white font-bold">
                                {formatDuration(video.duration)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/watch/${video.id}`}
                              className="text-sm font-semibold line-clamp-2 hover:text-violet-400 transition-colors"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {video.title}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {video.category ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: video.category.color }}>
                            {video.category.name}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {formatNum(video.views ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {formatNum(video.likes ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          video.is_pinned
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {video.is_pinned ? '📌 Pinned' : '✓ Live'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{timeAgo(video.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTogglePin(video)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-yellow-500/10"
                            style={{ color: video.is_pinned ? '#eab308' : 'var(--text-muted)' }}
                            title={video.is_pinned ? 'Unpin from Featured' : 'Pin to Featured'}
                          >
                            {video.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(video.id)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10 text-red-400"
                            title="Delete video"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-center mb-2" style={{ color: 'var(--text-primary)' }}>Delete Video?</h3>
            <p className="text-sm text-center mb-6" style={{ color: 'var(--text-secondary)' }}>
              This permanently removes the video record from the database.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl text-sm font-semibold border"
                style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget!)}
                disabled={deleting}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
