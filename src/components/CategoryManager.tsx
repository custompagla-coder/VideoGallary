'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Pencil, Trash2, Check, Loader2, LayoutGrid } from 'lucide-react';
import { supabase, Category } from '@/lib/supabase';
import toast from 'react-hot-toast';

const PRESET_COLORS = [
  '#ec4899', '#dc2626', '#f59e0b', '#f97316',
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981',
  '#84cc16', '#6b7280',
];

interface CategoryManagerProps {
  onClose: () => void;
}

export default function CategoryManager({ onClose }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#8b5cf6');
  const [saving, setSaving] = useState(false);

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*').order('name');
    setCategories(data || []);
    setLoading(false);
  }

  useEffect(() => { fetchCategories(); }, []);

  async function handleAdd() {
    if (!newName.trim()) return toast.error('Enter a category name');
    setSaving(true);
    const slug = newName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { error } = await supabase.from('categories').insert({
      name: newName.trim(), slug, color: newColor,
    });
    if (error) toast.error(error.message);
    else { toast.success(`"${newName.trim()}" added!`); setNewName(''); fetchCategories(); }
    setSaving(false);
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('categories').update({
      name: editName.trim(), color: editColor,
    }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Category updated!'); setEditingId(null); fetchCategories(); }
    setSaving(false);
  }

  async function handleDelete(cat: Category) {
    // Check if any videos use this category
    const { count } = await supabase
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', cat.id);

    if (count && count > 0) {
      toast.error(`Cannot delete — ${count} video${count > 1 ? 's' : ''} use this category`);
      return;
    }
    const { error } = await supabase.from('categories').delete().eq('id', cat.id);
    if (error) toast.error(error.message);
    else { toast.success('Category deleted!'); fetchCategories(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '85vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Manage Categories</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Admin only</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No categories yet</p>
          ) : categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors" style={{ background: 'var(--bg-input)' }}>
              {editingId === cat.id ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={e => setEditColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 shrink-0 p-0.5"
                    style={{ background: 'var(--bg-hover)' }}
                  />
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(cat.id); if (e.key === 'Escape') setEditingId(null); }}
                    className="flex-1 px-2 py-1 rounded-lg text-sm border focus:outline-none focus:ring-1 focus:ring-violet-500/50"
                    style={{ background: 'var(--bg-hover)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    autoFocus
                  />
                  <button onClick={() => handleSaveEdit(cat.id)} disabled={saving} className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg transition-colors" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: cat.color }} />
                  <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{cat.name}</span>
                  <button
                    onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditColor(cat.color); }}
                    className="p-1.5 rounded-lg transition-colors hover:bg-violet-600/10"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="p-1.5 rounded-lg transition-colors text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new category */}
        <div className="p-5 shrink-0 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>ADD NEW CATEGORY</p>
          <div className="flex gap-2">
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5 shrink-0"
              style={{ background: 'var(--bg-hover)' }}
            />
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Thriller, Anime..."
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex-1 px-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
            <button
              onClick={handleAdd}
              disabled={saving || !newName.trim()}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* Color presets */}
          <div className="flex gap-2">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                title={c}
                className="w-5 h-5 rounded-full transition-transform hover:scale-125 shrink-0"
                style={{
                  background: c,
                  outline: newColor === c ? `2px solid ${c}` : 'none',
                  outlineOffset: '2px',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
