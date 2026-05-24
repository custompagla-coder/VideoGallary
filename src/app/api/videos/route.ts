import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, video_url, thumbnail_url, tags, duration, category_id } = body;

    if (!title || !video_url || !thumbnail_url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('videos')
      .insert({
        title,
        video_url,
        thumbnail_url,
        tags: tags || [],
        duration: duration || 0,
        views: 0,
        likes: 0,
        category_id: category_id || null,
        is_pinned: false,
        status: 'published',
        scheduled_at: null,
      })
      .select()
      .single();

    if (error) {
      console.error('[API Videos] Server-side insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[API Videos] Server-side proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error during video saving' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');

    if (id) {
      // Fetch a single video
      const { data, error } = await supabase
        .from('videos')
        .select('*, category:categories(id,name,slug,color)')
        .eq('id', id)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data });
    } else {
      // Fetch all videos with optional search and limit filters
      let query = supabase
        .from('videos')
        .select('*, category:categories(id,name,slug,color)')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.ilike('title', `%${search}%`);
      }

      if (limit) {
        const limitVal = parseInt(limit, 10);
        if (!isNaN(limitVal)) {
          query = query.limit(limitVal);
        }
      }

      const { data, error } = await query;

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data: data || [] });
    }
  } catch (error) {
    console.error('[API Videos GET] Server-side error:', error);
    return NextResponse.json(
      { error: 'Internal server error during video fetch' },
      { status: 500 }
    );
  }
}

