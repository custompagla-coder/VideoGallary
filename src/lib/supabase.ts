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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// A recursive proxy that can swallow any chained method calls and eventually return standard Supabase-like shapes or promises.
const createDummyProxy = (path: string[] = []): any => {
  return new Proxy(() => {}, {
    get(_target, prop: string) {
      if (prop === 'then') {
        // When the proxy is awaited (Promise-like), resolve it to a mock response
        const isSelect = path.includes('select') || path.includes('from');
        const errorMsg = 'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel settings.';
        return (resolve: any) => resolve({
          data: isSelect ? [] : null,
          error: { message: errorMsg }
        });
      }
      if (prop === 'auth') {
        return {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signInWithPassword: () => Promise.reject(new Error('Supabase not configured')),
          signUp: () => Promise.reject(new Error('Supabase not configured')),
          signOut: () => Promise.resolve({ error: null }),
        };
      }
      return createDummyProxy([...path, prop]);
    },
    apply(_target, _thisArg, _argumentsList) {
      return createDummyProxy(path);
    }
  });
};

if (typeof window !== 'undefined') {
  console.log('[Supabase Client Init]', {
    hasUrl: !!url,
    hasKey: !!key,
    url: url ? `${url.substring(0, 15)}...` : undefined,
    isDummy: !(url && key)
  });
}

export const supabase = (url && key)
  ? createClient(url, key)
  : (createDummyProxy() as unknown as SupabaseClient);

