'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Tv2 } from 'lucide-react';
import { Video } from '@/lib/supabase';
import { formatDuration } from '@/utils/thumbnailGenerator';

interface VideoCardProps {
  video: Video;
}

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
  if (mins > 0) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  return 'just now';
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function VideoCard({ video }: VideoCardProps) {
  const duration = formatDuration(video.duration);
  const cat = video.category;

  // Phase 1D – fade-in when card enters viewport
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Phase 2B – watch progress bar
  const [watchProgress, setWatchProgress] = useState(0);

  // IntersectionObserver – one-shot fade-in
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Read resume position from localStorage and compute progress %
  useEffect(() => {
    if (!video.duration) return;
    const saved = localStorage.getItem(`dwx-resume-${video.id}`);
    if (saved) {
      const pct = (parseInt(saved, 10) / video.duration) * 100;
      setWatchProgress(pct);
    }
  }, [video.id, video.duration]);

  return (
    <Link
      href={`/watch/${video.id}`}
      ref={cardRef}
      className="group block"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      {/* Thumbnail */}
      <div
        className="video-card-thumb relative aspect-video rounded-xl overflow-hidden mb-3"
        style={{
          background: 'var(--bg-card)',
          '--glow-color': cat ? cat.color : '#7c3aed',
        } as React.CSSProperties}
      >
        <Image
          src={video.thumbnail_url}
          alt={video.title}
          fill
          loading="lazy"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-black/70 border border-white/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-white fill-white ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>

        {/* Duration badge */}
        {duration && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/90 rounded text-[11px] font-bold text-white">
            {duration}
          </div>
        )}

        {/* Category badge on thumbnail */}
        {cat && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: cat.color + 'cc' }}>
            {cat.name}
          </div>
        )}

        {/* Phase 2B – Watch progress bar */}
        {watchProgress > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.5)' }}
          >
            <div
              className="h-full rounded-b-xl"
              style={{
                width: `${Math.min(100, watchProgress)}%`,
                background: 'linear-gradient(to right, #7c3aed, #d946ef)',
              }}
            />
          </div>
        )}
      </div>

      {/* Card info */}
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 mt-0.5">
          <Tv2 className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 transition-colors" style={{ color: 'var(--text-primary)' }}>
            {video.title}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>DarkWebXYoruWeb</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {video.views > 0 ? `${formatViews(video.views)} views · ` : ''}{timeAgo(video.created_at)}
          </p>

          {/* Tags */}
          {video.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {video.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-600/15 text-violet-400 border border-violet-600/20">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
