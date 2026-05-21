'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Upload, Search, Tv2, Bell, Sun, Moon, LayoutGrid, LogOut, Shield, ChevronDown } from 'lucide-react';
import UploadForm from './UploadForm';
import AuthModal from './AuthModal';
import CategoryManager from './CategoryManager';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';

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
              Video<span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Vault</span>
            </span>
          </Link>

          {/* Search bar */}
          {onSearch && (
            <div className="flex-1 max-w-xl hidden sm:flex items-center">
              <div className="flex w-full">
                <input
                  type="text"
                  value={searchValue}
                  onChange={e => onSearch(e.target.value)}
                  placeholder="Search videos, tags..."
                  className="w-full px-4 py-2 text-sm rounded-l-full border focus:outline-none transition-colors"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                />
                <button className="px-5 py-2 rounded-r-full border border-l-0 transition-colors" style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">

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
                    {isAdmin && (
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
