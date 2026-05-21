import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type Video = {
  id: string;
  created_at: string;
  title: string;
  video_url: string;
  thumbnail_url: string;
  views: number;
  likes: number;
  tags: string[];
  duration: number;
  category_id?: string;
  category?: Category;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  color: string;
  created_at?: string;
};

export type Profile = {
  id: string;
  email: string;
  is_admin: boolean;
  created_at?: string;
};

export type Comment = {
  id: string;
  created_at: string;
  video_id: string;
  author_name: string;
  content: string;
};

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    if (!url || !key) throw new Error('Missing Supabase environment variables.');
    _client = createClient(url, key);
  }
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string) {
    return (getClient() as unknown as Record<string, unknown>)[prop];
  },
});
