'use client';

import { useState, useRef } from 'react';
import { X, Upload, Film, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateThumbnail } from '@/utils/thumbnailGenerator';
import { supabase } from '@/lib/supabase';

type UploadStep =
  | 'idle'
  | 'generating'
  | 'uploading-video'
  | 'uploading-thumbnail'
  | 'saving'
  | 'done';

const stepLabels: Record<UploadStep, string> = {
  idle: 'Upload Video',
  generating: 'Generating Thumbnail...',
  'uploading-video': 'Uploading Video to Catbox...',
  'uploading-thumbnail': 'Uploading Thumbnail to Catbox...',
  saving: 'Saving to Database...',
  done: 'Upload Complete!',
};

interface UploadFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadForm({ onClose, onSuccess }: UploadFormProps) {
  const [title, setTitle] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [step, setStep] = useState<UploadStep>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = step !== 'idle' && step !== 'done';

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  async function uploadFileToCatbox(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.url) {
      throw new Error(data.error || 'Upload failed');
    }

    return data.url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!videoFile) {
      toast.error('Please select a video file.');
      return;
    }
    if (!title.trim()) {
      toast.error('Please enter a video title.');
      return;
    }

    try {
      // Step 1: Generate thumbnail
      setStep('generating');
      const thumbnail = await generateThumbnail(videoFile);

      // Step 2: Upload video
      setStep('uploading-video');
      const videoUrl = await uploadFileToCatbox(videoFile);

      // Step 3: Upload thumbnail
      setStep('uploading-thumbnail');
      const thumbnailUrl = await uploadFileToCatbox(thumbnail);

      // Step 4: Save to Supabase
      setStep('saving');
      const { error } = await supabase.from('videos').insert({
        title: title.trim(),
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
      });

      if (error) {
        throw new Error(error.message);
      }

      setStep('done');
      toast.success('Video uploaded successfully!');
      onSuccess();

      // Close after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setStep('idle');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={!isLoading ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#0f0f14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <Film className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Upload Video</h2>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title input */}
          <div className="space-y-2">
            <label htmlFor="video-title" className="text-sm font-medium text-gray-300">
              Video Title
            </label>
            <input
              id="video-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title..."
              disabled={isLoading}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all disabled:opacity-50"
            />
          </div>

          {/* File drop zone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Video File</label>
            <div
              onClick={() => !isLoading && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                videoFile
                  ? 'border-violet-500/50 bg-violet-500/5'
                  : 'border-white/10 hover:border-violet-500/30 hover:bg-white/5'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/x-m4v,video/*"
                onChange={handleFileChange}
                disabled={isLoading}
                className="sr-only"
                id="video-file-input"
              />

              {videoFile ? (
                <div className="space-y-1">
                  <div className="w-10 h-10 mx-auto rounded-xl bg-violet-600/20 flex items-center justify-center">
                    <Film className="w-5 h-5 text-violet-400" />
                  </div>
                  <p className="text-sm font-medium text-violet-300 truncate max-w-xs mx-auto">
                    {videoFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(videoFile.size / (1024 * 1024)).toFixed(1)} MB · Click to change
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-xl bg-white/5 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-400">
                    <span className="text-violet-400 font-medium">Click to select</span> a video file
                  </p>
                  <p className="text-xs text-gray-600">MP4 and other video formats supported</p>
                </div>
              )}
            </div>
          </div>

          {/* Progress indicator */}
          {isLoading && (
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
                <p className="text-sm text-violet-300 font-medium">{stepLabels[step]}</p>
              </div>
              <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-full transition-all duration-500"
                  style={{
                    width:
                      step === 'generating'
                        ? '25%'
                        : step === 'uploading-video'
                        ? '50%'
                        : step === 'uploading-thumbnail'
                        ? '75%'
                        : step === 'saving'
                        ? '90%'
                        : '100%',
                  }}
                />
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading || !videoFile || !title.trim()}
            className="w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
              bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {stepLabels[step]}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload Video
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
