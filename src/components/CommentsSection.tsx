'use client';

import { useState, useEffect } from 'react';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import { supabase, Comment } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface CommentsSectionProps {
  videoId: string;
}

export default function CommentsSection({ videoId }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function fetchComments() {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });
    setComments(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchComments(); }, [videoId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return toast.error('Please write a comment.');
    setSubmitting(true);
    try {
      const { error } = await supabase.from('comments').insert({
        video_id: videoId,
        author_name: authorName.trim() || 'Anonymous',
        content: content.trim(),
      });
      if (error) throw new Error(error.message);
      setContent('');
      toast.success('Comment posted!');
      fetchComments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'just now';
  }

  function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'A';
  }

  const colors = ['from-violet-500 to-purple-600', 'from-blue-500 to-cyan-600', 'from-emerald-500 to-teal-600', 'from-orange-500 to-red-600', 'from-pink-500 to-rose-600'];
  const getColor = (name: string) => colors[name.charCodeAt(0) % colors.length];

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-5">
        <MessageSquare className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
        <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
          {comments.length} Comment{comments.length !== 1 ? 's' : ''}
        </h3>
      </div>

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="flex gap-3 mb-7">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shrink-0 text-white text-xs font-bold">
          {authorName ? getInitials(authorName) : 'Y'}
        </div>
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            placeholder="Your name (optional)"
            className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
            style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Post
            </button>
          </div>
        </div>
      </form>

      {/* Comments list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full shrink-0" style={{ background: 'var(--bg-card)' }} />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 rounded w-1/4" style={{ background: 'var(--bg-card)' }} />
                <div className="h-4 rounded w-full" style={{ background: 'var(--bg-card)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
          No comments yet. Be the first!
        </p>
      ) : (
        <div className="space-y-5">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getColor(comment.author_name)} flex items-center justify-center shrink-0 text-white text-xs font-bold`}>
                {getInitials(comment.author_name)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {comment.author_name}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {timeAgo(comment.created_at)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
