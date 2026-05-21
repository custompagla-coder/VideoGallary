'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play, Calendar, ExternalLink } from 'lucide-react';
import { Video } from '@/lib/supabase';

interface VideoCardProps {
  video: Video;
}

export default function VideoCard({ video }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const formattedDate = new Date(video.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="group relative bg-[#0f0f14] border border-white/5 rounded-2xl overflow-hidden hover:border-violet-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1">
      {/* Media area */}
      <div className="relative aspect-video bg-black">
        {isPlaying ? (
          <video
            src={video.video_url}
            controls
            autoPlay
            className="w-full h-full object-contain"
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <>
            {/* Thumbnail */}
            <Image
              src={video.thumbnail_url}
              alt={video.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />

            {/* Play overlay */}
            <button
              onClick={() => setIsPlaying(true)}
              aria-label={`Play ${video.title}`}
              className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            >
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 hover:bg-white/30 transition-colors">
                <Play className="w-6 h-6 text-white fill-white ml-1" />
              </div>
            </button>

            {/* Duration badge placeholder */}
            <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-sm rounded-md">
              <Play className="w-3 h-3 text-white inline mr-1" />
              <span className="text-xs text-white font-medium">Video</span>
            </div>
          </>
        )}
      </div>

      {/* Card info */}
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2 mb-2 group-hover:text-violet-300 transition-colors">
          {video.title}
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
            <Calendar className="w-3 h-3" />
            <span>{formattedDate}</span>
          </div>

          <a
            href={video.video_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-gray-600 hover:text-violet-400 transition-colors"
            aria-label="Open video in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
