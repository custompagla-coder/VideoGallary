'use client';

import { useState, useEffect, useCallback } from 'react';
import { Send, MessageSquare, Loader2, CornerDownRight } from 'lucide-react';
import { Comment } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface CommentWithReplies extends Comment {
  parent_id?: string | null;
  replies?: CommentWithReplies[];
}

interface CommentsSectionProps {
  videoId: string;
}

const EMOJIS = ['👍', '❤️', '😂', '😮', '🔥'];
const SESSION_KEY = 'dwx-session-id';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = Math.random().toString(36).substring(2, 18);
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
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

const avatarColors = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
];
const getColor = (name: string) => avatarColors[name.charCodeAt(0) % avatarColors.length];

export default function CommentsSection({ videoId }: CommentsSectionProps) {
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [userReactions, setUserReactions] = useState<Record<string, Record<string, boolean>>>({});

  const fetchComments = useCallback(async () => {
    try {
      const sessionId = getSessionId();
      const res = await fetch(`/api/comments?video_id=${videoId}&session_id=${sessionId}`);
      if (!res.ok) throw new Error(`Comments fetch failed: ${res.status}`);
      const { comments: all, reactions: counts, userReactions: mine } = await res.json();

      const roots = (all || []).filter((c: any) => !c.parent_id);
      const repliesMap: Record<string, CommentWithReplies[]> = {};
      (all || []).filter((c: any) => c.parent_id).forEach((c: any) => {
        if (!repliesMap[c.parent_id!]) repliesMap[c.parent_id!] = [];
        repliesMap[c.parent_id!].push(c);
      });
      roots.forEach((r: any) => { r.replies = repliesMap[r.id] || []; });
      
      setComments(roots);
      setReactions(counts || {});
      setUserReactions(mine || {});
    } catch (err) {
      console.error('[CommentsSection Fetch] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  async function handleReact(commentId: string, emoji: string) {
    const sessionId = getSessionId();
    const isReacted = userReactions[commentId]?.[emoji];
    try {
      const res = await fetch('/api/comments/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment_id: commentId,
          emoji,
          session_id: sessionId,
          action: isReacted ? 'remove' : 'add',
        }),
      });

      if (!res.ok) throw new Error('Reaction failed');

      if (isReacted) {
        setReactions(prev => {
          const next = { ...prev, [commentId]: { ...(prev[commentId] || {}) } };
          next[commentId][emoji] = Math.max(0, (next[commentId][emoji] || 1) - 1);
          return next;
        });
        setUserReactions(prev => {
          const next = { ...prev, [commentId]: { ...(prev[commentId] || {}) } };
          delete next[commentId][emoji];
          return next;
        });
      } else {
        setReactions(prev => ({
          ...prev,
          [commentId]: { ...(prev[commentId] || {}), [emoji]: ((prev[commentId]?.[emoji]) || 0) + 1 },
        }));
        setUserReactions(prev => ({
          ...prev,
          [commentId]: { ...(prev[commentId] || {}), [emoji]: true },
        }));
      }
    } catch { /* reactions are optional, fail silently */ }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return toast.error('Please write a comment.');
    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: videoId,
          author_name: authorName.trim() || 'Anonymous',
          content: content.trim(),
          parent_id: null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to post comment');
      }

      setContent('');
      toast.success('Comment posted!');
      fetchComments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply(parentId: string, parentAuthor: string) {
    if (!replyContent.trim()) return toast.error('Please write a reply.');
    setSubmittingReply(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: videoId,
          author_name: authorName.trim() || 'Anonymous',
          content: replyContent.trim(),
          parent_id: parentId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to post reply');
      }

      setReplyContent('');
      setReplyingTo(null);
      toast.success('Reply posted!');
      fetchComments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post reply.');
    } finally {
      setSubmittingReply(false);
    }
  }

  function CommentCard({ comment, isReply = false }: { comment: CommentWithReplies; isReply?: boolean }) {
    const avatarSize = isReply ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-xs';
    return (
      <div className={`flex gap-3 ${isReply ? 'ml-8 mt-3' : ''}`}>
        {isReply && (
          <CornerDownRight className="w-3.5 h-3.5 mt-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
        )}
        <div className={`${avatarSize} rounded-full bg-gradient-to-br ${getColor(comment.author_name)} flex items-center justify-center shrink-0 text-white font-bold`}>
          {getInitials(comment.author_name)}
        </div>
        <div className="flex-1 min-w-0">
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

          {/* Emoji reactions */}
          <div className="flex flex-wrap items-center gap-1 mt-2">
            {EMOJIS.map(emoji => {
              const count = reactions[comment.id]?.[emoji] || 0;
              const reacted = userReactions[comment.id]?.[emoji];
              return (
                <button
                  key={emoji}
                  onClick={() => handleReact(comment.id, emoji)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all hover:scale-110 border ${
                    reacted
                      ? 'border-violet-500/50 bg-violet-600/20'
                      : 'border-transparent bg-white/5 hover:bg-white/10'
                  }`}
                  style={{ color: reacted ? '#a78bfa' : 'var(--text-muted)' }}
                  title={`React with ${emoji}`}
                >
                  {emoji}{count > 0 && <span className="font-semibold text-[10px]">{count}</span>}
                </button>
              );
            })}

            {/* Reply button (only on root comments) */}
            {!isReply && (
              <button
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="ml-1 text-xs transition-colors hover:text-violet-400 px-2 py-0.5 rounded-full hover:bg-white/5"
                style={{ color: 'var(--text-muted)' }}
              >
                {replyingTo === comment.id ? 'Cancel' : 'Reply'}
              </button>
            )}
          </div>

          {/* Reply input */}
          {replyingTo === comment.id && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder={`Reply to ${comment.author_name}...`}
                className="flex-1 px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                onKeyDown={e => { if (e.key === 'Enter') handleReply(comment.id, comment.author_name); }}
                autoFocus
              />
              <button
                onClick={() => handleReply(comment.id, comment.author_name)}
                disabled={submittingReply || !replyContent.trim()}
                className="px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {submittingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Nested replies */}
          {!isReply && comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3 border-l-2 pl-3" style={{ borderColor: 'var(--border-subtle)' }}>
              {comment.replies.map(reply => (
                <CommentCard key={reply.id} comment={reply} isReply />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const totalCount = comments.reduce((s, c) => s + 1 + (c.replies?.length || 0), 0);

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-5">
        <MessageSquare className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
        <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
          {totalCount} Comment{totalCount !== 1 ? 's' : ''}
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
                <div className="h-4 rounded w-3/4" style={{ background: 'var(--bg-card)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>
          No comments yet. Be the first!
        </p>
      ) : (
        <div className="space-y-6">
          {comments.map(comment => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  );
}
