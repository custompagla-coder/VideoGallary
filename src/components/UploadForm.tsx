'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Upload, Film, Loader2, Tag, Plus, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { generateThumbnailAndDuration } from '@/utils/thumbnailGenerator';
import { supabase, Category } from '@/lib/supabase';

type UploadStep = 'idle' | 'generating' | 'uploading-video' | 'uploading-thumbnail' | 'saving' | 'done';

const stepLabels: Record<UploadStep, string> = {
  idle: 'Upload Video', generating: 'Generating Thumbnail...',
  'uploading-video': 'Uploading Video to Catbox...',
  'uploading-thumbnail': 'Uploading Thumbnail to Catbox...',
  saving: 'Saving to Database...', done: 'Upload Complete!',
};

const stepProgress: Record<UploadStep, number> = {
  idle: 0, generating: 25, 'uploading-video': 50,
  'uploading-thumbnail': 75, saving: 90, done: 100,
};

interface UploadFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Enforce a strict timeout on client-side Supabase promises to prevent silent hangs
function withTimeout<T>(promise: Promise<T> | any, ms: number, errorMsg: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMsg));
    }, ms);

    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export default function UploadForm({ onClose, onSuccess }: UploadFormProps) {
  const [title, setTitle] = useState('');
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [step, setStep] = useState<UploadStep>('idle');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLoading = step !== 'idle' && step !== 'done';

  useEffect(() => {
    console.log('[UploadForm] Fetching categories from Supabase...');
    supabase.from('categories').select('*').order('name').then(({ data, error }) => {
      if (error) {
        console.error('[UploadForm] Failed to fetch categories:', error);
      } else {
        console.log('[UploadForm] Successfully fetched categories:', data);
        setCategories(data || []);
      }
    });
  }, []);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const list: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.type.startsWith('video/')) {
        list.push(f);
      } else {
        toast.error(`"${f.name}" is not a valid video file and was skipped.`);
      }
    }
    if (list.length === 0) return;
    setVideoFiles(list);
    
    // Auto-populate title if single file
    if (list.length === 1) {
      const baseName = list[0].name.substring(0, list[0].name.lastIndexOf('.')) || list[0].name;
      setTitle(baseName);
    } else {
      setTitle(''); // Hides title input
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };

  async function uploadToCatbox(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed');
    return data.url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (videoFiles.length === 0) return toast.error('Please select at least one video file.');
    if (videoFiles.length === 1 && !title.trim()) return toast.error('Please enter a title.');
    
    try {
      for (let i = 0; i < videoFiles.length; i++) {
        const file = videoFiles[i];
        setCurrentFileIndex(i);
        setCurrentFileName(file.name);
        
        // Auto-generate title from filename if bulk uploading
        const videoTitle = videoFiles.length === 1 
          ? title.trim() 
          : (file.name.substring(0, file.name.lastIndexOf('.')) || file.name);

        setStep('generating');
        const { thumbnail, duration } = await generateThumbnailAndDuration(file);
        
        setStep('uploading-video');
        const videoUrl = await uploadToCatbox(file);
        
        setStep('uploading-thumbnail');
        const thumbnailUrl = await uploadToCatbox(thumbnail);

        // Save to Database
        setStep('saving');
        console.log(`[UploadForm] Saving video ${i + 1}/${videoFiles.length} details to server proxy...`, {
          title: videoTitle,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          tags,
          duration,
          category_id: categoryId || null,
        });

        const savePromise = fetch('/api/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: videoTitle,
            video_url: videoUrl,
            thumbnail_url: thumbnailUrl,
            tags,
            duration,
            category_id: categoryId || null,
          }),
        }).then(async (res) => {
          const resData = await res.json();
          if (!res.ok) throw new Error(resData.error || 'Server failed to save video');
          return resData;
        });

        // 20 seconds timeout to prevent hanging if there's a network block
        await withTimeout(
          savePromise,
          20000,
          'Database save timed out after 20 seconds. Please check your network connection.'
        );

        console.log('[UploadForm] Database insertion succeeded!');
      }
      
      setStep('done');
      toast.success(videoFiles.length === 1 ? 'Video uploaded successfully!' : 'All videos uploaded successfully!');
      onSuccess();
      setTimeout(onClose, 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
      setStep('idle');
    }
  }

  const getProgressLabel = () => {
    if (videoFiles.length > 1) {
      return `[Video ${currentFileIndex + 1}/${videoFiles.length}] ${stepLabels[step]}`;
    }
    return stepLabels[step];
  };

  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={!isLoading ? onClose : undefined} />
      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <Film className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Upload Video</h2>
          </div>
          {!isLoading && <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Title */}
          {videoFiles.length <= 1 ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Video Title *</label>
              <input id="video-title" type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Enter a descriptive title..." disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all disabled:opacity-50"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          ) : (
            <div className="rounded-xl px-4 py-3 bg-violet-600/10 border border-violet-600/20 text-xs text-violet-300">
              ℹ️ Titles for multiple files will automatically default to their file names (you can edit them later as an admin).
            </div>
          )}

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Category</label>
            <div className="relative">
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                disabled={isLoading}
                className="w-full appearance-none px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all disabled:opacity-50 pr-10"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: categoryId ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                <option value="">Select a category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              {selectedCategory && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none" style={{ background: selectedCategory.color }} />
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Tag className="w-3 h-3" /> Tags <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <div className="flex gap-2">
              <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="gaming, music..." disabled={isLoading}
                className="flex-1 px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
              <button type="button" onClick={addTag} disabled={!tagInput.trim() || isLoading}
                className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-violet-600/20 text-violet-300 border border-violet-600/30">
                    #{tag}
                    {!isLoading && <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="hover:text-white">×</button>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Drag & Drop zone */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Video Files *</label>
            <div
              onClick={() => !isLoading && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging ? 'border-violet-400 bg-violet-500/10 scale-[1.02]' :
                videoFiles.length > 0 ? 'border-violet-500/50 bg-violet-500/5' : 'border-white/10 hover:border-violet-500/30'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input ref={fileInputRef} type="file" accept="video/mp4,video/x-m4v,video/*" multiple onChange={handleFileChange} disabled={isLoading} className="sr-only" id="video-file-input" />
              {videoFiles.length > 0 ? (
                <div className="space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-xl bg-violet-600/20 flex items-center justify-center"><Film className="w-5 h-5 text-violet-400" /></div>
                  {videoFiles.length === 1 ? (
                    <>
                      <p className="text-sm font-medium text-violet-300 truncate max-w-xs mx-auto">{videoFiles[0].name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(videoFiles[0].size / (1024 * 1024)).toFixed(1)} MB · Click or drag to change</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-violet-300">{videoFiles.length} videos selected</p>
                      <div className="text-xs space-y-1 text-left max-h-24 overflow-y-auto px-2 py-1 rounded bg-black/20 max-w-xs mx-auto scrollbar-thin" style={{ color: 'var(--text-muted)' }}>
                        {videoFiles.map((file, idx) => (
                          <div key={idx} className="truncate">• {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)</div>
                        ))}
                      </div>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Click or drag to change files</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center" style={{ background: 'var(--bg-hover)' }}><Upload className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} /></div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}><span className="text-violet-400 font-medium">Click to select</span> or drag & drop</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>MP4 and other formats · Supports multiple files · Max 200 MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Progress */}
          {isLoading && (
            <div className="rounded-xl px-4 py-3 bg-violet-500/10 border border-violet-500/20">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
                <p className="text-sm text-violet-300 font-medium">{getProgressLabel()}</p>
              </div>
              <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                <div className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-500 rounded-full transition-all duration-500" style={{ width: `${stepProgress[step]}%` }} />
              </div>
            </div>
          )}

          <button
            type="submit" disabled={isLoading || videoFiles.length === 0 || (videoFiles.length === 1 && !title.trim())}
            className="w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/20"
          >
            {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />{getProgressLabel()}</> : <><Upload className="w-4 h-4" />{videoFiles.length > 1 ? `Upload ${videoFiles.length} Videos` : 'Upload Video'}</>}
          </button>
        </form>
      </div>
    </div>
  );
}
