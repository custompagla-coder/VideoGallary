'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Upload, Search, Tv2, Bell, Sun, Moon, LayoutGrid, LogOut, Shield, ChevronDown, Flame, Clock, LayoutDashboard } from 'lucide-react';
import UploadForm from './UploadForm';
import AuthModal from './AuthModal';
import CategoryManager from './CategoryManager';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { supabase, Video } from '@/lib/supabase';
import { formatDuration } from '@/utils/thumbnailGenerator';

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-violet-500/30 text-violet-300 rounded px-0.5 font-bold" style={{ textShadow: '0 0 8px rgba(139,92,246,0.3)' }}>{part}</mark>
        ) : part
      )}
    </>
  );
}

interface NavbarProps {
  onRefresh: () => void;
  onSearch?: (q: string) => void;
  searchValue?: string;
}

function getInitials(email: string) {
  return email.split('@')[0].slice(0, 2).toUpperCase();
}

export default function Navbar({ onRefresh, onSearch, searchValue = '' }: NavbarProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, profile, isAdmin, signOut } = useAuth();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [activeUsers, setActiveUsers] = useState(1);

  // Base virtual online count starting at 1207
  const displayedOnline = 1207 + (activeUsers > 1 ? activeUsers - 1 : 0);

  const router = useRouter();

  // Autocomplete Search Suggestions states
  const [inputVal, setInputVal] = useState(searchValue || '');
  const [suggestions, setSuggestions] = useState<Video[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sync with homepage changes
  useEffect(() => {
    setInputVal(searchValue || '');
  }, [searchValue]);

  // Debounced Supabase Autocomplete Search
  useEffect(() => {
    if (!inputVal.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*, category:categories(id, name, slug, color)')
          .ilike('title', `%${inputVal}%`)
          .limit(5);

        if (!error && data) {
          setSuggestions(data);
        }
      } catch (err) {
        console.error('[Navbar Search] Suggestions error:', err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [inputVal]);

  const handleSearchSubmit = useCallback((queryStr = inputVal) => {
    const q = queryStr.trim();
    setIsFocused(false);
    
    if (onSearch) {
      onSearch(q);
    } else {
      router.push(`/?search=${encodeURIComponent(q)}`);
    }
  }, [inputVal, onSearch, router]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIdx(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIdx(prev => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIdx > -1 && suggestions[activeSuggestionIdx]) {
        const selected = suggestions[activeSuggestionIdx];
        setIsFocused(false);
        router.push(`/watch/${selected.id}`);
      } else {
        handleSearchSubmit();
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  // Realtime Presence Visitor Tracking (works for both logged in and logged out users)
  useEffect(() => {
    let channel: any;
    try {
      const sessionId = Math.random().toString(36).substring(2, 10);
      channel = supabase.channel('global-presence', {
        config: {
          presence: {
            key: sessionId,
          },
        },
      });

      channel
        .on('presence', { event: 'sync' }, () => {
          try {
            const state = channel.presenceState();
            const totalCount = Object.keys(state).length;
            setActiveUsers(totalCount > 0 ? totalCount : 1);
          } catch (e) {
            console.error('[Navbar] Presence sync state error:', e);
          }
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            try {
              await channel.track({
                online_at: new Date().toISOString(),
              });
            } catch (e) {
              console.error('[Navbar] Track presence error:', e);
            }
          }
        });
    } catch (err) {
      console.error('[Navbar] Realtime presence setup failed:', err);
    }

    return () => {
      if (channel && typeof channel.unsubscribe === 'function') {
        try {
          channel.unsubscribe();
        } catch (e) {
          console.error('[Navbar] Unsubscribe error:', e);
        }
      }
    };
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleSignOut() {
    setShowUserMenu(false);
    await signOut();
  }

  return (
    <>
      <nav className="sticky top-0 z-40 w-full h-16 flex items-center" style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="w-full px-4 sm:px-6 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
              <Tv2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:block" style={{ color: 'var(--text-primary)' }}>
              DarkWeb<span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">XYoruWeb</span>
            </span>
          </Link>

          {/* Trending Nav Link */}
          <Link
            href="/trending"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105 border"
            style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>Trending</span>
          </Link>

          {/* Search bar (Visible on all routes, supports autocomplete dropdown) */}
          <div className="flex-1 max-w-xl hidden sm:flex items-center relative" ref={searchContainerRef}>
            <div className="flex w-full">
              <input
                type="text"
                value={inputVal}
                onChange={e => {
                  setInputVal(e.target.value);
                  setIsFocused(true);
                  setActiveSuggestionIdx(-1);
                  if (onSearch) onSearch(e.target.value);
                }}
                onFocus={() => setIsFocused(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search videos, tags..."
                className="w-full px-4 py-2 text-sm rounded-l-full border focus:outline-none transition-colors"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
              <button 
                onClick={() => handleSearchSubmit()}
                className="px-5 py-2 rounded-r-full border border-l-0 transition-colors" 
                style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Glassmorphic Autocomplete Suggestions Dropdown */}
            {isFocused && suggestions.length > 0 && (
              <div 
                className="absolute left-0 right-0 top-full mt-2 rounded-2xl shadow-2xl overflow-hidden z-50 border border-white/10"
                style={{ background: 'rgba(15, 15, 15, 0.95)', backdropFilter: 'blur(16px)' }}
              >
                <div className="py-2">
                  {suggestions.map((video, idx) => (
                    <Link
                      key={video.id}
                      href={`/watch/${video.id}`}
                      onClick={() => setIsFocused(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 transition-colors cursor-pointer text-left ${
                        activeSuggestionIdx === idx ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                    >
                      {/* Mini Thumbnail */}
                      <div className="relative w-16 aspect-video rounded-lg overflow-hidden bg-black/40 shrink-0 border border-white/5">
                        <Image src={video.thumbnail_url} alt={video.title} fill className="object-cover" sizes="64px" />
                        {video.duration > 0 && (
                          <div className="absolute bottom-0.5 right-0.5 px-1 bg-black/80 rounded text-[8px] font-bold text-white">
                            {formatDuration(video.duration)}
                          </div>
                        )}
                      </div>

                      {/* Info & Highlighted Term */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {highlightText(video.title, inputVal)}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          DarkWebXYoruWeb
                        </p>
                      </div>

                      {/* Category Pill */}
                      {video.category && (
                        <span 
                          className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white shrink-0"
                          style={{ background: video.category.color }}
                        >
                          {video.category.name}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">

            {/* Live Visitors Count */}
            <div 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border select-none transition-all hover:scale-105"
              style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              title={`${activeUsers} active visitor${activeUsers !== 1 ? 's' : ''} on the website (Base: 1207)`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-bold">
                {displayedOnline}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>online</span>
            </div>

            {/* Theme toggle */}
            <button onClick={toggleTheme} className="w-9 h-9 flex items-center justify-center rounded-full transition-colors" style={{ color: 'var(--text-secondary)' }} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Admin: Manage Categories */}
            {isAdmin && (
              <button
                onClick={() => setShowCategories(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border"
                style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                title="Manage Categories"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Categories
              </button>
            )}

            <button className="w-9 h-9 hidden sm:flex items-center justify-center rounded-full" style={{ color: 'var(--text-secondary)' }}>
              <Bell className="w-5 h-5" />
            </button>

            {/* Upload */}
            {user && (
              <button
                id="open-upload-modal"
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-semibold transition-colors border"
                style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            )}

            {/* User avatar / Auth */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  className="flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 transition-colors"
                  style={{ background: showUserMenu ? 'var(--bg-hover)' : 'transparent' }}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold">
                    {getInitials(user.email || 'U')}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 hidden sm:block" style={{ color: 'var(--text-muted)' }} />
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-xl overflow-hidden z-50" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user.email}</p>
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-600/20 text-violet-400 border border-violet-600/30">
                          <Shield className="w-2.5 h-2.5" /> ADMIN
                        </span>
                      )}
                    </div>
                    {/* History link - all users */}
                    <Link
                      href="/history"
                      onClick={() => setShowUserMenu(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left"
                      style={{ color: 'var(--text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Clock className="w-4 h-4" />
                      Watch History
                    </Link>
                    {isAdmin && (
                      <>
                        <Link
                          href="/admin"
                          onClick={() => setShowUserMenu(false)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Admin Dashboard
                        </Link>
                        <button
                          onClick={() => { setShowUserMenu(false); setShowCategories(true); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left"
                          style={{ color: 'var(--text-secondary)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <LayoutGrid className="w-4 h-4" />
                          Manage Categories
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left text-red-400"
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {showUpload && <UploadForm onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); onRefresh(); }} />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showCategories && <CategoryManager onClose={() => setShowCategories(false)} />}
    </>
  );
}
